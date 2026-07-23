const mongoose = require('mongoose');

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
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    profilePhoto: { type: String }
}, {
    timestamps: true
});

// Pre-save hook to auto-generate memberId
memberSchema.pre('validate', async function(next) {
    if (!this.memberId) {
        try {
            const count = await this.constructor.countDocuments({ gymId: this.gymId });
            this.memberId = `MEM-${String(count + 1).padStart(4, '0')}`;
        } catch (err) {
            return next(err);
        }
    }
    next();
});

module.exports = mongoose.model('Member', memberSchema);
