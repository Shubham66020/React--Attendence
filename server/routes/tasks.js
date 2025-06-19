import express from 'express';
import { body, validationResult } from 'express-validator';
import Task from '../models/Task.js';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/tasks
// @desc    Get tasks (all for admin/hr, own for employees)
// @access  Private
router.get('/', authenticate, async (req, res) => {
    try {
        const {
            assignedTo,
            status,
            priority,
            category,
            search,
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = -1
        } = req.query;

        let query = {};

        // If not admin/hr, only show user's own tasks
        if (!['admin', 'hr'].includes(req.user.role)) {
            query.assignedTo = req.user.id;
        } else if (assignedTo) {
            query.assignedTo = assignedTo;
        }        // Add filters
        if (status && status !== 'all') {
            // Handle multiple statuses separated by comma
            if (status.includes(',')) {
                query.status = { $in: status.split(',').map(s => s.trim()) };
            } else {
                query.status = status;
            }
        }
        if (priority && priority !== 'all') {
            query.priority = priority;
        }
        if (category && category !== 'all') {
            query.category = category;
        }
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        const skip = (page - 1) * limit;
        const sort = { [sortBy]: parseInt(sortOrder) };

        const tasks = await Task.find(query)
            .populate('assignedTo', 'name email role')
            .populate('assignedBy', 'name email')
            .populate('dependencies', 'title status')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Task.countDocuments(query);

        res.json({
            success: true,
            tasks,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalTasks: total,
                hasNext: page * limit < total,
                hasPrev: page > 1
            }
        });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   GET /api/tasks/:id
// @desc    Get single task
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('assignedTo', 'name email role department')
            .populate('assignedBy', 'name email')
            .populate('dependencies', 'title status priority')
            .populate('comments.user', 'name email');

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Check if user has permission to view this task
        if (!['admin', 'hr'].includes(req.user.role) &&
            task.assignedTo._id.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            task
        });
    } catch (error) {
        console.error('Get task error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   POST /api/tasks
// @desc    Create new task
// @access  Private (Admin, HR)
router.post('/', [
    authenticate,
    authorize('admin', 'hr'),
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('assignedTo').isMongoId().withMessage('Valid assignedTo ID is required'),
    body('dueDate').isISO8601().withMessage('Valid due date is required'),
    body('priority').isIn(['low', 'medium', 'high', 'urgent']).withMessage('Valid priority is required'),
    body('category').isIn(['development', 'design', 'testing', 'documentation', 'meeting', 'research', 'other']).withMessage('Valid category is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const {
            title,
            description,
            priority,
            assignedTo,
            dueDate,
            estimatedHours,
            category,
            tags,
            dependencies,
            isRecurring,
            recurringPattern
        } = req.body;

        // Verify assigned user exists
        const assignedUser = await User.findById(assignedTo);
        if (!assignedUser) {
            return res.status(404).json({
                success: false,
                message: 'Assigned user not found'
            });
        }

        const task = new Task({
            title,
            description,
            priority,
            assignedTo,
            assignedBy: req.user.id,
            dueDate,
            estimatedHours,
            category,
            tags,
            dependencies,
            isRecurring,
            recurringPattern
        });

        await task.save();

        // Update user's assigned tasks
        await User.findByIdAndUpdate(assignedTo, {
            $push: { assignedTasks: task._id }
        });

        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo', 'name email role')
            .populate('assignedBy', 'name email');

        res.status(201).json({
            success: true,
            message: 'Task created successfully',
            task: populatedTask
        });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   PUT /api/tasks/:id
// @desc    Update task
// @access  Private (Admin, HR, or assigned user for certain fields)
router.put('/:id', authenticate, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        const isAdminOrHR = ['admin', 'hr'].includes(req.user.role);
        const isAssignedUser = task.assignedTo.toString() === req.user.id;

        if (!isAdminOrHR && !isAssignedUser) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const updates = {}; const allowedUpdates = isAdminOrHR
            ? ['title', 'description', 'priority', 'assignedTo', 'dueDate', 'estimatedHours', 'category', 'tags', 'status', 'progress', 'dependencies', 'completionReason']
            : ['status', 'progress', 'actualHours', 'completionReason'];

        // Only allow certain updates based on user role
        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = req.body[key];
            }
        });

        // Special handling for status updates
        if (updates.status === 'completed') {
            updates.completedAt = new Date();
            updates.progress = 100;
        }

        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).populate('assignedTo', 'name email role')
            .populate('assignedBy', 'name email');

        res.json({
            success: true,
            message: 'Task updated successfully',
            task: updatedTask
        });
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   POST /api/tasks/:id/comments
// @desc    Add comment to task
// @access  Private (Admin, HR, or assigned user)
router.post('/:id/comments', [
    authenticate,
    body('comment').notEmpty().withMessage('Comment is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        const isAdminOrHR = ['admin', 'hr'].includes(req.user.role);
        const isAssignedUser = task.assignedTo.toString() === req.user.id;
        const isTaskCreator = task.assignedBy.toString() === req.user.id;

        if (!isAdminOrHR && !isAssignedUser && !isTaskCreator) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        task.comments.push({
            user: req.user.id,
            comment: req.body.comment
        });

        await task.save();

        const updatedTask = await Task.findById(req.params.id)
            .populate('comments.user', 'name email');

        res.json({
            success: true,
            message: 'Comment added successfully',
            comments: updatedTask.comments
        });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   POST /api/tasks/:id/time-tracking
// @desc    Add time tracking entry
// @access  Private (assigned user)
router.post('/:id/time-tracking', [
    authenticate,
    body('startTime').isISO8601().withMessage('Valid start time is required'),
    body('endTime').isISO8601().withMessage('Valid end time is required'),
    body('description').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        if (task.assignedTo.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You can only track time for your own tasks'
            });
        }

        const { startTime, endTime, description } = req.body;
        const start = new Date(startTime);
        const end = new Date(endTime);
        const duration = Math.round((end - start) / (1000 * 60)); // duration in minutes
        const date = start.toISOString().split('T')[0]; // YYYY-MM-DD format

        if (duration <= 0) {
            return res.status(400).json({
                success: false,
                message: 'End time must be after start time'
            });
        }

        task.timeTracking.push({
            startTime: start,
            endTime: end,
            duration,
            description,
            date
        });

        await task.save();

        res.json({
            success: true,
            message: 'Time tracking entry added successfully',
            timeTracking: task.timeTracking
        });
    } catch (error) {
        console.error('Add time tracking error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete task
// @access  Private (Admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Remove task from user's assigned tasks
        await User.findByIdAndUpdate(task.assignedTo, {
            $pull: { assignedTasks: task._id }
        });

        await Task.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Task deleted successfully'
        });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   GET /api/tasks/stats/overview
// @desc    Get task statistics overview
// @access  Private (Admin, HR)
router.get('/stats/overview', authenticate, authorize('admin', 'hr'), async (req, res) => {
    try {
        const { userId, startDate, endDate } = req.query;

        let matchQuery = {};
        if (userId) {
            matchQuery.assignedTo = mongoose.Types.ObjectId(userId);
        }
        if (startDate && endDate) {
            matchQuery.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const stats = await Task.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    totalTasks: { $sum: 1 },
                    completedTasks: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    inProgressTasks: {
                        $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] }
                    },
                    overdueTasks: {
                        $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] }
                    },
                    avgEstimatedHours: { $avg: '$estimatedHours' },
                    avgActualHours: { $avg: '$actualHours' },
                    totalActualHours: { $sum: '$actualHours' }
                }
            }
        ]);

        const priorityStats = await Task.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$priority',
                    count: { $sum: 1 }
                }
            }
        ]);

        const categoryStats = await Task.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    avgHours: { $avg: '$actualHours' }
                }
            }
        ]);

        res.json({
            success: true,
            stats: stats[0] || {
                totalTasks: 0,
                completedTasks: 0,
                inProgressTasks: 0,
                overdueTasks: 0,
                avgEstimatedHours: 0,
                avgActualHours: 0,
                totalActualHours: 0
            },
            priorityStats,
            categoryStats
        });
    } catch (error) {
        console.error('Get task stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

export default router;
