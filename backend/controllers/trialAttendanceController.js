const Attendance = require('../models/Attendance');
const Gym = require('../models/Gym');
const Enquiry = require('../models/Enquiry');
const TrialDevice = require('../models/TrialDevice');
const crypto = require('crypto');

// Helper to calculate distance using Haversine formula (returns distance in meters)
const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const toRadians = (degree) => degree * Math.PI / 180;
    
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

// @desc    Identify Trial Person and generate Device Token
// @route   POST /api/trial-attendance/identify
// @access  Public
exports.identifyTrial = async (req, res) => {
    try {
        const { gymId, contactNumber } = req.body;

        if (!gymId || !contactNumber) {
            return res.status(400).json({
                message: 'Gym ID and contact number are required.'
            });
        }

        const phoneRegex = /^[6-9]\d{9}$/;

        if (!phoneRegex.test(contactNumber)) {
            return res.status(400).json({
                message: 'Invalid contact number.'
            });
        }

        const enquiry = await Enquiry.findOne({
            gymId,
            contactNumber
        });

        if (!enquiry) {
            return res.status(404).json({
                message: 'No trial person found with this contact number.'
            });
        }

        // Check trial dates
        const now = new Date();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const trialStart = enquiry.trialDate
            ? new Date(enquiry.trialDate)
            : null;

        const trialEnd = enquiry.trialEndDate
            ? new Date(enquiry.trialEndDate)
            : null;

        if (trialStart) {
            trialStart.setHours(0, 0, 0, 0);
        }

        if (trialEnd) {
            trialEnd.setHours(23, 59, 59, 999);
        }

        if (
            !trialStart ||
            !trialEnd ||
            now < trialStart ||
            now > trialEnd
        ) {
            return res.status(403).json({
                message: 'Your trial period is not active.'
            });
        }

        // Remove old device for this trial
        await TrialDevice.deleteMany({
            enquiryId: enquiry._id,
            gymId
        });

        // Create new device token
        const deviceToken = crypto.randomBytes(32).toString('hex');

        await TrialDevice.create({
            enquiryId: enquiry._id,
            gymId,
            deviceToken,
            expiresAt: trialEnd
        });

        res.json({
            message: 'Trial verified successfully.',
            skipOtp: true,
            deviceToken,
            memberName: enquiry.firstName
        });

    } catch (error) {
        console.error('Identify Trial error:', error);

        res.status(500).json({
            message: 'Server Error'
        });
    }
};



// @desc    Trial Self Check-in
// @route   POST /api/trial-attendance/self-checkin
// @access  Public
exports.selfCheckInTrial = async (req, res) => {
    try {
        const { gymId, deviceToken, latitude, longitude } = req.body;

        if (
            !gymId ||
            !deviceToken ||
            latitude === undefined ||
            longitude === undefined
        ) {
            return res.status(400).json({ message: 'Gym ID, Device Token, and Location are required' });
        }

        const lat = Number(latitude);
        const lng = Number(longitude);

        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng) ||
            lat < -90 ||
            lat > 90 ||
            lng < -180 ||
            lng > 180
        ) {
            return res.status(400).json({ message: 'Invalid location coordinates.' });
        }

        const gym = await Gym.findById(gymId);
        if (!gym) return res.status(404).json({ message: 'Gym not found' });
        if (!gym.qrAttendanceEnabled) return res.status(400).json({ message: 'QR Attendance is not enabled' });

        const distance = getDistance(lat, lng, gym.latitude, gym.longitude);
        if (distance > gym.qrAttendanceRange) {
            return res.status(400).json({ 
                message: `Out of range. You must be physically present at the gym.`,
                distance: Math.round(distance)
            });
        }

        const device = await TrialDevice.findOne({ deviceToken, gymId }).populate('enquiryId');
        if (!device) {
            return res.status(401).json({ message: 'Invalid token', requiresReauth: true });
        }

        // Check if the device token has expired
        if (device.expiresAt && new Date() > device.expiresAt) {
             return res.status(401).json({ message: 'Trial period has expired', requiresReauth: true });
        }

        const enquiry = device.enquiryId;
        if (!enquiry) return res.status(404).json({ message: 'No trial person found for this device.' });

        const now = new Date();

        const trialStart = enquiry.trialDate
            ? new Date(enquiry.trialDate)
            : null;

        const trialEnd = enquiry.trialEndDate
            ? new Date(enquiry.trialEndDate)
            : null;

        if (trialStart) {
            trialStart.setHours(0, 0, 0, 0);
        }

        if (trialEnd) {
            trialEnd.setHours(23, 59, 59, 999);
        }

        const isValidTrial =
            trialStart &&
            trialEnd &&
            now >= trialStart &&
            now <= trialEnd;

        if (!isValidTrial) {
            return res.status(400).json({ message: 'Active trial period has expired. Attendance cannot be marked.' });
        }

        device.lastLoginAt = new Date();
        await device.save();

        const recordDate = new Date();
        recordDate.setHours(0, 0, 0, 0);

        let attendance = await Attendance.findOne({
            userId: enquiry._id,
            gymId: gymId,
            date: recordDate
        });

        if (attendance) {
            if (!attendance.checkOutTime) {
                const diffMins = Math.round((new Date() - new Date(attendance.checkInTime)) / 60000);
                if (diffMins < 5) {
                    return res.status(400).json({ message: 'You just checked in! Please wait at least 5 minutes before checking out.' });
                }

                attendance.checkOutTime = new Date();
                await attendance.save();
                return res.json({ message: 'Checked out successfully!', type: 'checkout', memberName: enquiry.firstName });
            } else {
                return res.status(400).json({ message: 'You have already completed your attendance for today.' });
            }
        } else {
            await Attendance.create({
                userId: enquiry._id,
                gymId: gymId,
                date: recordDate,
                checkInTime: new Date(),
                status: 'Present',
                source: 'QR',
                attendanceType: 'Trial',
                location: { latitude: lat, longitude: lng }
            });
            return res.status(201).json({ message: 'Checked in successfully!', type: 'checkin', memberName: enquiry.firstName });
        }
    } catch (error) {
        console.error("Trial Checkin error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get Trial Check-in Status
// @route   GET /api/trial-attendance/status/:gymId/:deviceToken
// @access  Public
exports.getTrialCheckInStatus = async (req, res) => {
    try {
        const { gymId, deviceToken } = req.params;

        const device = await TrialDevice.findOne({ deviceToken, gymId }).populate('enquiryId');
        if (!device) {
            return res.status(401).json({ message: 'Invalid token', requiresReauth: true });
        }

        const enquiry = device.enquiryId;
        if (!enquiry) {
            return res.status(404).json({ message: 'No trial person found.', requiresReauth: true });
        }

        if (device.expiresAt && device.expiresAt < new Date()) {
            return res.status(401).json({
                message: 'Trial period has expired.',
                requiresReauth: true
            });
        }

        const now = new Date();
        const trialStart = enquiry.trialDate ? new Date(enquiry.trialDate) : null;
        const trialEnd = enquiry.trialEndDate ? new Date(enquiry.trialEndDate) : null;

        if (trialStart) trialStart.setHours(0, 0, 0, 0);
        if (trialEnd) trialEnd.setHours(23, 59, 59, 999);

        const isValidTrial = trialStart && trialEnd && now >= trialStart && now <= trialEnd;

        if (!isValidTrial) {
            return res.status(403).json({ message: 'Your trial period is not active.', requiresReauth: true });
        }

        const recordDate = new Date();
        recordDate.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({
            userId: enquiry._id,
            gymId: gymId,
            date: recordDate
        });

        let status = 'none';
        if (attendance) {
            if (attendance.checkOutTime) {
                status = 'checked_out';
            } else if (attendance.checkInTime) {
                status = 'checked_in';
            }
        }

        res.json({ status, memberName: enquiry.firstName });
    } catch (error) {
        console.error("Get trial status error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
