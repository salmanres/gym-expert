const mongoose = require('mongoose');

const memberDeviceSchema = new mongoose.Schema({
    memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member',
        required: true
    },
    gymId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gym',
        required: true
    },
    deviceToken: {
        type: String,
        required: true,
        unique: true
    },
    browserFingerprint: {
        type: String
    },
    lastLoginAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Ensure one active device token per member per gym, or allow multiple? Let's just index it.
memberDeviceSchema.index({ memberId: 1, gymId: 1 });

module.exports = mongoose.model('MemberDevice', memberDeviceSchema);
