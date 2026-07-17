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
    altContact: { type: String },
    email: { type: String, trim: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    address: { type: String },
    followUpDate: { type: Date, required: true },
    followUpTime: { type: String },
    trialDate: { type: Date },
    trialEndDate: { type: Date },
    status: { 
        type: String, 
        enum: ['Pending', 'Lead', 'Contacted', 'Negotiation', 'Converted', 'Lost'], 
        default: 'Pending' 
    },
    attendedBy: { type: String, required: true },
    convertibility: { type: String, enum: ['Warm', 'Hot', 'Cold'], required: true },
    source: { type: String, required: true },
    inquiryFor: { type: String, required: true },
    response: { type: String, required: true },
    sendTextAndEmail: { type: Boolean, default: false },
    sendWhatsApp: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Enquiry', enquirySchema);
