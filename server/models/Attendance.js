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
    enum: ['present', 'late', 'absent'],
    default: 'present'
  },
  location: {
    latitude: Number,
    longitude: Number
  },
  notes: {
    type: String,
    maxlength: 500
  },
  workingHours: {
    type: Number,
    default: 0 // in minutes
  }
}, {
  timestamps: true
});

// Create compound index for userId and date
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

// Calculate working hours before saving
attendanceSchema.pre('save', function(next) {
  if (this.checkIn && this.checkOut) {
    const diffMs = this.checkOut - this.checkIn;
    this.workingHours = Math.floor(diffMs / (1000 * 60)); // Convert to minutes
  }
  next();
});

export default mongoose.model('Attendance', attendanceSchema);