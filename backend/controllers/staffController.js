const User = require('../models/User');
const Gym = require('../models/Gym');
const { notifyGym } = require('../socket');

// @desc    Get all staff for the logged-in gym
// @route   GET /api/staff
// @access  Private (Gym Owner & Admin)
exports.getStaff = async (req, res) => {
    try {
        if (!req.user.gymId) {
            return res.status(400).json({ message: 'No gym associated with this user' });
        }
        const staffMembers = await User.find({ 
            gymId: req.user.gymId,
            role: { $in: ['STAFF', 'TRAINER', 'ADMIN', 'BRANCH_MANAGER'] }
        }).select('-password');
        res.json(staffMembers);
    } catch (error) {
        console.error("Get staff error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Add a new staff member (trainer, admin, etc.)
// @route   POST /api/staff
// @access  Private (Gym Owner ONLY - Admin restricted)
exports.createStaff = async (req, res) => {
    try {
        if (req.user.role !== 'GYM_OWNER') {
            return res.status(403).json({ message: 'Access denied. Only the Gym Owner can add or create staff members.' });
        }

        const { 
            name, email, phone, role, password,
            gender, dob, address, emergencyContactName, emergencyContactNumber,
            joiningDate, specialization, experienceYears, salary, 
            shiftStart, shiftEnd, status, profilePhoto
        } = req.body;
        
        if (!name || !email || !role || !password) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email is already registered' });
        }

        const validRoles = ['STAFF', 'TRAINER', 'ADMIN', 'BRANCH_MANAGER'];
        if (!validRoles.includes(role)) {
             return res.status(400).json({ message: 'Invalid role specified' });
        }

        const newStaff = await User.create({
            name, email, phone, password, role,
            gender, dob, address, emergencyContactName, emergencyContactNumber,
            joiningDate, specialization, experienceYears, salary, 
            shiftStart, shiftEnd, status, profilePhoto,
            gymId: req.user.gymId
        });

        // Broadcast real-time Socket notification
        notifyGym(req.user.gymId, {
            title: `New Staff Added: ${name}`,
            description: `Role: ${role} • Phone: ${phone || 'N/A'} has been registered.`,
            type: 'MEMBER',
            targetId: newStaff._id,
            link: '/dashboard/owner/staff'
        });

        // return without password
        const staffObj = newStaff.toObject();
        delete staffObj.password;

        res.status(201).json(staffObj);
    } catch (error) {
        console.error("Create staff error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update a staff member
// @route   PUT /api/staff/:id
// @access  Private (Gym Owner ONLY - Admin restricted)
exports.updateStaff = async (req, res) => {
    try {
        if (req.user.role !== 'GYM_OWNER') {
            return res.status(403).json({ message: 'Access denied. Only the Gym Owner can update staff members.' });
        }

        const { 
            name, email, phone, role, password,
            gender, dob, address, emergencyContactName, emergencyContactNumber,
            joiningDate, specialization, experienceYears, salary, 
            shiftStart, shiftEnd, status, profilePhoto
        } = req.body;
        
        const staff = await User.findOne({ _id: req.params.id, gymId: req.user.gymId });
        if (!staff) {
            return res.status(404).json({ message: 'Staff member not found' });
        }

        if (email && email !== staff.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'Email is already taken by another user' });
            }
        }

        if (name !== undefined) staff.name = name;
        if (email !== undefined) staff.email = email;
        if (phone !== undefined) staff.phone = phone;
        if (role !== undefined) staff.role = role;
        if (password) staff.password = password; // will be hashed automatically
        
        if (gender !== undefined) staff.gender = gender;
        if (dob !== undefined) staff.dob = dob;
        if (address !== undefined) staff.address = address;
        if (emergencyContactName !== undefined) staff.emergencyContactName = emergencyContactName;
        if (emergencyContactNumber !== undefined) staff.emergencyContactNumber = emergencyContactNumber;
        if (joiningDate !== undefined) staff.joiningDate = joiningDate;
        if (specialization !== undefined) staff.specialization = specialization;
        if (experienceYears !== undefined) staff.experienceYears = experienceYears;
        if (salary !== undefined) staff.salary = salary;
        if (shiftStart !== undefined) staff.shiftStart = shiftStart;
        if (shiftEnd !== undefined) staff.shiftEnd = shiftEnd;
        if (status !== undefined) staff.status = status;
        if (profilePhoto !== undefined) staff.profilePhoto = profilePhoto;

        await staff.save();
        
        // Broadcast real-time Socket notification
        notifyGym(req.user.gymId, {
            title: `Staff Updated: ${staff.name}`,
            description: `Profile & assignment updated for ${staff.name} (${staff.role}).`,
            type: 'MEMBER',
            targetId: staff._id,
            link: '/dashboard/owner/staff'
        });

        const staffObj = staff.toObject();
        delete staffObj.password;

        res.json(staffObj);
    } catch (error) {
        console.error("Update staff error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete a staff member
// @route   DELETE /api/staff/:id
// @access  Private (Gym Owner ONLY - Admin restricted)
exports.deleteStaff = async (req, res) => {
    try {
        if (req.user.role !== 'GYM_OWNER') {
            return res.status(403).json({ message: 'Access denied. Only the Gym Owner can delete staff members.' });
        }

        const staff = await User.findOne({ _id: req.params.id, gymId: req.user.gymId });
        if (!staff) {
            return res.status(404).json({ message: 'Staff member not found' });
        }

        const staffName = staff.name;
        const staffRole = staff.role;

        await staff.deleteOne();

        // Broadcast real-time Socket notification
        notifyGym(req.user.gymId, {
            title: `Staff Removed: ${staffName}`,
            description: `${staffName} (${staffRole}) has been removed from staff directory.`,
            type: 'MEMBER',
            targetId: req.params.id,
            link: '/dashboard/owner/staff'
        });

        res.json({ message: 'Staff member deleted' });
    } catch (error) {
        console.error("Delete staff error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
