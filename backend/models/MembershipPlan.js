const mongoose = require('mongoose');

const membershipPlanSchema = new mongoose.Schema({
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    name: { type: String, required: true },
    planType: [{ type: String }],
    duration: { type: Number, required: true },
    durationUnit: { type: String, enum: ['Days', 'Weeks', 'Months', 'Years'], default: 'Months' },
    sessions: { type: Number, default: 0 }, // For PT or class-based memberships
    price: { type: Number, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true
});

module.exports = mongoose.model('MembershipPlan', membershipPlanSchema);
