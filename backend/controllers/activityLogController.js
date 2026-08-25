const ActivityLog = require('../models/ActivityLog');
const Enquiry = require('../models/Enquiry');
const Attendance = require('../models/Attendance');
const MemberMembership = require('../models/MemberMembership');
const Member = require('../models/Member');
const User = require('../models/User');

// Utility to log activity
exports.logActivity = async ({ gymId, title, description, type, targetId, link }) => {
    try {
        if (!gymId) return;
        await ActivityLog.create({
            gymId,
            title,
            description,
            type: type || 'SYSTEM',
            targetId: targetId || null,
            link: link || ''
        });
    } catch (err) {
        console.error("Error creating activity log:", err);
    }
};

// Get 30-Day Activity Logs (Combines database ActivityLogs with real-time dynamic events)
exports.getActivityLogs = async (req, res) => {
    try {
        const gymId = req.user?.gymId || req.user?.gym?._id;
        if (!gymId) {
            return res.status(400).json({ message: 'Gym ID not found' });
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 1. Fetch saved ActivityLog items from last 30 days
        const savedLogs = await ActivityLog.find({ 
            gymId,
            createdAt: { $gte: thirtyDaysAgo }
        })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        // 2. Fetch recent Enquiries from last 30 days
        const recentEnquiries = await Enquiry.find({ 
            gymId,
            updatedAt: { $gte: thirtyDaysAgo }
        })
            .sort({ updatedAt: -1 })
            .limit(20)
            .lean();

        // 3. Fetch recent Attendance from last 30 days
        const recentAttendance = await Attendance.find({ 
            gymId,
            createdAt: { $gte: thirtyDaysAgo }
        })
            .sort({ checkInTime: -1, createdAt: -1 })
            .limit(30)
            .lean();

        // Populate attendance user names dynamically from Member / User / Enquiry collections
        const attUserIds = recentAttendance.map(att => att.userId).filter(Boolean);
        const [membersList, usersList, enquiriesList] = await Promise.all([
            Member.find({ _id: { $in: attUserIds } }).select('firstName lastName memberId').lean(),
            User.find({ _id: { $in: attUserIds } }).select('name firstName lastName role').lean(),
            Enquiry.find({ _id: { $in: attUserIds } }).select('firstName lastName').lean()
        ]);

        const personMap = {};
        membersList.forEach(m => {
            personMap[m._id.toString()] = {
                name: `${m.firstName} ${m.lastName || ''}`.trim(),
                code: m.memberId ? `#${m.memberId}` : '',
                roleType: 'Member'
            };
        });
        usersList.forEach(u => {
            personMap[u._id.toString()] = {
                name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
                code: u.role ? u.role.replace('_', ' ') : 'Staff',
                roleType: 'Staff'
            };
        });
        enquiriesList.forEach(e => {
            personMap[e._id.toString()] = {
                name: `${e.firstName} ${e.lastName || ''}`.trim(),
                code: 'Trial',
                roleType: 'Trial'
            };
        });

        // 4. Fetch recent Memberships / Payments from last 30 days
        const recentMemberships = await MemberMembership.find({ 
            gymId,
            createdAt: { $gte: thirtyDaysAgo }
        })
            .sort({ createdAt: -1 })
            .limit(20)
            .populate({ path: 'memberId', select: 'firstName lastName memberId', strictPopulate: false })
            .populate({ path: 'membershipPlanId', select: 'name', strictPopulate: false })
            .lean();

        // Synthesize dynamic activity items
        const dynamicLogs = [];

        // Synthesize Attendance with Exact Member / Staff / Trial Labels
        recentAttendance.forEach(att => {
            if (att.checkInTime) {
                const uIdStr = att.userId ? att.userId.toString() : '';
                const person = personMap[uIdStr] || { name: 'Person', code: '', roleType: 'Member' };
                const codeSuffix = person.code ? ` (${person.code})` : '';

                // Determine exact title based on type (Staff vs Trial vs Member)
                const categoryType = att.attendanceType === 'Trial' 
                    ? 'Trial' 
                    : (person.roleType === 'Staff' || att.attendanceType === 'Staff' ? 'Staff' : 'Member');

                const action = att.checkOutTime ? 'Checked Out' : 'Checked In';
                const dynamicTitle = `${categoryType} ${action}`;

                dynamicLogs.push({
                    _id: `att_${att._id}`,
                    gymId,
                    title: dynamicTitle,
                    description: `${person.name}${codeSuffix} marked attendance at ${new Date(att.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                    type: 'ATTENDANCE',
                    targetId: att._id,
                    link: '/dashboard/owner/attendance',
                    isRead: false,
                    createdAt: att.checkInTime || att.createdAt
                });
            }
        });

        // Synthesize Enquiries
        recentEnquiries.forEach(enq => {
            dynamicLogs.push({
                _id: `enq_${enq._id}`,
                gymId,
                title: enq.status === 'Trial' ? 'New Trial Registered' : `Lead ${enq.status || 'Updated'}`,
                description: `${enq.firstName} ${enq.lastName || ''} — Status: ${enq.status} (Source: ${enq.source || 'Walk-in'})`,
                type: 'LEAD',
                targetId: enq._id,
                link: '/dashboard/owner/leads',
                isRead: false,
                createdAt: enq.updatedAt || enq.createdAt
            });
        });

        // Synthesize Memberships
        recentMemberships.forEach(mm => {
            const mName = mm.memberId?.firstName ? `${mm.memberId.firstName} ${mm.memberId.lastName || ''}`.trim() : 'Member';
            const planName = mm.membershipPlanId?.name || 'Membership Plan';
            dynamicLogs.push({
                _id: `mem_${mm._id}`,
                gymId,
                title: 'Membership Payment & Plan Assigned',
                description: `${mName} subscribed to ${planName} — Paid: ₹${mm.paidAmount || 0}`,
                type: 'MEMBERSHIP',
                targetId: mm._id,
                link: '/dashboard/owner/membership',
                isRead: false,
                createdAt: mm.createdAt
            });
        });

        // Merge saved and dynamic logs, deduplicating if needed
        const combined = [...savedLogs];
        const existingIds = new Set(savedLogs.map(l => l.targetId?.toString()));

        dynamicLogs.forEach(dLog => {
            if (!existingIds.has(dLog.targetId?.toString())) {
                combined.push(dLog);
            }
        });

        // Sort by newest first
        combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const unreadCount = combined.filter(l => !l.isRead).length;

        res.json({
            logs: combined,
            unreadCount
        });
    } catch (error) {
        console.error("Error fetching activity logs:", error);
        res.status(500).json({ message: "Failed to fetch activity logs" });
    }
};

// Mark log as read
exports.markAsRead = async (req, res) => {
    try {
        const gymId = req.user?.gymId || req.user?.gym?._id;
        const { logId } = req.params;

        if (logId === 'all') {
            await ActivityLog.updateMany({ gymId }, { isRead: true });
        } else if (logId && !logId.startsWith('att_') && !logId.startsWith('enq_') && !logId.startsWith('mem_')) {
            await ActivityLog.findByIdAndUpdate(logId, { isRead: true });
        }

        res.json({ message: "Log marked as read" });
    } catch (error) {
        res.status(500).json({ message: "Error updating log status" });
    }
};

// Clear all activity logs
exports.clearActivityLogs = async (req, res) => {
    try {
        const gymId = req.user?.gymId || req.user?.gym?._id;
        await ActivityLog.deleteMany({ gymId });
        res.json({ message: "Activity logs cleared" });
    } catch (error) {
        res.status(500).json({ message: "Failed to clear logs" });
    }
};
