import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String,
    required: true, // Format: YYYY-MM-DD
  },
  checkIn: {
    type: Date,
    required: true
  },
  checkOut: {
    type: Date
  },
  status: {
    type: String,
    enum: ['present', 'late', 'absent', 'half-day'],
    default: 'present'
  },
  checkInLocation: {
    latitude: Number,
    longitude: Number,
    address: String,
    accuracy: Number
  },
  checkOutLocation: {
    latitude: Number,
    longitude: Number,
    address: String,
    accuracy: Number
  }, breaks: [{
    breakStart: Date,
    breakEnd: Date,
    duration: Number, // in minutes
    type: {
      type: String,
      enum: ['lunch', 'tea', 'personal', 'meeting', 'other'],
      default: 'other'
    },
    notes: String,
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    }
  }],
  notes: {
    type: String,
    maxlength: 500
  },
  workingHours: {
    type: Number,
    default: 0 // in minutes
  },
  breakHours: {
    type: Number,
    default: 0 // in minutes
  },
  overtimeHours: {
    type: Number,
    default: 0 // in minutes
  },
  device: {
    userAgent: String,
    ip: String,
    platform: String
  },
  isRemote: {
    type: Boolean,
    default: false
  }, temperature: Number, // for health tracking
  symptoms: [String], // for health tracking
  isApproved: {
    type: Boolean,
    default: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  productivity: {
    score: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    },
    tasksCompleted: {
      type: Number,
      default: 0
    },
    selfAssessment: String
  },
  mood: {
    type: String,
    enum: ['excellent', 'good', 'neutral', 'tired', 'stressed'],
    default: 'neutral'
  },
  networkInfo: {
    connectionType: String, // wifi, cellular, ethernet
    signalStrength: Number,
    networkName: String
  },
  batteryLevel: Number, // for mobile devices
  gpsAccuracy: Number, // GPS accuracy in meters
  faceRecognitionScore: Number, // if using face recognition
  rfidCardId: String, // if using RFID cards
  approvalRequired: {
    type: Boolean,
    default: false
  },
  approvalReason: String,
  corrections: [{
    field: String,
    oldValue: String,
    newValue: String,
    reason: String,
    correctedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    correctedAt: {
      type: Date,
      default: Date.now
    }
  }],
  weather: {
    condition: String,
    temperature: Number,
    humidity: Number
  }
}, {
  timestamps: true
});

// Create compound index for userId and date
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

// Calculate working hours before saving
attendanceSchema.pre('save', function (next) {
  if (this.checkIn && this.checkOut) {
    const diffMs = this.checkOut - this.checkIn;
    let totalMinutes = Math.floor(diffMs / (1000 * 60));

    // Subtract break time
    if (this.breaks && this.breaks.length > 0) {
      this.breakHours = this.breaks.reduce((total, breakItem) => {
        if (breakItem.breakStart && breakItem.breakEnd) {
          const breakDuration = Math.floor((breakItem.breakEnd - breakItem.breakStart) / (1000 * 60));
          breakItem.duration = breakDuration;
          return total + breakDuration;
        }
        return total;
      }, 0);
      totalMinutes -= this.breakHours;
    }

    this.workingHours = Math.max(0, totalMinutes);

    // Calculate overtime (assuming 8 hours = 480 minutes is standard)
    if (this.workingHours > 480) {
      this.overtimeHours = this.workingHours - 480;
    }
  }
  next();
});

export default mongoose.model('Attendance', attendanceSchema);