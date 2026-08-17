const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, uppercase: true, trim: true },
    title: { type: String, required: true },
    discountType: { type: String, enum: ['Percentage', 'Flat'], default: 'Percentage' },
    discountValue: { type: Number, default: 0 },
    bonusDays: { type: Number, default: 0 },
    minPlanDays: { type: Number, default: 30 },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

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
    },

    // Referral & Bonus Days / Wallet Settings
    referralProgramEnabled: {
        type: Boolean,
        default: true
    },
    referralRewardType: {
        type: String,
        enum: ['Bonus Days', 'Wallet Cash', 'Both'],
        default: 'Both'
    },
    referrerBonusDays: {
        type: Number,
        default: 7
    },
    referrerWalletAmount: {
        type: Number,
        default: 200
    },
    referrerDiscountPercent: {
        type: Number,
        default: 10
    },
    refereeBonusDays: {
        type: Number,
        default: 5
    },
    refereeDiscountPercent: {
        type: Number,
        default: 10
    },
    minPlanDurationDays: {
        type: Number,
        default: 30
    },

    // Attendance & Schedule Settings
    weeklyOff: {
        type: [String],
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        default: ['Sunday']
    },
    workingHours: {
        start: { type: String, default: '06:00' },
        end: { type: String, default: '22:00' }
    },
    holidays: [{
        date: { type: Date, required: true },
        reason: { type: String, required: true }
    }],

    // Coupon & Offer Management
    couponOffers: [couponSchema]
}, { timestamps: true });

module.exports = mongoose.model('Gym', gymSchema);
