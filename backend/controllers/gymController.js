const Gym = require('../models/Gym');
const User = require('../models/User');

// @desc    Get all gyms
// @route   GET /api/gyms
// @access  Private/SuperAdmin
exports.getGyms = async (req, res) => {
    try {
        const gyms = await Gym.find().populate('ownerId', 'name email phone');
        res.json(gyms);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error fetching gyms' });
    }
};
