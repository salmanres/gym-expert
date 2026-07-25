const Member = require("../models/Member");
const MembershipPlan = require("../models/MembershipPlan");
const MemberMembership = require("../models/MemberMembership");

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
            paidUntilDate
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

        // Check existing active membership
        const activeMembership = await MemberMembership.findOne({
            memberId,
            membershipStatus: "Active",
        });

        if (activeMembership) {
            return res.status(400).json({
                message: "Member already has an active membership.",
            });
        }

        const start = new Date(planStartDate);
        const end = planEndDate ? new Date(planEndDate) : new Date(start);

        // Calculate pricing
        const originalPrice = plan.price;
        const paid = Number(amountPaid) || 0;
        const finalPrice = originalPrice; // If we support custom discounts later, adjust this

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
            discount: 0,
            finalPrice: finalPrice,

            paidAmount: paid,
            balanceAmount: finalPrice - paid,

            paidUntilDate: paidUntilDate ? new Date(paidUntilDate) : null,

            paymentStatus: paymentStatus,
            membershipStatus: "Active",

            assignedBy: req.user.id,
        });

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