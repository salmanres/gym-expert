const Attendance = require('../models/Attendance');
const Gym = require('../models/Gym');
const User = require('../models/User');
const Member = require('../models/Member');
const MemberDevice = require('../models/MemberDevice');
const MemberMembership = require('../models/MemberMembership');
const Enquiry = require('../models/Enquiry');
const crypto = require('crypto');

// Helper to calculate distance using Haversine formula (returns distance in meters)
const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const toRadians = (degree) => degree * Math.PI / 180;
    
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

// @desc    Mark Attendance (Manual, QR, Biometric)
// @route   POST /api/attendance/mark
// @access  Private
exports.markAttendance = async (req, res) => {
    try {
        const { userId, source, latitude, longitude, status, notes } = req.body;
        
        let targetUserId = userId || req.user._id; 
        
        // Find member to get gymId
        const targetUser = await Member.findById(targetUserId);
        if (!targetUser || !targetUser.gymId) {
            return res.status(404).json({ message: 'Member or gym association not found' });
        }
        if (targetUser.status === 'Frozen') {
            return res.status(403).json({ message: 'Member is currently Frozen. Attendance cannot be marked.' });
        }
        if (targetUser.status !== 'Active') {
            return res.status(403).json({ message: 'Member is not Active. Attendance cannot be marked.' });
        }

        const gymId = targetUser.gymId;

        // Check if member has an active membership
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        
        const activeMembership = await MemberMembership.findOne({
            memberId: targetUserId,
            membershipStatus: 'Active',
            endDate: { $gte: currentDate }
        });

        if (!activeMembership) {
            // Check if member is on a valid trial period
            let isValidTrial = false;
            if (targetUser.enquiryId) {
                const enquiry = await Enquiry.findById(targetUser.enquiryId);
                if (enquiry && enquiry.trialEndDate) {
                    const trialEndDate = new Date(enquiry.trialEndDate);
                    trialEndDate.setHours(23, 59, 59, 999);
                    if (currentDate <= trialEndDate) {
                        isValidTrial = true;
                    }
                }
            }

            if (!isValidTrial) {
                return res.status(400).json({ message: 'No valid membership plan or active trial found. Attendance cannot be marked.' });
            }
        }

        // If QR source, validate location
        if (source === 'QR') {
            const gym = await Gym.findById(gymId);
            if (!gym.qrAttendanceEnabled) {
                return res.status(400).json({ message: 'QR Attendance is disabled for this gym' });
            }
            if (!latitude || !longitude) {
                return res.status(400).json({ message: 'Location data is required for QR attendance' });
            }
            
            const distance = getDistance(latitude, longitude, gym.latitude, gym.longitude);
            if (distance > gym.qrAttendanceRange) {
                return res.status(400).json({ 
                    message: 'Out of range. You must be physically at the gym to mark attendance.',
                    distance: Math.round(distance)
                });
            }
        }

        // Check if attendance already exists for the given date (default today)
        let recordDate = new Date();
        if (req.body.date) {
            recordDate = new Date(req.body.date);
        }
        recordDate.setHours(0, 0, 0, 0);

        let attendance = await Attendance.findOne({
            userId: targetUserId,
            date: recordDate
        });

        if (attendance) {
            // If the request specifically wants to update the status (Manual override)
            if (source === 'Manual' && status) {
                attendance.status = status;
                if (status === 'Absent') {
                    attendance.checkInTime = null;
                    attendance.checkOutTime = null;
                } else if (!attendance.checkInTime && status !== 'Absent') {
                    attendance.checkInTime = new Date();
                }
                await attendance.save();
                return res.json({ message: 'Attendance status updated successfully', attendance });
            }

            // Standard check-out flow (QR/Biometric or normal manual check-out)
            if (!attendance.checkOutTime && attendance.status !== 'Absent') {
                attendance.checkOutTime = new Date();
                await attendance.save();
                return res.json({ message: 'Check-out marked successfully', attendance });
            } else {
                return res.status(400).json({ message: 'Attendance already completed for today' });
            }
        } else {
            // Check in / Create new record
            attendance = await Attendance.create({
                userId: targetUserId,
                gymId: gymId,
                date: recordDate,
                checkInTime: status !== 'Absent' ? new Date() : null,
                status: status || 'Present',
                source: source || 'Manual',
                location: latitude ? { latitude, longitude } : undefined,
                notes: notes,
                markedBy: req.user._id
            });
            return res.status(201).json({ message: 'Attendance marked successfully', attendance });
        }

    } catch (error) {
        console.error("Mark attendance error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get Gym Attendance (For Owner/Admin)
// @route   GET /api/attendance
// @access  Private (Gym Owner/Admin)
exports.getGymAttendance = async (req, res) => {
    try {
        const { date } = req.query;
        let query = { gymId: req.user.gymId };
        
        if (date) {
            const queryDate = new Date(date);
            queryDate.setHours(0, 0, 0, 0);
            query.date = queryDate;
        }

        const records = await Attendance.find(query)
            .populate('userId', 'name email phone role profilePhoto')
            .populate('markedBy', 'name')
            .sort({ createdAt: -1 });

        res.json(records);
    } catch (error) {
        console.error("Get attendance error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get My Attendance (For Member/Staff)
// @route   GET /api/attendance/my
// @access  Private
exports.getMyAttendance = async (req, res) => {
    try {
        const records = await Attendance.find({ userId: req.user._id })
            .sort({ date: -1 });
        res.json(records);
    } catch (error) {
        console.error("Get my attendance error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get Daily Attendance Sheet (All members with their status)
// @route   GET /api/attendance/daily-sheet
// @access  Private (Gym Owner/Admin)
exports.getDailySheet = async (req, res) => {
    try {
        const { date } = req.query;
        const queryDate = date ? new Date(date) : new Date();
        queryDate.setHours(0, 0, 0, 0);

        const members = await Member.find({ 
            gymId: req.user.gymId
        }).select('firstName lastName contactNumber profilePhoto status');

        const attendanceRecords = await Attendance.find({
            gymId: req.user.gymId,
            date: queryDate
        });

        const sheet = members.map(member => {
            const record = attendanceRecords.find(a => a.userId.toString() === member._id.toString());
            return {
                user: {
                    _id: member._id,
                    name: `${member.firstName} ${member.lastName || ''}`.trim(),
                    phone: member.contactNumber,
                    profilePhoto: member.profilePhoto,
                    status: member.status
                },
                attendance: record || null
            };
        });

        res.json(sheet);
    } catch (error) {
        console.error("Get daily sheet error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get Self Check-in Status
// @route   GET /api/attendance/status/:gymId/:deviceToken
// @access  Public
exports.getCheckInStatus = async (req, res) => {
    try {
        const { gymId, deviceToken } = req.params;

        if (!gymId || !deviceToken) {
            return res.status(400).json({ message: 'Gym ID and Device Token are required' });
        }

        const device = await MemberDevice.findOne({ deviceToken, gymId }).populate('memberId');
        if (!device) {
            return res.status(401).json({ message: 'Invalid token', requiresReauth: true });
        }

        const member = device.memberId;
        if (!member) {
            return res.status(404).json({ message: 'No active member found for this device.', requiresReauth: true });
        }

        const recordDate = new Date();
        recordDate.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({
            userId: member._id,
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

        res.json({ status, memberName: member.firstName });
    } catch (error) {
        console.error("Get check-in status error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Self Check-in (Public endpoint for Members scanning Gym QR)
// @route   POST /api/attendance/self-checkin
// @access  Public
exports.selfCheckIn = async (req, res) => {
    try {
        const { gymId, deviceToken, fingerprint, latitude, longitude } = req.body;

        if (!gymId || !deviceToken || !latitude || !longitude) {
            return res.status(400).json({ message: 'Gym ID, Device Token, and Location are required' });
        }

        // 1. Validate Gym
        const gym = await Gym.findById(gymId);
        if (!gym) {
            return res.status(404).json({ message: 'Gym not found' });
        }


        if (!gym.qrAttendanceEnabled) {
            return res.status(400).json({ message: 'QR Attendance is not enabled for this gym' });
        }

        // 2. Validate Location (Distance Check)
        const distance = getDistance(latitude, longitude, gym.latitude, gym.longitude);
        if (distance > gym.qrAttendanceRange) {
            return res.status(400).json({ 
                message: `Out of range. You must be physically present at the gym to check in. Distance: ${Math.round(distance)}m (Allowed: ${gym.qrAttendanceRange}m)`,
                distance: Math.round(distance)
            });
        }

        // 3. Find Device Token
        const device = await MemberDevice.findOne({ deviceToken, gymId }).populate('memberId');
        if (!device) {
            return res.status(401).json({ message: 'Invalid or expired device token. Please verify OTP again.', requiresReauth: true });
        }

        const member = device.memberId;
        if (!member) {
            return res.status(404).json({ message: 'No member found for this device.' });
        }
        if (member.status === 'Frozen') {
            return res.status(403).json({ message: 'Your membership is currently Frozen. Attendance cannot be marked.' });
        }
        if (member.status !== 'Active') {
            return res.status(404).json({ message: 'No active member found for this device.' });
        }

        // Update last login
        device.lastLoginAt = new Date();
        await device.save();

        // 3.5 Check if member has an active membership
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        
        const activeMembership = await MemberMembership.findOne({
            memberId: member._id,
            membershipStatus: 'Active',
            endDate: { $gte: currentDate }
        });

        if (!activeMembership) {
            // Check if member is on a valid trial period
            let isValidTrial = false;
            if (member.enquiryId) {
                const enquiry = await Enquiry.findById(member.enquiryId);
                if (enquiry && enquiry.trialEndDate) {
                    const trialEndDate = new Date(enquiry.trialEndDate);
                    trialEndDate.setHours(23, 59, 59, 999);
                    if (currentDate <= trialEndDate) {
                        isValidTrial = true;
                    }
                }
            }

            if (!isValidTrial) {
                return res.status(400).json({ message: 'No valid membership plan or active trial found. Attendance cannot be marked.' });
            }
        }

        // 4. Mark Attendance
        const recordDate = new Date();
        recordDate.setHours(0, 0, 0, 0);

        let attendance = await Attendance.findOne({
            userId: member._id,
            date: recordDate
        });

        if (attendance) {
            if (!attendance.checkOutTime) {
                // If it's been less than 5 minutes since check-in, prevent checkout to stop accidental double-taps
                const diffMins = Math.round((new Date() - new Date(attendance.checkInTime)) / 60000);
                if (diffMins < 5) {
                    return res.status(400).json({ message: 'You just checked in! Please wait at least 5 minutes before checking out.' });
                }

                attendance.checkOutTime = new Date();
                await attendance.save();
                return res.json({ message: 'Checked out successfully!', type: 'checkout', memberName: member.firstName });
            } else {
                return res.status(400).json({ message: 'You have already completed your attendance for today.' });
            }
        } else {
            // New Check In
            await Attendance.create({
                userId: member._id,
                gymId: gymId,
                date: recordDate,
                checkInTime: new Date(),
                status: 'Present',
                source: 'QR',
                location: { latitude, longitude }
            });
            return res.status(201).json({ message: 'Checked in successfully!', type: 'checkin', memberName: member.firstName });
        }
    } catch (error) {
        console.error("Self Checkin error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Request OTP for Self Check-in
// @route   POST /api/attendance/request-otp
// @access  Public
exports.requestOTP = async (req, res) => {
    try {
        const { gymId, phone } = req.body;
        
        if (!gymId || !phone) {
            return res.status(400).json({ message: 'Gym ID and Phone number are required' });
        }

        const member = await Member.findOne({ gymId, contactNumber: phone });
        if (!member) {
            return res.status(404).json({ message: 'No member found with this phone number.' });
        }

        if (member.status === 'Frozen') {
            return res.status(403).json({ message: 'Your membership is frozen. OTP cannot be generated.' });
        }

        if (member.status !== 'Active') {
            return res.status(403).json({ message: 'Your account is not active.' });
        }

        // Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        member.otp = otp;
        member.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
        await member.save();

        // In a real app, send OTP via SMS here
        console.log(`[OTP] Generated for ${member.firstName} (${phone}): ${otp}`);

        res.json({ message: 'OTP sent successfully', mockOtp: otp }); // mockOtp sent for testing/demo purposes
    } catch (error) {
        console.error("Request OTP error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Verify OTP and generate Device Token
// @route   POST /api/attendance/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
    try {
        const { gymId, phone, otp, browserFingerprint } = req.body;
        
        if (!gymId || !phone || !otp) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const member = await Member.findOne({ gymId, contactNumber: phone });
        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }

        if (member.status === 'Frozen') {
            return res.status(403).json({ message: 'Your membership is frozen.' });
        }

        if (member.status !== 'Active') {
            return res.status(403).json({ message: 'Your account is not active.' });
        }

        if (member.otp !== otp || !member.otpExpiry || member.otpExpiry < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        // Clear OTP
        member.otp = undefined;
        member.otpExpiry = undefined;
        await member.save();

        // Generate Device Token
        const deviceToken = crypto.randomBytes(32).toString('hex');

        await MemberDevice.create({
            memberId: member._id,
            gymId: gymId,
            deviceToken,
            browserFingerprint: browserFingerprint || 'unknown'
        });

        res.json({ 
            message: 'OTP verified successfully',
            deviceToken,
            memberName: member.firstName
        });
    } catch (error) {
        console.error("Verify OTP error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};
