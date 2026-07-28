const mongoose = require('mongoose');

const gymSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    address: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    contactEmail: {
        type: String
    },
    isMultiBranch: {
        type: Boolean,
        default: false
    },
    contactPhone: {
        type: String
    },
    latitude: {
        type: Number
    },
    longitude: {
        type: Number
    },
    qrAttendanceEnabled: {
        type: Boolean,
        default: false
    },
    qrAttendanceRange: {
        type: Number,
        default: 50
    }
}, { timestamps: true });

module.exports = mongoose.model('Gym', gymSchema);
