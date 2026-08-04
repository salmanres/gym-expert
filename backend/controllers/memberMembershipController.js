const Member = require("../models/Member");
const MembershipPlan = require("../models/MembershipPlan");
const MemberMembership = require("../models/MemberMembership");
const Transaction = require("../models/Transaction");

// @desc    Assign Membership to Member
// @route   POST /api/member-memberships
// @access  Private
exports.assignMembership = async (req, res) => {
    try {
        const gymId = req.user.gymId;

        const {
            memberId,
            membershipPlans,
            planStartDate,
            planEndDate,
            totalSessions,
            amountPaid,
            paidUntilDate,
            discount
        } = req.body;

        if (!membershipPlans || membershipPlans.length === 0) {
            return res.status(400).json({ message: "At least one membership plan is required." });
        }

        // Just using the first plan for the primary reference for now
        const membershipPlanId = membershipPlans[0];

        // Check Member
        const member = await Member.findOne({ _id: memberId, gymId });
        if (!member) return res.status(404).json({ message: "Member not found." });

        // Check Plan
        const plan = await MembershipPlan.findOne({ _id: membershipPlanId, gymId });
        if (!plan) return res.status(404).json({ message: "Membership plan not found." });

        // Auto-expire any existing active memberships for this member
        // This allows seamless renewals without throwing "Member already has an active membership"
        await MemberMembership.updateMany(
            { memberId, membershipStatus: "Active" },
            { $set: { membershipStatus: "Expired" } }
        );

        const start = new Date(planStartDate);
        const end = planEndDate ? new Date(planEndDate) : new Date(start);

        // Calculate pricing
        const originalPrice = plan.price;
        const discountAmount = Number(discount) || 0;
        const finalPrice = Math.max(0, originalPrice - discountAmount);
        const paid = Number(amountPaid) || 0;

        let paymentStatus = "Pending";
        if (paid >= finalPrice && finalPrice > 0) paymentStatus = "Paid";
        else if (paid > 0) paymentStatus = "Partial";
        if (finalPrice === 0) paymentStatus = "Paid";

        const membership = await MemberMembership.create({
            gymId,
            memberId,
            membershipPlanId,

            planName: plan.name,
            duration: plan.duration,
            durationUnit: plan.durationUnit,

            totalSessions: Number(totalSessions) || plan.sessions || 0,
            usedSessions: 0,

            startDate: start,
            endDate: end,

            originalPrice: originalPrice,
            discount: discountAmount,
            finalPrice: finalPrice,

            paidAmount: paid,
            balanceAmount: finalPrice - paid,

            paidUntilDate: paidUntilDate ? new Date(paidUntilDate) : null,

            paymentStatus: paymentStatus,
            membershipStatus: "Active",

            assignedBy: req.user.id,
        });

        // Record transaction if amount paid is > 0
        if (paid > 0) {
            await Transaction.create({
                gymId,
                memberId,
                planId: membershipPlanId,
                amountPaid: paid,
                paymentMode: req.body.paymentMode || 'Cash',
                transactionId: req.body.transactionId || `TRX-${Date.now()}`,
                paymentStatus: paymentStatus,
                paymentDate: start || new Date()
            });
        }

        res.status(201).json({
            message: "Membership assigned successfully.",
            membership,
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            message: "Server Error",
        });
    }
};


// @desc    Update Assigned Membership
// @route   PUT /api/member-memberships/:id
// @access  Private
exports.updateAssignedMembership = async (req, res) => {
    try {
        const gymId = req.user.gymId;
        const membershipId = req.params.id;
        const {
            membershipPlans,
            planStartDate,
            planEndDate,
            totalSessions,
            amountPaid,
            paidUntilDate,
            discount
        } = req.body;

        if (!membershipPlans || membershipPlans.length === 0) {
            return res.status(400).json({ message: "At least one membership plan is required." });
        }

        const membershipPlanId = membershipPlans[0];

        const membership = await MemberMembership.findOne({ _id: membershipId, gymId });
        if (!membership) return res.status(404).json({ message: "Membership assignment not found." });

        const plan = await MembershipPlan.findOne({ _id: membershipPlanId, gymId });
        if (!plan) return res.status(404).json({ message: "Membership plan not found." });

        const start = new Date(planStartDate);
        const end = planEndDate ? new Date(planEndDate) : new Date(start);

        const originalPrice = plan.price;
        const discountAmount = Number(discount) || 0;
        const finalPrice = Math.max(0, originalPrice - discountAmount);
        const paid = Number(amountPaid) || 0;

        let paymentStatus = "Pending";
        if (paid >= finalPrice && finalPrice > 0) paymentStatus = "Paid";
        else if (paid > 0) paymentStatus = "Partial";
        if (finalPrice === 0) paymentStatus = "Paid";

        membership.membershipPlanId = membershipPlanId;
        membership.planName = plan.name;
        membership.duration = plan.duration;
        membership.durationUnit = plan.durationUnit;
        membership.totalSessions = Number(totalSessions) || plan.sessions || 0;
        membership.startDate = start;
        membership.endDate = end;
        membership.originalPrice = originalPrice;
        membership.discount = discountAmount;
        membership.finalPrice = finalPrice;
        membership.paidAmount = paid;
        membership.balanceAmount = finalPrice - paid;
        membership.paidUntilDate = paidUntilDate ? new Date(paidUntilDate) : null;
        membership.paymentStatus = paymentStatus;

        await membership.save();

        res.status(200).json({
            message: "Membership updated successfully.",
            membership,
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Add Bonus Days to Membership
// @route   POST /api/member-memberships/:id/bonus
// @access  Private
exports.addBonusDays = async (req, res) => {
    try {
        const gymId = req.user.gymId;
        const membershipId = req.params.id;
        const { days, reason } = req.body;

        if (days === undefined || days === '' || Number(days) === 0 || !reason) {
            return res.status(400).json({ message: "Valid days (positive or negative) and reason are required." });
        }

        const membership = await MemberMembership.findOne({ _id: membershipId, gymId });
        if (!membership) return res.status(404).json({ message: "Membership assignment not found." });

        // Add days to dates
        const bonusMs = Number(days) * 24 * 60 * 60 * 1000;
        
        if (membership.endDate) {
            membership.endDate = new Date(new Date(membership.endDate).getTime() + bonusMs);
        }
        
        if (membership.paidUntilDate) {
            membership.paidUntilDate = new Date(new Date(membership.paidUntilDate).getTime() + bonusMs);
        }

        membership.bonusDays = (membership.bonusDays || 0) + Number(days);
        membership.bonusHistory.push({
            days: Number(days),
            reason: reason,
            date: new Date(),
            addedBy: req.user.id
        });

        await membership.save();

        res.status(200).json({
            message: `Successfully added ${days} bonus days.`,
            membership
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc Get Active Memberships
// @route GET /api/member-memberships/active
// @access Private

exports.getActiveMemberships = async (req, res) => {

    try {

        const memberships = await MemberMembership.find({
            gymId: req.user.gymId,
            membershipStatus: "Active",
        })
            .populate("memberId")
            .populate("membershipPlanId")
            .sort({ createdAt: -1 });

        res.json(memberships);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: "Server Error",
        });

    }

};


// @desc Get Membership History of Member
// @route GET /api/member-memberships/member/:memberId
// @access Private

exports.getMemberMembershipHistory = async (req, res) => {

    try {

        const memberships = await MemberMembership.find({
            gymId: req.user.gymId,
            memberId: req.params.memberId,
        })
            .populate("membershipPlanId")
            .sort({ startDate: -1 });

        res.json(memberships);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: "Server Error",
        });

    }

};