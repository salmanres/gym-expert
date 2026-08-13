const mongoose = require('mongoose');
const Counter = require('./Counter');

const memberSchema = new mongoose.Schema({
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    memberId: { type: String, required: true }, // e.g. MEM-0001
    enquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enquiry' }, // If converted

    // Personal Details
    firstName: { type: String, required: true },
    lastName: { type: String },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    dob: { type: Date },
    contactNumber: { type: String, required: true },
    email: { type: String },
    bloodGroup: { type: String },

    // Member Wallet Balance
    walletBalance: { type: Number, default: 0 },

    // Referral Details
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
    referralBonusGranted: { type: Boolean, default: false },

    // Inherited Lead Fields
    altContact: { type: String },
    source: { type: String },
    interest: { type: String },
    followUpDate: { type: Date },
    followUpTime: { type: String },
    convertibility: { type: String },
    attendedBy: { type: String },
    response: { type: String },

    // Address & Emergency
    address: { type: String },
    emergencyContactName: { type: String },
    emergencyContactNumber: { type: String },
    
    // Body Metrics & Health
    height: { type: Number }, // in cm
    weight: { type: Number }, // in kg
    bmi: { type: Number },
    bodyFat: { type: Number }, // percentage
    dietPreference: { type: String, enum: ['', 'Veg', 'Non-Veg', 'Vegan', 'Eggitarian', 'Any'] },
    medicalConditions: { type: String },
    
    joiningDate: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: ['Active', 'Inactive', 'Frozen'], default: 'Active' },
    freezeDate: { type: Date },
    profilePhoto: { type: String },
    
    // Auth fields
    otp: { type: String },
    otpExpiry: { type: Date }
}, {
    timestamps: true
});

// Pre-save hook to auto-generate memberId atomically
memberSchema.pre('validate', async function(next) {
    if (!this.memberId) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { gymId: this.gymId, identifier: 'memberId' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.memberId = `MEM-${String(counter.seq).padStart(4, '0')}`;
        } catch (err) {
            return next(err);
        }
    }
    next();
});

module.exports = mongoose.model('Member', memberSchema);
