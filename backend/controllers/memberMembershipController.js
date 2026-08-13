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
            discount,
            walletUsed,
            bonusDays
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

        // Only auto-expire existing active memberships if the new plan is starting today or in the past
        if (new Date(planStartDate) <= new Date()) {
            await MemberMembership.updateMany(
                { memberId, membershipStatus: "Active" },
                { $set: { membershipStatus: "Expired" } }
            );
        }

        const start = new Date(planStartDate);
        const end = planEndDate ? new Date(planEndDate) : new Date(start);

        if (paidUntilDate) {
            const pDate = new Date(paidUntilDate);
            if (pDate > end) {
                return res.status(400).json({ message: "Paid until date cannot be after membership end date." });
            }
            if (pDate < start) {
                return res.status(400).json({ message: "Paid until date cannot be before membership start date." });
            }
        }

        // Calculate pricing
        const originalPrice = plan.price;
        const discountAmount = Number(discount) || 0;
        const finalPrice = Math.max(0, originalPrice - discountAmount);
        const paid = Number(amountPaid) || 0;
        const walletVal = Number(walletUsed) || 0;
        
        if (walletVal > 0) {
            if ((member.walletBalance || 0) < walletVal) {
                return res.status(400).json({ message: "Insufficient wallet balance." });
            }
        }

        const totalPaid = paid + walletVal;

        let paymentStatus = "Pending";
        if (totalPaid >= finalPrice && finalPrice > 0) paymentStatus = "Paid";
        else if (totalPaid > 0) paymentStatus = "Partial";
        if (finalPrice === 0) paymentStatus = "Paid";

        let calculatedPaidUntilDate = null;
        if (paymentStatus === 'Paid') {
            calculatedPaidUntilDate = end;
        } else if (paidUntilDate) {
            calculatedPaidUntilDate = new Date(paidUntilDate);
        }

        const calculatedMembershipStatus = start <= new Date() ? "Active" : "Scheduled";

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

            paidAmount: totalPaid,
            balanceAmount: Math.max(0, finalPrice - totalPaid),

            paidUntilDate: calculatedPaidUntilDate,

            paymentStatus: paymentStatus,
            membershipStatus: calculatedMembershipStatus,

            assignedBy: req.user.id,
            bonusDays: Number(bonusDays) || 0,
            bonusHistory: Number(bonusDays) > 0 ? [{
                days: Number(bonusDays),
                reason: 'Welcome/Referral Bonus',
                addedBy: req.user.id
            }] : []
        });

        if (walletVal > 0) {
            member.walletBalance = Math.max(0, (member.walletBalance || 0) - walletVal);
            await member.save();
        }

        // Record transaction if amount paid is > 0
        if (totalPaid > 0) {
            await Transaction.create({
                gymId,
                memberId,
                planId: membershipPlanId,
                collectedBy: req.user.id || req.user._id,
                amountPaid: totalPaid,
                cashAmount: paid,
                walletAmount: walletVal,
                paymentMode: walletVal > 0 && paid > 0 ? 'Mixed' : walletVal > 0 ? 'Wallet Cash' : (req.body.paymentMode || 'Cash'),
                transactionId: req.body.transactionId || `TRX-${Date.now()}`,
                paymentStatus: 'Paid',
                paymentDate: new Date()
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


// @desc    Update Assigned Membership (Details Only)
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
        
        // Recalculate balance with the new finalPrice (assuming paidAmount stays the same)
        const balanceAmount = Math.max(0, finalPrice - (membership.paidAmount || 0));

        let paymentStatus = "Pending";
        if (membership.paidAmount >= finalPrice && finalPrice > 0) paymentStatus = "Paid";
        else if (membership.paidAmount > 0) paymentStatus = "Partial";
        if (finalPrice === 0) paymentStatus = "Paid";

        const calculatedMembershipStatus = start <= new Date() ? "Active" : "Scheduled";

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
        membership.balanceAmount = balanceAmount;
        membership.paymentStatus = paymentStatus;
        if (membership.membershipStatus !== "Expired" && membership.membershipStatus !== "Cancelled") {
            membership.membershipStatus = calculatedMembershipStatus;
        }

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

// @desc    Add Payment to Membership
// @route   POST /api/member-memberships/:id/payment
// @access  Private
exports.addPayment = async (req, res) => {
    try {
        const gymId = req.user.gymId;
        const membershipId = req.params.id;
        const {
            amountPaid,
            walletUsed,
            paidUntilDate,
            paymentMode,
            transactionId
        } = req.body;

        const membership = await MemberMembership.findOne({ _id: membershipId, gymId }).populate('memberId');
        if (!membership) return res.status(404).json({ message: "Membership assignment not found." });

        const member = membership.memberId;
        if (!member) return res.status(404).json({ message: "Member not found." });

        const paid = Number(amountPaid) || 0;
        const walletVal = Number(walletUsed) || 0;

        if (walletVal > 0) {
            if ((member.walletBalance || 0) < walletVal) {
                return res.status(400).json({ message: "Insufficient wallet balance." });
            }
        }

        const totalPaid = paid + walletVal;
        
        if (totalPaid <= 0) {
            return res.status(400).json({ message: "Payment amount must be greater than zero." });
        }

        if (paidUntilDate) {
            const pDate = new Date(paidUntilDate);
            if (pDate > membership.endDate) {
                return res.status(400).json({ message: "Paid until date cannot be after membership end date." });
            }
            if (pDate < membership.startDate) {
                return res.status(400).json({ message: "Paid until date cannot be before membership start date." });
            }
        }

        membership.paidAmount = (membership.paidAmount || 0) + totalPaid;
        membership.balanceAmount = Math.max(0, membership.finalPrice - membership.paidAmount);

        let paymentStatus = "Pending";
        if (membership.paidAmount >= membership.finalPrice && membership.finalPrice > 0) paymentStatus = "Paid";
        else if (membership.paidAmount > 0) paymentStatus = "Partial";
        if (membership.finalPrice === 0) paymentStatus = "Paid";

        membership.paymentStatus = paymentStatus;

        if (paymentStatus === 'Paid') {
            membership.paidUntilDate = membership.endDate;
        } else if (paidUntilDate) {
            membership.paidUntilDate = new Date(paidUntilDate);
        }

        await membership.save();

        if (walletVal > 0) {
            member.walletBalance = Math.max(0, (member.walletBalance || 0) - walletVal);
            await member.save();
        }

        await Transaction.create({
            gymId,
            memberId: member._id,
            planId: membership.membershipPlanId,
            collectedBy: req.user.id || req.user._id,
            amountPaid: totalPaid,
            cashAmount: paid,
            walletAmount: walletVal,
            paymentMode: walletVal > 0 && paid > 0 ? 'Mixed' : walletVal > 0 ? 'Wallet Cash' : (paymentMode || 'Cash'),
            transactionId: transactionId || `TRX-${Date.now()}`,
            paymentStatus: 'Paid',
            paymentDate: new Date()
        });

        res.status(200).json({
            message: "Payment added successfully.",
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

        const now = new Date();
        const memberships = await MemberMembership.find({
            gymId: req.user.gymId,
            membershipStatus: { $in: ["Active", "Scheduled"] },
            endDate: { $gte: now }
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