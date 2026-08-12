const mongoose = require('mongoose');

const trialDeviceSchema = new mongoose.Schema({
    enquiryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Enquiry',
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

    lastLoginAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true
    }
}, { timestamps: true });

// Ensure one active device token per enquiry per gym
trialDeviceSchema.index({ enquiryId: 1, gymId: 1 });

module.exports = mongoose.model('TrialDevice', trialDeviceSchema);
