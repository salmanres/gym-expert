const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Counter = require('./Counter');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: false
    },
    role: {
        type: String,
        enum: ['SUPERADMIN', 'GYM_OWNER', 'BRANCH_MANAGER', 'STAFF', 'MEMBER', 'TRAINER', 'ADMIN'],
        default: 'MEMBER'
    },
    gymId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gym',
        default: null
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        default: null
    },
    // Additional Staff Fields
    employeeId: { type: String },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    dob: { type: Date },
    address: { type: String },
    emergencyContactName: { type: String },
    emergencyContactNumber: { type: String },
    joiningDate: { type: Date },
    specialization: { type: String },
    experienceYears: { type: Number },
    salary: { type: Number },
    shiftStart: { type: String },
    shiftEnd: { type: String },
    status: { type: String, enum: ['Active', 'Inactive', 'Suspended'], default: 'Active' },
    profilePhoto: { type: String },
    walletBalance: { type: Number, default: 0 }
}, { timestamps: true });

// Pre-validate hook to auto-generate employeeId atomically
userSchema.pre('validate', async function(next) {
    if (!this.employeeId && this.gymId && ['STAFF', 'TRAINER', 'ADMIN', 'BRANCH_MANAGER'].includes(this.role)) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { gymId: this.gymId, identifier: 'employeeId' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.employeeId = `EMP${String(counter.seq).padStart(4, '0')}`;
        } catch (err) {
            return next(err);
        }
    }
    next();
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
