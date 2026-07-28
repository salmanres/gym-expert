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

// @desc    Get current gym (for gym owner)
// @route   GET /api/gyms/my-gym
// @access  Private
exports.getMyGym = async (req, res) => {
    try {
        if (!req.user.gymId) {
            return res.status(400).json({ message: 'No gym associated with this user' });
        }
        const gym = await Gym.findById(req.user.gymId);
        if (!gym) {
            return res.status(404).json({ message: 'Gym not found' });
        }
        res.json(gym);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error fetching my gym' });
    }
};

// @desc    Update current gym settings
// @route   PUT /api/gyms/my-gym
// @access  Private (Gym Owner)
exports.updateMyGym = async (req, res) => {
    try {
        if (!req.user.gymId) {
            return res.status(400).json({ message: 'No gym associated with this user' });
        }
        
        const { latitude, longitude, qrAttendanceEnabled, qrAttendanceRange } = req.body;
        
        const gym = await Gym.findById(req.user.gymId);
        if (!gym) {
            return res.status(404).json({ message: 'Gym not found' });
        }

        if (latitude !== undefined) gym.latitude = latitude;
        if (longitude !== undefined) gym.longitude = longitude;
        if (qrAttendanceEnabled !== undefined) gym.qrAttendanceEnabled = qrAttendanceEnabled;
        if (qrAttendanceRange !== undefined) gym.qrAttendanceRange = qrAttendanceRange;

        await gym.save();
        res.json(gym);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error updating gym' });
    }
};
