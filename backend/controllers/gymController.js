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
        let gym = null;
        if (req.user.gymId) {
            gym = await Gym.findById(req.user.gymId);
        }
        if (!gym && req.user._id) {
            gym = await Gym.findOne({ ownerId: req.user._id });
            if (gym) {
                await User.findByIdAndUpdate(req.user._id, { gymId: gym._id }).catch(() => {});
            }
        }
        if (!gym) {
            gym = await Gym.findOne();
            if (gym && req.user._id) {
                await User.findByIdAndUpdate(req.user._id, { gymId: gym._id }).catch(() => {});
            }
        }
        if (!gym) {
            // Auto-create default gym so system works immediately
            gym = await Gym.create({
                name: 'Fitness Gym',
                ownerId: req.user._id,
                address: 'Main Gym Center',
                contactEmail: req.user.email || 'contact@gym.com',
                contactPhone: req.user.phone || '9876543210',
                referralProgramEnabled: true,
                referralRewardType: 'Both',
                referrerBonusDays: 7,
                referrerWalletAmount: 200,
                referrerDiscountPercent: 10,
                refereeBonusDays: 5,
                refereeDiscountPercent: 10,
                minPlanDurationDays: 30
            });
            if (gym && req.user._id) {
                await User.findByIdAndUpdate(req.user._id, { gymId: gym._id }).catch(() => {});
            }
        }

        res.json(gym);
    } catch (error) {
        console.error('Error in getMyGym:', error);
        res.status(500).json({ message: 'Server Error fetching my gym' });
    }
};

// @desc    Update current gym settings
// @route   PUT /api/gyms/my-gym
// @access  Private (Gym Owner)
exports.updateMyGym = async (req, res) => {
    try {
        let gym = null;
        if (req.user.gymId) {
            gym = await Gym.findById(req.user.gymId);
        }
        if (!gym && req.user._id) {
            gym = await Gym.findOne({ ownerId: req.user._id });
        }
        if (!gym) {
            gym = await Gym.findOne();
        }
        if (!gym) {
            gym = await Gym.create({
                name: req.body.name || 'Fitness Gym',
                ownerId: req.user._id,
                address: 'Main Gym Center',
                contactEmail: req.body.contactEmail || req.user.email || 'contact@gym.com',
                contactPhone: req.body.contactPhone || req.user.phone || '9876543210'
            });
            if (gym && req.user._id) {
                await User.findByIdAndUpdate(req.user._id, { gymId: gym._id }).catch(() => {});
            }
        }
        
        const { 
            name,
            contactEmail,
            contactPhone,
            latitude, 
            longitude, 
            qrAttendanceEnabled, 
            qrAttendanceRange,
            referralProgramEnabled,
            referralRewardType,
            referrerBonusDays,
            referrerWalletAmount,
            referrerDiscountPercent,
            refereeBonusDays,
            refereeDiscountPercent,
            minPlanDurationDays,
            couponOffers,
            weeklyOff,
            workingHours,
            holidays
        } = req.body;

        if (name !== undefined) gym.name = name;
        if (contactEmail !== undefined) gym.contactEmail = contactEmail;
        if (contactPhone !== undefined) gym.contactPhone = contactPhone;
        if (latitude !== undefined) gym.latitude = latitude;
        if (longitude !== undefined) gym.longitude = longitude;
        if (qrAttendanceEnabled !== undefined) gym.qrAttendanceEnabled = qrAttendanceEnabled;
        if (qrAttendanceRange !== undefined) gym.qrAttendanceRange = qrAttendanceRange;

        // Referral & Bonus Program Settings
        if (referralProgramEnabled !== undefined) gym.referralProgramEnabled = referralProgramEnabled;
        if (referralRewardType !== undefined) gym.referralRewardType = referralRewardType;
        if (referrerBonusDays !== undefined) gym.referrerBonusDays = Number(referrerBonusDays);
        if (referrerWalletAmount !== undefined) gym.referrerWalletAmount = Number(referrerWalletAmount);
        if (referrerDiscountPercent !== undefined) gym.referrerDiscountPercent = Number(referrerDiscountPercent);
        if (refereeBonusDays !== undefined) gym.refereeBonusDays = Number(refereeBonusDays);
        if (refereeDiscountPercent !== undefined) gym.refereeDiscountPercent = Number(refereeDiscountPercent);
        if (minPlanDurationDays !== undefined) gym.minPlanDurationDays = Number(minPlanDurationDays);

        if (couponOffers !== undefined) gym.couponOffers = couponOffers;
        if (weeklyOff !== undefined) gym.weeklyOff = weeklyOff;
        if (workingHours !== undefined) gym.workingHours = workingHours;
        if (holidays !== undefined) gym.holidays = holidays;

        await gym.save();
        res.json(gym);
    } catch (error) {
        console.error('Error in updateMyGym:', error);
        res.status(500).json({ message: 'Server Error updating gym' });
    }
};
