const mongoose = require('mongoose');

const followUpHistorySchema = new mongoose.Schema(
    {
        contactDate: {
            type: Date,
            default: Date.now
        },

        response: {
            type: String,
            trim: true,
            default: ''
        },

        nextFollowUpDate: {
            type: Date,
            default: null
        },

        nextFollowUpTime: {
            type: String,
            trim: true,
            default: ''
        },

        status: {
            type: String,
            trim: true,
            default: ''
        }
    },
    {
        _id: true
    }
);

const enquirySchema = new mongoose.Schema(
    {
        // --------------------------------------------------
        // Gym
        // --------------------------------------------------

        gymId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Gym',
            required: true,
            index: true
        },

        // --------------------------------------------------
        // Personal Details
        // --------------------------------------------------

        firstName: {
            type: String,
            required: true,
            trim: true
        },

        lastName: {
            type: String,
            trim: true,
            default: ''
        },

        contactNumber: {
            type: String,
            required: true,
            trim: true
        },

        altContact: {
            type: String,
            trim: true,
            default: ''
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
            default: ''
        },

        dob: {
            type: Date,
            default: null
        },

        gender: {
            type: String,
            enum: ['Male', 'Female', 'Other'],
            default: 'Male'
        },

        address: {
            type: String,
            trim: true,
            default: ''
        },

        // --------------------------------------------------
        // Follow-up
        // --------------------------------------------------

        followUpDate: {
            type: Date,
            default: null
        },

        followUpTime: {
            type: String,
            trim: true,
            default: ''
        },

        // --------------------------------------------------
        // Trial
        // --------------------------------------------------

        trialDate: {
            type: Date,
            default: null
        },

        trialEndDate: {
            type: Date,
            default: null
        },

        trialFeeType: {
            type: String,
            enum: ['Unpaid', 'Paid'],
            default: 'Unpaid'
        },

        trialFee: {
            type: Number,
            default: 0,
            min: 0
        },

        trialPaymentStatus: {
            type: String,
            enum: ['Paid', 'Unpaid', 'Pending'],
            default: 'Unpaid'
        },

        trialPaymentMode: {
            type: String,
            trim: true,
            default: 'Cash'
        },

        securityAmount: {
            type: Number,
            default: 0,
            min: 0
        },

        // --------------------------------------------------
        // Lead Status
        // --------------------------------------------------

        status: {
            type: String,
            enum: [
                'Pending',
                'Lead',
                'Contacted',
                'Trial',
                'Negotiation',
                'Converted',
                'Lost'
            ],
            default: 'Pending',
            index: true
        },

        // --------------------------------------------------
        // Staff / Creator Information
        // --------------------------------------------------

        attendedBy: {
            type: String,
            trim: true,
            default: ''
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },

        addedByName: {
            type: String,
            trim: true,
            default: ''
        },

        addedByRole: {
            type: String,
            trim: true,
            default: 'Admin'
        },

        // --------------------------------------------------
        // Lead Qualification
        // --------------------------------------------------

        convertibility: {
            type: String,
            enum: ['Warm', 'Hot', 'Cold'],
            default: 'Warm'
        },

        source: {
            type: String,
            trim: true,
            default: ''
        },

        referredBy: {
            type: String,
            trim: true,
            default: ''
        },

        inquiryFor: {
            type: String,
            trim: true,
            default: ''
        },

        // --------------------------------------------------
        // Response / Offer
        // --------------------------------------------------

        response: {
            type: String,
            trim: true,
            default: ''
        },

        offerAmount: {
            type: Number,
            default: 0,
            min: 0
        },

        offerDetails: {
            type: String,
            trim: true,
            default: ''
        },

        selectedOffer: {
            type: String,
            trim: true,
            default: ''
        },

        // --------------------------------------------------
        // Lost Lead
        // --------------------------------------------------

        lostReason: {
            type: String,
            trim: true,
            default: ''
        },

        // --------------------------------------------------
        // Follow-up History
        // --------------------------------------------------

        followUpHistory: {
            type: [followUpHistorySchema],
            default: []
        },

        // --------------------------------------------------
        // Conversion
        // --------------------------------------------------

        isMemberCreated: {
            type: Boolean,
            default: false
        },

        // --------------------------------------------------
        // Communication
        // --------------------------------------------------

        sendTextAndEmail: {
            type: Boolean,
            default: false
        },

        sendWhatsApp: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

// --------------------------------------------------
// Indexes
// --------------------------------------------------

enquirySchema.index({
    gymId: 1,
    createdAt: -1
});

enquirySchema.index({
    gymId: 1,
    status: 1
});

enquirySchema.index({
    gymId: 1,
    followUpDate: 1
});

module.exports = mongoose.model('Enquiry', enquirySchema);