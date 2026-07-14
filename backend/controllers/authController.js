const User = require('../models/User');
const Gym = require('../models/Gym');
const Branch = require('../models/Branch');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};

// @desc    Universal Login (SuperAdmin, GymOwner, BranchManager, Staff, Member)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email })
            .populate('gymId')
            .populate('branchId');

        if (user && (await user.comparePassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                gym: user.gymId, 
                branch: user.branchId,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error during login' });
    }
};

// @desc    Register a new Gym and its Gym Owner
// @route   POST /api/auth/register-gym
// @access  Private/SuperAdmin
exports.registerGym = async (req, res) => {
    try {
        const { gymName, ownerName, email, phone, password, address } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // 1. Create the Gym Owner User
        const gymOwner = await User.create({
            name: ownerName,
            email,
            phone,
            password,
            role: 'GYM_OWNER'
        });

        // 2. Create the Gym (Business entity)
        const gym = await Gym.create({
            name: gymName,
            address: address,
            ownerId: gymOwner._id,
            contactEmail: email,
            contactPhone: phone
        });

        // 3. Update the Admin with the Gym ID
        gymOwner.gymId = gym._id;
        await gymOwner.save();

        res.status(201).json({
            message: 'Gym and Gym Owner registered successfully',
            gym: {
                _id: gym._id,
                name: gym.name
            },
            owner: {
                _id: gymOwner._id,
                name: gymOwner.name,
                email: gymOwner.email
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error during gym registration' });
    }
};

// @desc    Register a new Branch for a Gym
// @route   POST /api/auth/register-branch
// @access  Private/GymOwner
exports.registerBranch = async (req, res) => {
    try {
        const { name, address, phone } = req.body;
        
        // GymOwner can only create a branch for their own Gym
        const gymId = req.user.gymId;

        if (!gymId) {
             return res.status(400).json({ message: 'User does not belong to any gym' });
        }

        const branch = await Branch.create({
            gymId,
            name,
            address,
            phone
        });

        res.status(201).json({
            message: 'Branch created successfully',
            branch
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error during branch creation' });
    }
};

// @desc    Bootstrap SuperAdmin (One-time setup or secured via a secret key)
// @route   POST /api/auth/init-superadmin
// @access  Public (Only works if no superadmin exists)
exports.initSuperAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        const superAdminExists = await User.findOne({ role: 'SUPERADMIN' });
        if (superAdminExists) {
            return res.status(403).json({ message: 'SuperAdmin already initialized.' });
        }

        const superAdmin = await User.create({
            name,
            email,
            password,
            role: 'SUPERADMIN'
        });

        res.status(201).json({
            message: 'SuperAdmin initialized successfully',
            user: {
                _id: superAdmin._id,
                name: superAdmin.name,
                email: superAdmin.email,
                role: superAdmin.role
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during init' });
    }
};
