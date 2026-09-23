const ActivityLog = require('../models/ActivityLog');
const Enquiry = require('../models/Enquiry');
const Attendance = require('../models/Attendance');
const MemberMembership = require('../models/MemberMembership');
const Member = require('../models/Member');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

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

        // Parallel Fetch for complete 30-day activity aggregation
        const [
            savedLogs,
            recentMembers,
            recentEnquiries,
            recentAttendance,
            recentMemberships,
            recentTransactions,
            recentStaff
        ] = await Promise.all([
            // 1. Fetch saved ActivityLog items from last 30 days
            ActivityLog.find({ 
                gymId,
                createdAt: { $gte: thirtyDaysAgo }
            }).sort({ createdAt: -1 }).limit(300).lean(),

            // 2. Fetch recent Member registrations / updates
            Member.find({
                gymId,
                createdAt: { $gte: thirtyDaysAgo }
            }).sort({ createdAt: -1 }).limit(30).lean(),

            // 3. Fetch recent Enquiries / Leads
            Enquiry.find({ 
                gymId,
                updatedAt: { $gte: thirtyDaysAgo }
            }).sort({ updatedAt: -1 }).limit(30).lean(),

            // 4. Fetch recent Attendance
            Attendance.find({ 
                gymId,
                createdAt: { $gte: thirtyDaysAgo }
            }).sort({ checkInTime: -1, createdAt: -1 }).limit(40).lean(),

            // 5. Fetch recent Memberships / Subscriptions
            MemberMembership.find({ 
                gymId,
                createdAt: { $gte: thirtyDaysAgo }
            }).sort({ createdAt: -1 }).limit(30)
              .populate({ path: 'memberId', select: 'firstName lastName memberId', strictPopulate: false })
              .populate({ path: 'membershipPlanId', select: 'name', strictPopulate: false })
              .lean(),

            // 6. Fetch recent Fee Transactions
            Transaction.find({
                gymId,
                createdAt: { $gte: thirtyDaysAgo }
            }).sort({ createdAt: -1 }).limit(30)
              .populate({ path: 'memberId', select: 'firstName lastName memberId', strictPopulate: false })
              .lean(),

            // 7. Fetch recent Staff / Trainers
            User.find({
                gymId,
                role: { $in: ['STAFF', 'TRAINER', 'ADMIN', 'BRANCH_MANAGER'] },
                createdAt: { $gte: thirtyDaysAgo }
            }).sort({ createdAt: -1 }).limit(20).lean()
        ]);

        // Populate attendance user names dynamically from Member / User / Enquiry collections
        const attUserIds = recentAttendance.map(att => att.userId).filter(Boolean);
        const [attMembers, attUsers, attEnquiries] = await Promise.all([
            Member.find({ _id: { $in: attUserIds } }).select('firstName lastName memberId').lean(),
            User.find({ _id: { $in: attUserIds } }).select('name firstName lastName role').lean(),
            Enquiry.find({ _id: { $in: attUserIds } }).select('firstName lastName').lean()
        ]);

        const personMap = {};
        attMembers.forEach(m => {
            personMap[m._id.toString()] = {
                name: `${m.firstName} ${m.lastName || ''}`.trim(),
                code: m.memberId ? `#${m.memberId}` : '',
                roleType: 'Member'
            };
        });
        attUsers.forEach(u => {
            personMap[u._id.toString()] = {
                name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
                code: u.role ? u.role.replace('_', ' ') : 'Staff',
                roleType: 'Staff'
            };
        });
        attEnquiries.forEach(e => {
            personMap[e._id.toString()] = {
                name: `${e.firstName} ${e.lastName || ''}`.trim(),
                code: 'Trial',
                roleType: 'Trial'
            };
        });

        // Synthesize dynamic activity items
        const dynamicLogs = [];

        // 1. Members
        recentMembers.forEach(m => {
            dynamicLogs.push({
                _id: `mem_reg_${m._id}`,
                gymId,
                title: `Member Registered: ${m.firstName} ${m.lastName || ''}`.trim(),
                description: `ID: ${m.memberId || 'MEM'} • Contact: ${m.contactNumber || 'N/A'} (Status: ${m.status || 'Active'})`,
                type: 'MEMBER',
                targetId: m._id,
                link: `/dashboard/owner/members/view/${m._id}`,
                isRead: false,
                createdAt: m.createdAt
            });
        });

        // 2. Attendance
        recentAttendance.forEach(att => {
            if (att.checkInTime) {
                const uIdStr = att.userId ? att.userId.toString() : '';
                const person = personMap[uIdStr] || { name: 'Gym User', code: '', roleType: 'Member' };
                const codeSuffix = person.code ? ` (${person.code})` : '';
                const categoryType = att.attendanceType === 'Trial' 
                    ? 'Trial' 
                    : (person.roleType === 'Staff' || att.attendanceType === 'Staff' ? 'Staff' : 'Member');
                const action = att.checkOutTime ? 'Checked Out' : 'Checked In';

                dynamicLogs.push({
                    _id: `att_${att._id}`,
                    gymId,
                    title: `${categoryType} ${action}`,
                    description: `${person.name}${codeSuffix} marked attendance at ${new Date(att.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                    type: 'ATTENDANCE',
                    targetId: att._id,
                    link: '/dashboard/owner/attendance',
                    isRead: false,
                    createdAt: att.checkInTime || att.createdAt
                });
            }
        });

        // 3. Enquiries / Leads
        recentEnquiries.forEach(enq => {
            dynamicLogs.push({
                _id: `enq_${enq._id}`,
                gymId,
                title: enq.status === 'Trial' ? 'New Trial Registered' : `Lead ${enq.status || 'Active'}`,
                description: `${enq.firstName} ${enq.lastName || ''} — Status: ${enq.status} (Source: ${enq.source || 'Walk-in'})`,
                type: 'LEAD',
                targetId: enq._id,
                link: '/dashboard/owner/leads',
                isRead: false,
                createdAt: enq.updatedAt || enq.createdAt
            });
        });

        // 4. Memberships
        recentMemberships.forEach(mm => {
            const mName = mm.memberId?.firstName ? `${mm.memberId.firstName} ${mm.memberId.lastName || ''}`.trim() : 'Member';
            const planName = mm.membershipPlanId?.name || mm.planName || 'Membership Plan';
            dynamicLogs.push({
                _id: `mem_plan_${mm._id}`,
                gymId,
                title: `Membership Plan Assigned: ${mName}`,
                description: `${mName} subscribed to ${planName} — Paid: ₹${mm.paidAmount || 0} (${mm.paymentStatus || 'Active'})`,
                type: 'MEMBERSHIP',
                targetId: mm._id,
                link: '/dashboard/owner/membership',
                isRead: false,
                createdAt: mm.createdAt
            });
        });

        // 5. Fee Payments / Transactions
        recentTransactions.forEach(tx => {
            const mName = tx.memberId?.firstName ? `${tx.memberId.firstName} ${tx.memberId.lastName || ''}`.trim() : 'Member';
            dynamicLogs.push({
                _id: `tx_${tx._id}`,
                gymId,
                title: `Fee Collected: ₹${tx.amountPaid}`,
                description: `Payment of ₹${tx.amountPaid} via ${tx.paymentMode || 'Cash'} for ${mName}.`,
                type: 'PAYMENT',
                targetId: tx._id,
                link: '/dashboard/owner/finance',
                isRead: false,
                createdAt: tx.paymentDate || tx.createdAt
            });
        });

        // 6. Staff / Trainers
        recentStaff.forEach(st => {
            dynamicLogs.push({
                _id: `staff_${st._id}`,
                gymId,
                title: `Staff Member: ${st.name}`,
                description: `Role: ${st.role} • Shift: ${st.shiftStart || '09:00'} - ${st.shiftEnd || '18:00'}`,
                type: 'MEMBER',
                targetId: st._id,
                link: '/dashboard/owner/staff',
                isRead: false,
                createdAt: st.createdAt
            });
        });

        // Merge saved and dynamic logs, deduplicating
        const combined = [...savedLogs];
        const existingIds = new Set(savedLogs.map(l => (l.targetId ? l.targetId.toString() : l._id.toString())));

        dynamicLogs.forEach(dLog => {
            const key = dLog.targetId ? dLog.targetId.toString() : dLog._id.toString();
            if (!existingIds.has(key)) {
                combined.push(dLog);
                existingIds.add(key);
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
