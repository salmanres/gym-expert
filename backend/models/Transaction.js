const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'MembershipPlan' },
    amountPaid: { type: Number, required: true },
    paymentMode: { type: String, enum: ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Other'], default: 'Cash' },
    transactionId: { type: String },
    paymentStatus: { type: String, enum: ['Paid', 'Pending', 'Partial'], default: 'Paid' },
    paymentDate: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
