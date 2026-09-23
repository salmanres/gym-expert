const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    gymId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gym',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['LEAD', 'MEMBER', 'ATTENDANCE', 'PAYMENT', 'MEMBERSHIP', 'SYSTEM', 'FINANCE', 'PLAN'],
        default: 'SYSTEM'
    },
    targetId: {
        type: String,
        default: null
    },
    link: {
        type: String,
        default: ''
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Auto-expire logs older than 30 days (2,592,000 seconds)
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
