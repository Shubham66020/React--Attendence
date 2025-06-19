import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/employees
// @desc    Get all employees
// @access  Private (Admin, HR)
router.get('/', authenticate, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 10 } = req.query;

    let query = {};

    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Add role filter
    if (role && role !== 'all') {
      query.role = role;
    }

    // Add status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const employees = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      employees,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRecords: total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
});

// @route   GET /api/employees/:id
// @desc    Get employee by ID
// @access  Private (Admin, HR)
router.get('/:id', authenticate, authorize('admin', 'hr'), async (req, res) => {
  try {
    const employee = await User.findById(req.params.id)
      .select('-password')
      .populate('manager', 'name email')
      .populate('subordinates', 'name email');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Get recent attendance
    const recentAttendance = await Attendance.find({ userId: req.params.id })
      .sort({ date: -1 })
      .limit(5)
      .select('date checkIn checkOut status productivity totalHours');

    // Get basic stats count (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const totalAttendanceDays = await Attendance.countDocuments({
      userId: req.params.id,
      date: { $gte: thirtyDaysAgo.toISOString().split('T')[0] }
    });

    res.json({
      success: true,
      employee: {
        ...employee.toJSON(),
        totalAttendanceDays,
        lastSeen: employee.lastSeen || employee.lastLogin
      },
      recentAttendance
    });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
});

// @route   POST /api/employees
// @desc    Create new employee
// @access  Private (Admin, HR)
router.post('/', [
  authenticate,
  authorize('admin', 'hr'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'hr', 'employee']).withMessage('Invalid role'),
  body('department').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { name, email, password, role, department } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create new employee
    const employee = new User({
      name,
      email,
      password,
      role,
      department: department || 'General'
    });
    await employee.save();

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      employee
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
});

// @route   PUT /api/employees/:id
// @desc    Update employee
// @access  Private (Admin, HR)
router.put('/:id', [
  authenticate,
  authorize('admin', 'hr'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('role').optional().isIn(['admin', 'hr', 'employee']).withMessage('Invalid role'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
  body('department').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { name, email, role, status, department } = req.body;

    // Check if employee exists
    const employee = await User.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if email is already taken by another user
    if (email && email !== employee.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Update fields
    if (name) employee.name = name;
    if (email) employee.email = email;
    if (role) employee.role = role;
    if (status) employee.status = status;
    if (department) employee.department = department;

    await employee.save();

    res.json({
      success: true,
      message: 'Employee updated successfully',
      employee
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
});

// @route   DELETE /api/employees/:id
// @desc    Delete employee
// @access  Private (Admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Don't allow deleting the last admin
    if (employee.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the last admin user'
        });
      }
    }

    await User.findByIdAndDelete(req.params.id);

    // Optionally delete associated attendance records
    await Attendance.deleteMany({ userId: req.params.id });

    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
});

export default router;