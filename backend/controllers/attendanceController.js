const Attendance = require('../models/Attendance');
const Gym = require('../models/Gym');
const User = require('../models/User');
const Member = require('../models/Member');
const MemberDevice = require('../models/MemberDevice');
const MemberMembership = require('../models/MemberMembership');
const Enquiry = require('../models/Enquiry');
const crypto = require('crypto');
const { notifyGym } = require('../socket');

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

// Helper to check if gym is closed based on weekly off or holidays
const isGymClosed = (gym, date) => {
    if (!gym) return { closed: false };
    
    // Check weekly off
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[date.getDay()];
    
    if (gym.weeklyOff && gym.weeklyOff.includes(dayName)) {
        return { closed: true, reason: 'Weekly Off (' + dayName + ')' };
    }

    // Check holidays
    if (gym.holidays && gym.holidays.length > 0) {
        // We compare in local time / YYYY-MM-DD
        const d = new Date(date);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        const holiday = gym.holidays.find(h => {
            if (!h.date) return false;
            const hd = new Date(h.date);
            const hdStr = `${hd.getFullYear()}-${String(hd.getMonth() + 1).padStart(2, '0')}-${String(hd.getDate()).padStart(2, '0')}`;
            return hdStr === dateStr;
        });

        if (holiday) {
            return { closed: true, reason: holiday.reason || 'Public Holiday' };
        }
    }

    return { closed: false };
};

// Helper: Auto check-out any active check-in older than 3 hours (180 minutes)
const autoCheckoutOverdueAttendance = async (gymId = null) => {
    try {
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
        const query = {
            checkInTime: { $ne: null, $lte: threeHoursAgo },
            checkOutTime: null,
            status: { $ne: 'Absent' }
        };
        if (gymId) query.gymId = gymId;

        const overdueRecords = await Attendance.find(query);
        for (const record of overdueRecords) {
            if (record.checkInTime) {
                record.checkOutTime = new Date(new Date(record.checkInTime).getTime() + 3 * 60 * 60 * 1000);
                if (!record.notes || !record.notes.includes('Auto checked-out')) {
                    record.notes = (record.notes ? record.notes + ' | ' : '') + 'Auto checked-out after 3 hours';
                }
                await record.save();
            }
        }
    } catch (err) {
        console.error("Auto checkout error:", err);
    }
};

exports.autoCheckoutOverdueAttendance = autoCheckoutOverdueAttendance;

// @desc    Mark Attendance (Manual, QR, Biometric)
// @route   POST /api/attendance/mark
// @access  Private
exports.markAttendance = async (req, res) => {
    try {
        await autoCheckoutOverdueAttendance(req.user?.gymId);
        const { userId, source, latitude, longitude, status, notes } = req.body;
        
        let targetUserId = userId || req.user._id; 
        
        let targetUser = await Member.findById(targetUserId);
        let isStaff = false;
        let isTrial = false;
        let attendanceType = 'Member';
        
        if (!targetUser) {
            targetUser = await User.findById(targetUserId);
            if (targetUser) {
                isStaff = true;
            } else {
                targetUser = await Enquiry.findById(targetUserId);
                if (targetUser) {
                    isTrial = true;
                    attendanceType = 'Trial';
                }
            }
        }

        if (!targetUser || !targetUser.gymId) {
            return res.status(404).json({ message: 'Member/Staff/Trial or gym association not found' });
        }
        if (targetUser.status === 'Frozen') {
            return res.status(403).json({ message: 'User is currently Frozen. Attendance cannot be marked.' });
        }
        if (!isTrial && targetUser.status !== 'Active') {
            return res.status(403).json({ message: 'User is not Active. Attendance cannot be marked.' });
        }

        const gymId = targetUser.gymId;
        const gym = await Gym.findById(gymId);
        if (!gym) {
            return res.status(404).json({ message: 'Gym not found' });
        }

        let activeMembership = null;
        if (status !== 'Absent' && status !== 'Clear' && status !== null && !isStaff && !isTrial) {
            // Check if member has an active membership
            const currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0);
            
            activeMembership = await MemberMembership.findOne({
                memberId: targetUserId,
                membershipStatus: 'Active',
                startDate: { $lte: currentDate },
                endDate: { $gte: currentDate },
                $or: [
                    { paidUntilDate: null },
                    { paidUntilDate: { $gte: currentDate } }
                ],
                $or: [
                    { totalSessions: 0 },
                    { $expr: { $lt: ["$usedSessions", "$totalSessions"] } }
                ]
            });

            if (!activeMembership) {
                // Check if member is on a valid trial period
                let isValidTrial = false;
                if (targetUser.enquiryId) {
                    const enquiry = await Enquiry.findById(targetUser.enquiryId);
                    if (enquiry) {
                        const now = new Date();
                        const startDate = enquiry.trialDate ? new Date(enquiry.trialDate) : null;
                        const endDate = enquiry.trialEndDate ? new Date(enquiry.trialEndDate) : startDate;
                        
                        if (startDate) startDate.setHours(0,0,0,0);
                        if (endDate) endDate.setHours(23,59,59,999);

                        if (startDate && endDate && now >= startDate && now <= endDate) {
                            isValidTrial = true;
                        } else if (enquiry.status === 'Trial') {
                            isValidTrial = true;
                        }
                    }
                }

                if (!isValidTrial) {
                    return res.status(400).json({ message: 'No valid membership plan or active trial found. Attendance cannot be marked.' });
                }
            }
        }

        // If QR source, validate location
        if (source === 'QR') {
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

        // --- Weekly Off & Holiday Validation ---
        // Only block if marking 'Present' or creating a new record via QR/Biometric
        if (status !== 'Absent') {
            const closedCheck = isGymClosed(gym, recordDate);
            if (closedCheck.closed) {
                // Allow manual override for specific edge cases only if it's source Manual
                if (source !== 'Manual') {
                    return res.status(403).json({ 
                        message: `Gym is closed today due to ${closedCheck.reason}. Attendance cannot be marked.` 
                    });
                }
            }
        }

        let attendance = await Attendance.findOne({
            userId: targetUserId,
            gymId: gymId,
            date: recordDate
        });

        if (attendance) {
            // If the request specifically wants to update the status (Manual override)
            if (source === 'Manual' && status) {
                if (status === 'Clear') {
                    await attendance.deleteOne();
                    return res.json({ message: 'Attendance cleared successfully', attendance: null });
                }
                
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
            if (source === 'Manual' && status === 'Clear') {
                return res.json({ message: 'Attendance already cleared', attendance: null });
            }
            // Check in / Create new record
            attendance = await Attendance.create({
                userId: targetUserId,
                gymId: gymId,
                date: recordDate,
                checkInTime: status !== 'Absent' ? new Date() : null,
                status: status || 'Present',
                source: source || 'Manual',
                attendanceType: attendanceType,
                location: latitude ? { latitude, longitude } : undefined,
                notes: notes,
                markedBy: req.user._id
            });

            const titleRole = attendanceType === 'Trial' 
                ? 'Trial' 
                : (attendanceType === 'Staff' || targetUser?.role ? 'Staff' : 'Member');

            notifyGym(gymId, {
                title: `${titleRole} Checked In`,
                description: `${targetUser.name || `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() || 'Person'} marked attendance via ${source || 'Manual'}`,
                type: 'ATTENDANCE',
                targetId: attendance._id,
                link: '/dashboard/owner/attendance'
            });
            
            if (attendanceType === 'Member' && activeMembership) {
                await MemberMembership.findOneAndUpdate(
                    {
                        _id: activeMembership._id,
                        $or: [
                            { totalSessions: 0 },
                            { usedSessions: { $lt: activeMembership.totalSessions } }
                        ]
                    },
                    { $inc: { usedSessions: 1 } }
                );
            }

            return res.status(201).json({ message: 'Attendance marked successfully', attendance });
        }

    } catch (error) {
        console.error("Mark attendance error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getGymAttendance = async (req, res) => {
    try {
        await autoCheckoutOverdueAttendance(req.user?.gymId);
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

// @desc    Get User Attendance History
// @route   GET /api/attendance/history/:userId
// @access  Private (Owner/Admin)
exports.getUserAttendanceHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate } = req.query;

        let query = { userId, gymId: req.user.gymId };

        if (startDate || endDate) {
            query.date = {};
            if (startDate) {
                const sDate = new Date(startDate);
                sDate.setHours(0, 0, 0, 0);
                query.date.$gte = sDate;
            }
            if (endDate) {
                const eDate = new Date(endDate);
                eDate.setHours(23, 59, 59, 999);
                query.date.$lte = eDate;
            }
        }

        const records = await Attendance.find(query)
            .sort({ date: -1 });
        
        res.json(records);
    } catch (error) {
        console.error("Get user attendance history error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get Daily Attendance Sheet (All members/staff with their status)
// @route   GET /api/attendance/daily-sheet
// @access  Private (Gym Owner/Admin)
exports.getDailySheet = async (req, res) => {
    try {
        const { date, type = 'members' } = req.query;
        const queryDate = date ? new Date(date) : new Date();
        queryDate.setHours(0, 0, 0, 0);

        const gym = await Gym.findById(req.user.gymId);
        const closedCheck = isGymClosed(gym, queryDate);

        let users = [];
        if (type === 'staff') {
            const staffMembers = await User.find({ 
                gymId: req.user.gymId,
                role: { $in: ['STAFF', 'TRAINER', 'BRANCH_MANAGER', 'ADMIN'] }
            }).select('name phone profilePhoto status');
            
            users = staffMembers.map(u => ({
                _id: u._id,
                name: u.name,
                phone: u.phone,
                profilePhoto: u.profilePhoto,
                status: u.status
            }));
        } else if (type === 'trial') {
            // Show enquiries that are actively on trial during the queryDate
            // OR have an attendance record on the queryDate
            const queryDateEnd = new Date(queryDate);
            queryDateEnd.setHours(23, 59, 59, 999);

            const enquiries = await Enquiry.find({ 
                gymId: req.user.gymId,
                trialDate: { $lte: queryDateEnd },
                trialEndDate: { $gte: queryDate }
            }).select('firstName lastName contactNumber status');
            
            users = enquiries.map(e => ({
                _id: e._id,
                name: `${e.firstName} ${e.lastName || ''}`.trim(),
                phone: e.contactNumber,
                profilePhoto: null,
                status: e.status
            }));
        } else {
            const members = await Member.find({ 
                gymId: req.user.gymId
            }).select('firstName lastName contactNumber profilePhoto status');
            
            users = members.map(m => ({
                _id: m._id,
                name: `${m.firstName} ${m.lastName || ''}`.trim(),
                phone: m.contactNumber,
                profilePhoto: m.profilePhoto,
                status: m.status
            }));
        }

        const attendanceRecords = await Attendance.find({
            gymId: req.user.gymId,
            date: queryDate
        });

        const sheet = users.map(user => {
            const record = attendanceRecords.find(a => a.userId.toString() === user._id.toString());
            return {
                user: user,
                attendance: record || null
            };
        });

        res.json({
            sheet,
            isClosed: closedCheck.closed,
            closedReason: closedCheck.reason
        });
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

        await autoCheckoutOverdueAttendance(gymId);

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
        const { gymId, deviceToken, latitude, longitude } = req.body;

        if (!gymId || !deviceToken || !latitude || !longitude) {
            return res.status(400).json({ message: 'Gym ID, Device Token, and Location are required' });
        }

        await autoCheckoutOverdueAttendance(gymId);

        // 1. Validate Gym
        const gym = await Gym.findById(gymId);
        if (!gym) {
            return res.status(404).json({ message: 'Gym not found' });
        }

        if (!gym.qrAttendanceEnabled) {
            return res.status(400).json({ message: 'QR Attendance is not enabled for this gym' });
        }

        // --- Weekly Off & Holiday Validation ---
        const closedCheck = isGymClosed(gym, new Date());
        if (closedCheck.closed) {
            return res.status(403).json({ 
                message: `Gym is closed today due to ${closedCheck.reason}. Check-in not allowed.` 
            });
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
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate },
            $or: [
                { paidUntilDate: null },
                { paidUntilDate: { $gte: currentDate } }
            ],
            $or: [
                { totalSessions: 0 },
                { $expr: { $lt: ["$usedSessions", "$totalSessions"] } }
            ]
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
            gymId: gymId,
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

            if (activeMembership) {
                await MemberMembership.findOneAndUpdate(
                    {
                        _id: activeMembership._id,
                        $or: [
                            { totalSessions: 0 },
                            { usedSessions: { $lt: activeMembership.totalSessions } }
                        ]
                    },
                    { $inc: { usedSessions: 1 } }
                );
            }

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
        const { gymId, phone, otp } = req.body;
        
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
            deviceToken
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
