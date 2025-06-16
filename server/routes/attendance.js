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
  body('location.longitude').optional().isNumeric().withMessage('Invalid longitude'),
  body('temperature').optional().isNumeric().withMessage('Invalid temperature'),
  body('symptoms').optional().isArray().withMessage('Symptoms must be an array'),
  body('mood').optional().isIn(['excellent', 'good', 'neutral', 'tired', 'stressed']).withMessage('Invalid mood'),
  body('productivity.score').optional().isNumeric().withMessage('Invalid productivity score'),
  body('productivity.tasksCompleted').optional().isNumeric().withMessage('Invalid tasks completed'),
  body('batteryLevel').optional().isNumeric().withMessage('Invalid battery level'),
  body('gpsAccuracy').optional().isNumeric().withMessage('Invalid GPS accuracy'),
  body('rfidCardId').optional().isString().withMessage('Invalid RFID card ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const {
      type,
      location,
      notes,
      temperature,
      symptoms,
      isRemote,
      mood,
      productivity,
      batteryLevel,
      gpsAccuracy,
      rfidCardId,
      networkInfo,
      weather
    } = req.body;
    const userId = req.user._id;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();    // Get device information with enhanced details
    const device = {
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      platform: req.headers['sec-ch-ua-platform'] || 'Unknown'
    };

    // Enhanced location data with GPS accuracy
    const locationData = location ? {
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address,
      accuracy: location.accuracy || gpsAccuracy
    } : undefined;

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
      let status = 'present';
      if (checkInTime >= 9 && checkInTime < 12) {
        status = 'late';
      } else if (checkInTime >= 14) {
        status = 'half-day';
      } const locationData = location ? {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        accuracy: location.accuracy || gpsAccuracy
      } : undefined;

      if (!attendance) {
        attendance = new Attendance({
          userId,
          date: today,
          checkIn: now,
          status,
          checkInLocation: locationData,
          notes,
          device,
          isRemote: isRemote || false,
          temperature,
          symptoms: symptoms || [],
          mood: mood || 'neutral',
          productivity: productivity || { score: 5, tasksCompleted: 0 },
          batteryLevel,
          gpsAccuracy,
          rfidCardId,
          networkInfo,
          weather
        });
      } else {
        attendance.checkIn = now;
        attendance.status = status;
        attendance.checkInLocation = locationData;
        attendance.device = device;
        attendance.isRemote = isRemote || false;
        if (temperature) attendance.temperature = temperature;
        if (symptoms) attendance.symptoms = symptoms;
        if (notes) attendance.notes = notes;
        if (mood) attendance.mood = mood;
        if (productivity) attendance.productivity = productivity;
        if (batteryLevel !== undefined) attendance.batteryLevel = batteryLevel;
        if (gpsAccuracy !== undefined) attendance.gpsAccuracy = gpsAccuracy;
        if (rfidCardId) attendance.rfidCardId = rfidCardId;
        if (networkInfo) attendance.networkInfo = networkInfo;
        if (weather) attendance.weather = weather;
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
      } const locationData = location ? {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        accuracy: location.accuracy || gpsAccuracy
      } : undefined;

      attendance.checkOut = now;
      attendance.checkOutLocation = locationData;
      if (notes) attendance.notes = notes;
      if (productivity) {
        attendance.productivity = {
          ...attendance.productivity,
          ...productivity
        };
      }
    }

    await attendance.save();

    // Populate user info for response
    await attendance.populate('userId', 'name email department');

    res.json({
      success: true,
      message: `${type === 'checkin' ? 'Check-in' : 'Check-out'} successful`,
      attendance
    });
  } catch (error) {
    console.error('Attendance marking error:', error);
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
    const { startDate, endDate, page = 1, limit = 10, status, includeBreaks = false } = req.query;

    let query = { userId };

    // Add date range filter if provided
    if (startDate && endDate) {
      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    // Add status filter if provided
    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    let attendanceQuery = Attendance.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email department');

    // Include additional fields if needed
    if (includeBreaks === 'true') {
      attendanceQuery = attendanceQuery.select('+breaks +device +checkInLocation +checkOutLocation');
    }

    const attendance = await attendanceQuery;
    const total = await Attendance.countDocuments(query);

    // Calculate additional statistics
    const totalWorkingHours = attendance.reduce((sum, a) => sum + (a.workingHours || 0), 0);
    const totalBreakHours = attendance.reduce((sum, a) => sum + (a.breakHours || 0), 0);
    const totalOvertimeHours = attendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);

    res.json({
      success: true,
      attendance,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRecords: total
      },
      summary: {
        totalWorkingHours,
        totalBreakHours,
        totalOvertimeHours,
        averageWorkingHours: attendance.length > 0 ? Math.round(totalWorkingHours / attendance.length) : 0
      }
    });
  } catch (error) {
    console.error('History fetch error:', error);
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
      halfDays: attendance.filter(a => a.status === 'half-day').length,
      absentDays: attendance.filter(a => a.status === 'absent').length,
      totalWorkingHours: attendance.reduce((sum, a) => sum + (a.workingHours || 0), 0),
      totalBreakHours: attendance.reduce((sum, a) => sum + (a.breakHours || 0), 0),
      totalOvertimeHours: attendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0),
      averageWorkingHours: 0,
      averageBreakHours: 0,
      remoteDays: attendance.filter(a => a.isRemote).length,
      onTimeDays: attendance.filter(a => a.status === 'present').length,
      punctualityRate: 0,
      mostCommonBreakType: 'other',
      totalBreaks: 0
    };

    if (stats.totalDays > 0) {
      stats.averageWorkingHours = Math.round(stats.totalWorkingHours / stats.totalDays);
      stats.averageBreakHours = Math.round(stats.totalBreakHours / stats.totalDays);
      stats.punctualityRate = Math.round((stats.onTimeDays / stats.totalDays) * 100);
    }

    // Calculate break statistics
    const allBreaks = attendance.reduce((breaks, a) => {
      if (a.breaks && a.breaks.length > 0) {
        return breaks.concat(a.breaks);
      }
      return breaks;
    }, []);

    stats.totalBreaks = allBreaks.length;

    // Find most common break type
    if (allBreaks.length > 0) {
      const breakTypes = allBreaks.reduce((acc, b) => {
        acc[b.type] = (acc[b.type] || 0) + 1;
        return acc;
      }, {});
      stats.mostCommonBreakType = Object.keys(breakTypes).reduce((a, b) =>
        breakTypes[a] > breakTypes[b] ? a : b
      );
    }

    // Calculate weekly patterns
    const weeklyStats = attendance.reduce((acc, a) => {
      const dayOfWeek = new Date(a.date).getDay();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[dayOfWeek];

      if (!acc[dayName]) {
        acc[dayName] = { count: 0, totalHours: 0, lateCount: 0 };
      }

      acc[dayName].count++;
      acc[dayName].totalHours += a.workingHours || 0;
      if (a.status === 'late') acc[dayName].lateCount++;

      return acc;
    }, {});

    stats.weeklyPattern = weeklyStats;

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
});

// @route   POST /api/attendance/break
// @desc    Mark break start/end with enhanced features
// @access  Private
router.post('/break', [
  authenticate,
  body('type').isIn(['start', 'end']).withMessage('Invalid break type'),
  body('breakType').optional().isIn(['lunch', 'tea', 'personal', 'meeting', 'other']).withMessage('Invalid break category'),
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

    const { type, breakType = 'other', notes, location } = req.body;
    const userId = req.user._id;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    const attendance = await Attendance.findOne({ userId, date: today });

    if (!attendance || !attendance.checkIn) {
      return res.status(400).json({
        success: false,
        message: 'You must check in first before taking a break'
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Cannot take breaks after checkout'
      });
    }

    if (!attendance.breaks) {
      attendance.breaks = [];
    }

    if (type === 'start') {
      // Check if there's an ongoing break
      const ongoingBreak = attendance.breaks.find(b => b.breakStart && !b.breakEnd);
      if (ongoingBreak) {
        return res.status(400).json({
          success: false,
          message: 'You already have an ongoing break'
        });
      } attendance.breaks.push({
        breakStart: now,
        type: breakType,
        notes,
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address
        } : undefined
      });
    } else { // end
      const ongoingBreak = attendance.breaks.find(b => b.breakStart && !b.breakEnd);
      if (!ongoingBreak) {
        return res.status(400).json({
          success: false,
          message: 'No ongoing break found'
        });
      }

      ongoingBreak.breakEnd = now;
      ongoingBreak.duration = Math.floor((now - ongoingBreak.breakStart) / (1000 * 60));
      if (notes) ongoingBreak.notes = notes;
    }

    await attendance.save();

    res.json({
      success: true,
      message: `Break ${type} successful`,
      attendance
    });
  } catch (error) {
    console.error('Break marking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
});

// @route   GET /api/attendance/current-break
// @desc    Get current break status
// @access  Private
router.get('/current-break', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date().toISOString().split('T')[0];

    const attendance = await Attendance.findOne({ userId, date: today });

    if (!attendance) {
      return res.json({
        success: true,
        onBreak: false,
        currentBreak: null
      });
    }

    const ongoingBreak = attendance.breaks?.find(b => b.breakStart && !b.breakEnd);

    res.json({
      success: true,
      onBreak: !!ongoingBreak,
      currentBreak: ongoingBreak || null,
      totalBreaks: attendance.breaks?.length || 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
});

// @route   GET /api/attendance/detailed/:id
// @desc    Get detailed attendance record
// @access  Private
router.get('/detailed/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const attendance = await Attendance.findOne({
      _id: id,
      userId
    }).populate('userId', 'name email department');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

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

// @route   POST /api/attendance/correction
// @desc    Request attendance correction
// @access  Private
router.post('/correction', [
  authenticate,
  body('attendanceId').notEmpty().withMessage('Attendance ID is required'),
  body('field').notEmpty().withMessage('Field to correct is required'),
  body('newValue').notEmpty().withMessage('New value is required'),
  body('reason').notEmpty().withMessage('Reason is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { attendanceId, field, newValue, reason } = req.body;
    const userId = req.user._id;

    const attendance = await Attendance.findOne({ _id: attendanceId, userId });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    const oldValue = attendance[field];

    if (!attendance.corrections) {
      attendance.corrections = [];
    }

    attendance.corrections.push({
      field,
      oldValue: oldValue ? oldValue.toString() : '',
      newValue: newValue.toString(),
      reason,
      correctedBy: userId,
      correctedAt: new Date()
    });

    attendance.approvalRequired = true;
    attendance.approvalReason = `Correction requested for ${field}: ${reason}`;

    await attendance.save();

    res.json({
      success: true,
      message: 'Correction request submitted successfully',
      attendance
    });
  } catch (error) {
    console.error('Correction request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
});

// @route   POST /api/attendance/productivity
// @desc    Update productivity metrics
// @access  Private
router.post('/productivity', [
  authenticate,
  body('score').isInt({ min: 1, max: 10 }).withMessage('Productivity score must be between 1 and 10'),
  body('tasksCompleted').optional().isInt({ min: 0 }).withMessage('Tasks completed must be a positive number'),
  body('selfAssessment').optional().isString().withMessage('Self assessment must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { score, tasksCompleted, selfAssessment } = req.body;
    const userId = req.user._id;
    const today = new Date().toISOString().split('T')[0];

    const attendance = await Attendance.findOne({ userId, date: today });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No attendance record found for today'
      });
    }

    if (!attendance.productivity) {
      attendance.productivity = {};
    }

    attendance.productivity.score = score;
    if (tasksCompleted !== undefined) attendance.productivity.tasksCompleted = tasksCompleted;
    if (selfAssessment) attendance.productivity.selfAssessment = selfAssessment;

    await attendance.save();

    res.json({
      success: true,
      message: 'Productivity metrics updated successfully',
      attendance
    });
  } catch (error) {
    console.error('Productivity update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
});

// @route   GET /api/attendance/analytics
// @desc    Get advanced attendance analytics
// @access  Private
router.get('/analytics', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = '30' } = req.query; // days

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));
    const endDate = new Date();

    const attendance = await Attendance.find({
      userId,
      date: {
        $gte: startDate.toISOString().split('T')[0],
        $lte: endDate.toISOString().split('T')[0]
      }
    }).sort({ date: -1 });

    // Calculate advanced analytics
    const analytics = {
      totalDays: attendance.length,
      averageProductivity: 0,
      moodDistribution: {},
      checkInPatterns: {},
      breakPatterns: {},
      locationAnalysis: {
        remoteVsOffice: { remote: 0, office: 0 },
        mostCommonLocation: null
      },
      punctualityTrend: [],
      overtimeAnalysis: {
        totalOvertimeHours: 0,
        averageOvertimePerDay: 0,
        overtimeDays: 0
      },
      healthMetrics: {
        averageTemperature: 0,
        commonSymptoms: []
      }
    };

    if (attendance.length > 0) {
      // Productivity analysis
      const productivityScores = attendance
        .filter(a => a.productivity && a.productivity.score)
        .map(a => a.productivity.score);

      if (productivityScores.length > 0) {
        analytics.averageProductivity = productivityScores.reduce((sum, score) => sum + score, 0) / productivityScores.length;
      }

      // Mood distribution
      attendance.forEach(a => {
        if (a.mood) {
          analytics.moodDistribution[a.mood] = (analytics.moodDistribution[a.mood] || 0) + 1;
        }
      });

      // Check-in patterns (by hour)
      attendance.forEach(a => {
        if (a.checkIn) {
          const hour = new Date(a.checkIn).getHours();
          analytics.checkInPatterns[hour] = (analytics.checkInPatterns[hour] || 0) + 1;
        }
      });

      // Break patterns
      const allBreaks = attendance.reduce((breaks, a) => {
        if (a.breaks && a.breaks.length > 0) {
          return breaks.concat(a.breaks);
        }
        return breaks;
      }, []);

      allBreaks.forEach(breakItem => {
        analytics.breakPatterns[breakItem.type] = (analytics.breakPatterns[breakItem.type] || 0) + 1;
      });

      // Location analysis
      attendance.forEach(a => {
        if (a.isRemote) {
          analytics.locationAnalysis.remoteVsOffice.remote++;
        } else {
          analytics.locationAnalysis.remoteVsOffice.office++;
        }
      });

      // Overtime analysis
      const overtimeRecords = attendance.filter(a => a.overtimeHours > 0);
      analytics.overtimeAnalysis.overtimeDays = overtimeRecords.length;
      analytics.overtimeAnalysis.totalOvertimeHours = attendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);
      if (attendance.length > 0) {
        analytics.overtimeAnalysis.averageOvertimePerDay = analytics.overtimeAnalysis.totalOvertimeHours / attendance.length;
      }

      // Health metrics
      const tempRecords = attendance.filter(a => a.temperature);
      if (tempRecords.length > 0) {
        analytics.healthMetrics.averageTemperature = tempRecords.reduce((sum, a) => sum + a.temperature, 0) / tempRecords.length;
      }

      const allSymptoms = attendance.reduce((symptoms, a) => {
        if (a.symptoms && a.symptoms.length > 0) {
          return symptoms.concat(a.symptoms);
        }
        return symptoms;
      }, []);

      const symptomCounts = allSymptoms.reduce((acc, symptom) => {
        acc[symptom] = (acc[symptom] || 0) + 1;
        return acc;
      }, {});

      analytics.healthMetrics.commonSymptoms = Object.entries(symptomCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([symptom, count]) => ({ symptom, count }));

      // Punctuality trend (last 7 days)
      const last7Days = attendance.slice(0, 7).reverse();
      analytics.punctualityTrend = last7Days.map(a => ({
        date: a.date,
        onTime: a.status === 'present',
        checkInTime: a.checkIn ? new Date(a.checkIn).getHours() : null
      }));
    }

    res.json({
      success: true,
      analytics,
      period: parseInt(period)
    });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
});

export default router;