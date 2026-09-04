const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
    gymId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gym',
        required: true
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        default: null
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true },
    contactNumber: { type: String, required: true },
    dob: { type: Date },
    altContact: { type: String },
    email: { type: String, trim: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    address: { type: String },
    followUpDate: { type: Date },
    followUpTime: { type: String },
    trialDate: { type: Date },
    trialEndDate: { type: Date },
    trialFeeType: { type: String, enum: ['Unpaid', 'Paid'], default: 'Unpaid' },
    trialFee: { type: Number, default: 0 },
    trialPaymentStatus: { type: String, enum: ['Paid', 'Unpaid', 'Pending'], default: 'Unpaid' },
    trialPaymentMode: { type: String, default: 'Cash' },
    status: { 
        type: String, 
        enum: ['Pending', 'Lead', 'Contacted', 'Trial', 'Negotiation', 'Converted', 'Lost'], 
        default: 'Pending' 
    },
    attendedBy: { type: String },
    convertibility: { type: String, enum: ['Warm', 'Hot', 'Cold'] },
    source: { type: String },
    referredBy: { type: String },
    inquiryFor: { type: String },
    response: { type: String },
    offerAmount: { type: Number },
    offerDetails: { type: String },
    lostReason: { type: String },
    followUpHistory: [{
        contactDate: { type: Date, default: Date.now },
        response: { type: String },
        nextFollowUpDate: { type: Date },
        nextFollowUpTime: { type: String },
        status: { type: String }
    }],
    isMemberCreated: { type: Boolean, default: false },
    sendTextAndEmail: { type: Boolean, default: false },
    sendWhatsApp: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Enquiry', enquirySchema);
