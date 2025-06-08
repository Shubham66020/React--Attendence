import express from 'express';
import { body, validationResult } from 'express-validator';
import Attendance from '../models/Attendance.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/attendance/mark
// @desc    Mark attendance
// @access  Private
router.post('/mark', [
  authenticate,
  body('type').isIn(['checkin', 'checkout']).withMessage('Invalid attendance type'),
  body('location.latitude').optional().isNumeric().withMessage('Invalid latitude'),
  body('location.longitude').optional().isNumeric().withMessage('Invalid longitude')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { type, location, notes } = req.body;
    const userId = req.user._id;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const now = new Date();

    // Find or create today's attendance record
    let attendance = await Attendance.findOne({ userId, date: today });

    if (type === 'checkin') {
      if (attendance && attendance.checkIn) {
        return res.status(400).json({
          success: false,
          message: 'You have already checked in today'
        });
      }

      // Determine status based on time (assuming 9 AM is on time)
      const checkInTime = now.getHours();
      const status = checkInTime >= 9 ? 'late' : 'present';

      if (!attendance) {
        attendance = new Attendance({
          userId,
          date: today,
          checkIn: now,
          status,
          location,
          notes
        });
      } else {
        attendance.checkIn = now;
        attendance.status = status;
        if (location) attendance.location = location;
        if (notes) attendance.notes = notes;
      }
    } else { // checkout
      if (!attendance || !attendance.checkIn) {
        return res.status(400).json({
          success: false,
          message: 'You must check in first'
        });
      }

      if (attendance.checkOut) {
        return res.status(400).json({
          success: false,
          message: 'You have already checked out today'
        });
      }

      attendance.checkOut = now;
      if (notes) attendance.notes = notes;
    }

    await attendance.save();

    res.json({
      success: true,
      message: `${type === 'checkin' ? 'Check-in' : 'Check-out'} successful`,
      attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
});

// @route   GET /api/attendance/today
// @desc    Get today's attendance
// @access  Private
router.get('/today', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date().toISOString().split('T')[0];

    const attendance = await Attendance.findOne({ userId, date: today });

    res.json({
      success: true,
      attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
});

// @route   GET /api/attendance/history
// @desc    Get attendance history
// @access  Private
router.get('/history', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate, page = 1, limit = 10 } = req.query;

    let query = { userId };

    // Add date range filter if provided
    if (startDate && endDate) {
      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const skip = (page - 1) * limit;
    
    const attendance = await Attendance.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email');

    const total = await Attendance.countDocuments(query);

    res.json({
      success: true,
      attendance,
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

// @route   GET /api/attendance/stats
// @desc    Get attendance statistics
// @access  Private
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const { month, year } = req.query;
    
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();

    // Create date range for the month
    const startDate = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-01`;
    const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];

    const attendance = await Attendance.find({
      userId,
      date: { $gte: startDate, $lte: endDate }
    });

    const stats = {
      totalDays: attendance.length,
      presentDays: attendance.filter(a => a.status === 'present').length,
      lateDays: attendance.filter(a => a.status === 'late').length,
      totalWorkingHours: attendance.reduce((sum, a) => sum + (a.workingHours || 0), 0),
      averageWorkingHours: 0
    };

    if (stats.totalDays > 0) {
      stats.averageWorkingHours = Math.round(stats.totalWorkingHours / stats.totalDays);
    }

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
});

export default router;