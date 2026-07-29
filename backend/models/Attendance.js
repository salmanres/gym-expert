const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member',
        required: true
    },
    gymId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gym',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    checkInTime: {
        type: Date
    },
    checkOutTime: {
        type: Date
    },
    status: {
        type: String,
        enum: ['Present', 'Absent', 'Half-Day', 'Late'],
        default: 'Present'
    },
    source: {
        type: String,
        enum: ['Manual', 'QR', 'Biometric'],
        default: 'Manual'
    },
    location: {
        latitude: {
            type: Number
        },
        longitude: {
            type: Number
        }
    },
    notes: {
        type: String
    },
    markedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Who marked it (if Manual)
    }
}, { timestamps: true });

// Ensure one attendance record per user per day
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
