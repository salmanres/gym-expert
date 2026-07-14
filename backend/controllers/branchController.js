const Branch = require('../models/Branch');

// @desc    Create a new branch for the logged-in gym owner
// @route   POST /api/branches
// @access  Private (Gym Owner)
const createBranch = async (req, res) => {
    try {
        const { name, address, phone } = req.body;

        if (!name || !address || !phone) {
            return res.status(400).json({ message: 'Please provide all required fields (name, address, phone)' });
        }

        if (!req.user.gymId) {
            return res.status(400).json({ message: 'No gym associated with this user' });
        }

        const branch = await Branch.create({
            gymId: req.user.gymId,
            name,
            address,
            phone,
            isActive: true
        });

        res.status(201).json(branch);
    } catch (error) {
        console.error("Create branch error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all branches for the logged-in gym owner
// @route   GET /api/branches
// @access  Private (Gym Owner)
const getBranches = async (req, res) => {
    try {
        if (!req.user.gymId) {
            return res.status(400).json({ message: 'No gym associated with this user' });
        }

        const branches = await Branch.find({ gymId: req.user.gymId }).sort({ createdAt: -1 });
        res.json(branches);
    } catch (error) {
        console.error("Get branches error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = {
    createBranch,
    getBranches
};
