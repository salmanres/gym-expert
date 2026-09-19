const Member = require("../models/Member");
const MembershipPlan = require("../models/MembershipPlan");
const MemberMembership = require("../models/MemberMembership");
const Transaction = require("../models/Transaction");
const { notifyGym } = require("../socket");

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
            bonusDays,
            trainerId,
            salesPersonId,
            reference,
            isPTConversion
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

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const start = new Date(planStartDate);
        const end = planEndDate ? new Date(planEndDate) : new Date(start);

        // Only auto-expire existing active memberships of the SAME category (PT vs Non-PT)
        const pNameStr = String(plan.name || '').toLowerCase();
        const pTypeStr = Array.isArray(plan.planType) ? plan.planType.join(' ').toLowerCase() : String(plan.planType || '').toLowerCase();
        const isExplicitPT = pTypeStr.includes('personal training') || pTypeStr.includes('pt') || pNameStr.includes('personal training') || pNameStr.includes('pt package');
        const isNewPlanPT = Boolean(isPTConversion) || isExplicitPT;

        if (start <= todayEnd) {
            if (isNewPlanPT) {
                await MemberMembership.updateMany(
                    { memberId, membershipStatus: "Active", isPTConversion: true },
                    { $set: { membershipStatus: "Expired" } }
                );
            } else {
                await MemberMembership.updateMany(
                    { memberId, membershipStatus: "Active", isPTConversion: { $ne: true } },
                    { $set: { membershipStatus: "Expired" } }
                );
            }
        }

        if (paidUntilDate) {
            const pDate = new Date(paidUntilDate);
            if (pDate > end) {
                return res.status(400).json({ message: "Paid until date cannot be after membership end date." });
            }
            if (pDate < start) {
                return res.status(400).json({ message: "Paid until date cannot be before membership start date." });
            }
        }

        // Calculate pricing (Flexible fee support)
        const originalPrice = (req.body.originalPrice !== undefined && req.body.originalPrice !== null && req.body.originalPrice !== '')
            ? Number(req.body.originalPrice)
            : plan.price;
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
        let extraAmountToWallet = 0;
        let actualAllocatedPaidAmount = totalPaid;

        if (paymentStatus === 'Paid') {
            calculatedPaidUntilDate = end;
        } else if (paidUntilDate) {
            calculatedPaidUntilDate = new Date(paidUntilDate);
        } else if (paymentStatus === 'Partial' && finalPrice > 0) {
            const totalMs = end.getTime() - start.getTime();
            const totalDays = Math.max(1, Math.round(totalMs / (1000 * 60 * 60 * 24)));
            
            const perDayCost = finalPrice / totalDays;
            const exactDays = totalPaid / perDayCost;
            const floorDays = Math.floor(exactDays);

            const costForFloorDays = Number((floorDays * perDayCost).toFixed(2));
            extraAmountToWallet = Number((totalPaid - costForFloorDays).toFixed(2));

            if (extraAmountToWallet > 0) {
                actualAllocatedPaidAmount = costForFloorDays;
            }
            
            calculatedPaidUntilDate = new Date(start.getTime() + (floorDays * 24 * 60 * 60 * 1000));
        } else if (paymentStatus === 'Pending') {
            calculatedPaidUntilDate = new Date(start.getTime()); // Valid for 0 days technically
        }

        const calculatedMembershipStatus = start <= todayEnd ? "Active" : "Scheduled";

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

            paidAmount: actualAllocatedPaidAmount,
            totalCollected: totalPaid,
            balanceAmount: Math.max(0, finalPrice - actualAllocatedPaidAmount),

            paidUntilDate: calculatedPaidUntilDate,

            paymentStatus: paymentStatus,
            membershipStatus: calculatedMembershipStatus,

            assignedBy: req.user.id,
            trainerId: trainerId || undefined,
            salesPersonId: salesPersonId || undefined,
            reference: reference || undefined,
            isPTConversion: Boolean(isPTConversion),
            bonusDays: Number(bonusDays) || 0,
            bonusHistory: Number(bonusDays) > 0 ? [{
                days: Number(bonusDays),
                reason: 'Welcome/Referral Bonus',
                addedBy: req.user.id
            }] : []
        });

        if (walletVal > 0 || extraAmountToWallet > 0) {
            member.walletBalance = Math.max(0, (member.walletBalance || 0) - walletVal) + Math.max(0, extraAmountToWallet);
        }

        // Keep Member object status & payment details 100% in sync with assigned membership
        if (calculatedMembershipStatus === 'Active') {
            member.status = 'Active';
            member.membershipPlan = membershipPlanId;
            member.planStartDate = start;
            member.planEndDate = end;
            member.paymentStatus = paymentStatus;
        }
        await member.save();

        // Record transaction if amount paid is > 0
        if (totalPaid > 0) {
            await Transaction.create({
                gymId,
                memberId,
                membershipId: membership._id,
                planId: membershipPlanId,
                collectedBy: req.user.id || req.user._id,
                amountPaid: totalPaid,
                cashAmount: paid,
                walletAmount: walletVal,
                paymentMode: walletVal > 0 && paid > 0 ? 'Mixed' : walletVal > 0 ? 'Wallet Cash' : (req.body.paymentMode || 'Cash'),
                transactionId: req.body.transactionId || `TRX-${Date.now()}`,
                paymentStatus: paymentStatus === 'Paid' ? 'Paid' : 'Partial',
                paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date()
            });
        }

        // Broadcast real-time Socket notification
        notifyGym(gymId, {
            title: 'Membership Assigned',
            description: `${member.firstName} ${member.lastName || ''} assigned to ${plan.name} (${paymentStatus} - ₹${totalPaid})`,
            type: 'MEMBERSHIP',
            targetId: member._id,
            link: `/dashboard/owner/members/view/${member._id}`
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

        const originalPrice = (req.body.originalPrice !== undefined && req.body.originalPrice !== null && req.body.originalPrice !== '')
            ? Number(req.body.originalPrice)
            : plan.price;
        const discountAmount = Number(discount) || 0;
        const finalPrice = Math.max(0, originalPrice - discountAmount);
        
        const additionalPaid = Number(req.body.amountPaid) || 0;
        const newPaidAmount = (membership.paidAmount || 0) + additionalPaid;
        const balanceAmount = Math.max(0, finalPrice - newPaidAmount);

        let paymentStatus = "Pending";
        if (newPaidAmount >= finalPrice && finalPrice > 0) paymentStatus = "Paid";
        else if (newPaidAmount > 0) paymentStatus = "Partial";
        if (finalPrice === 0) paymentStatus = "Paid";

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const calculatedMembershipStatus = start <= todayEnd ? "Active" : "Scheduled";

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
        membership.paidAmount = newPaidAmount;
        membership.balanceAmount = balanceAmount;
        membership.paymentStatus = paymentStatus;
        if (membership.membershipStatus !== "Expired" && membership.membershipStatus !== "Cancelled") {
            membership.membershipStatus = calculatedMembershipStatus;
        }

        await membership.save();

        if (additionalPaid > 0) {
            await Transaction.create({
                gymId,
                memberId: membership.memberId,
                planId: membershipPlanId,
                collectedBy: req.user.id || req.user._id,
                amountPaid: additionalPaid,
                cashAmount: additionalPaid,
                paymentMode: req.body.paymentMode || 'Cash',
                transactionId: req.body.transactionId || `TRX-${Date.now()}`,
                paymentStatus: 'Paid',
                paymentDate: new Date()
            });
        }

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

        let calculatedPaidUntilDate = null;
        let extraAmountToWallet = 0;
        let actualAllocatedPaidAmount = totalPaid; // we add this to existing paidAmount

        if (paymentStatus === 'Paid') {
            calculatedPaidUntilDate = membership.endDate;
        } else if (paidUntilDate) {
            calculatedPaidUntilDate = new Date(paidUntilDate);
        } else if (paymentStatus === 'Partial' && membership.finalPrice > 0) {
            const startMs = new Date(membership.startDate).getTime();
            const endMs = new Date(membership.endDate).getTime();
            const totalMs = endMs - startMs;
            const totalDays = Math.max(1, Math.round(totalMs / (1000 * 60 * 60 * 24)));
            
            const perDayCost = membership.finalPrice / totalDays;
            const totalCumulativePaid = membership.paidAmount; // includes totalPaid added earlier
            
            const exactDays = totalCumulativePaid / perDayCost;
            const floorDays = Math.floor(exactDays);
            
            const costForFloorDays = Number((floorDays * perDayCost).toFixed(2));
            extraAmountToWallet = Number((totalCumulativePaid - costForFloorDays).toFixed(2));
            
            // Override membership paidAmount to only include what was actually allocated for whole days
            membership.paidAmount = costForFloorDays;
            membership.balanceAmount = Math.max(0, membership.finalPrice - membership.paidAmount);
            
            calculatedPaidUntilDate = new Date(startMs + (floorDays * 24 * 60 * 60 * 1000));
        } else if (paymentStatus === 'Pending') {
            calculatedPaidUntilDate = new Date(membership.startDate);
        }

        membership.paidUntilDate = calculatedPaidUntilDate;
        membership.totalCollected = (membership.totalCollected || 0) + totalPaid;

        await membership.save();

        if (walletVal > 0 || extraAmountToWallet > 0) {
            member.walletBalance = Math.max(0, (member.walletBalance || 0) - walletVal) + extraAmountToWallet;
        }

        // Keep Member object payment status 100% in sync
        member.paymentStatus = paymentStatus;
        if (membership.membershipStatus === 'Active') {
            member.status = 'Active';
        }
        await member.save();

        await Transaction.create({
            gymId,
            memberId: member._id,
            membershipId: membership._id,
            planId: membership.membershipPlanId,
            collectedBy: req.user.id || req.user._id,
            amountPaid: totalPaid,
            cashAmount: paid,
            walletAmount: walletVal,
            paymentMode: walletVal > 0 && paid > 0 ? 'Mixed' : walletVal > 0 ? 'Wallet Cash' : (paymentMode || 'Cash'),
            transactionId: transactionId || `TRX-${Date.now()}`,
            paymentStatus: paymentStatus === 'Paid' ? 'Paid' : 'Partial',
            paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date()
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

// @desc    Mark a PT session completed / used (+1)
// @route   POST /api/member-memberships/:id/use-session
// @access  Private
exports.markPTSessionUsed = async (req, res) => {
    try {
        const gymId = req.user.gymId;
        const membershipId = req.params.id;
        const { notes } = req.body;

        const membership = await MemberMembership.findOne({ _id: membershipId, gymId });
        if (!membership) return res.status(404).json({ message: "Membership assignment not found." });

        if (membership.totalSessions > 0 && membership.usedSessions >= membership.totalSessions) {
            return res.status(400).json({ message: "All sessions for this package have already been completed." });
        }

        membership.usedSessions = (membership.usedSessions || 0) + 1;
        membership.sessionLogs.push({
            date: new Date(),
            trainerId: membership.trainerId || req.user.id,
            notes: notes || 'PT Session Completed',
            loggedBy: req.user.id
        });

        await membership.save();

        res.status(200).json({
            message: `PT Session logged successfully. (${membership.usedSessions}/${membership.totalSessions || '∞'} completed)`,
            membership
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Freeze / Unfreeze Membership & Extend End Dates Automatically
// @route   POST /api/member-memberships/:id/freeze
// @access  Private
exports.toggleFreezeMembership = async (req, res) => {
    try {
        const gymId = req.user.gymId;
        const membershipId = req.params.id;
        const { reason } = req.body;

        const membership = await MemberMembership.findOne({ _id: membershipId, gymId });
        if (!membership) return res.status(404).json({ message: "Membership assignment not found." });

        const now = new Date();

        if (membership.membershipStatus === 'Frozen') {
            // UNFREEZE FLOW: Calculate frozen duration in days & extend endDate automatically!
            const freezeStart = membership.freezeDate ? new Date(membership.freezeDate) : now;
            const diffMs = now.getTime() - freezeStart.getTime();
            const daysFrozen = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

            // Extend end date & paid until date by daysFrozen
            if (membership.endDate) {
                membership.endDate = new Date(new Date(membership.endDate).getTime() + (daysFrozen * 24 * 60 * 60 * 1000));
            }
            if (membership.paidUntilDate) {
                membership.paidUntilDate = new Date(new Date(membership.paidUntilDate).getTime() + (daysFrozen * 24 * 60 * 60 * 1000));
            }

            membership.membershipStatus = 'Active';
            membership.freezeDate = null;

            // Update history
            const lastHistory = membership.freezeHistory[membership.freezeHistory.length - 1];
            if (lastHistory && !lastHistory.unfreezeDate) {
                lastHistory.unfreezeDate = now;
                lastHistory.daysFrozen = daysFrozen;
            } else {
                membership.freezeHistory.push({
                    freezeDate: freezeStart,
                    unfreezeDate: now,
                    daysFrozen: daysFrozen,
                    reason: reason || 'Unfrozen by Admin',
                    actionBy: req.user.id
                });
            }

            await membership.save();

            // Broadcast real-time Socket notification
            notifyGym(gymId, {
                title: 'Membership Unfrozen',
                description: `Membership for ${membership.planName} unfrozen. Extended by ${daysFrozen} days.`,
                type: 'MEMBERSHIP',
                targetId: membership.memberId,
                link: `/dashboard/owner/members/view/${membership.memberId}`
            });

            return res.status(200).json({
                message: `Membership Unfrozen! End date extended by ${daysFrozen} days to ${new Date(membership.endDate).toLocaleDateString()}`,
                membership
            });
        } else {
            // FREEZE FLOW
            membership.membershipStatus = 'Frozen';
            membership.freezeDate = now;
            membership.freezeHistory.push({
                freezeDate: now,
                reason: reason || 'Medical / Personal Leave',
                actionBy: req.user.id
            });

            await membership.save();

            // Broadcast real-time Socket notification
            notifyGym(gymId, {
                title: 'Membership Frozen',
                description: `Membership for ${membership.planName} frozen (${reason || 'Leave'}).`,
                type: 'MEMBERSHIP',
                targetId: membership.memberId,
                link: `/dashboard/owner/members/view/${membership.memberId}`
            });

            return res.status(200).json({
                message: "Membership frozen successfully. End date will automatically extend upon unfreezing.",
                membership
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

exports.getLatestMemberships = async (req, res) => {
    try {
        const memberships = await MemberMembership.find({
            gymId: req.user.gymId
        })
            .populate("memberId")
            .populate("membershipPlanId")
            .populate("trainerId", "name email phone role")
            .populate("salesPersonId", "name email phone role")
            .sort({ createdAt: -1 });

        const latestMap = new Map();
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        memberships.forEach(m => {
            const memberIdStr = m.memberId?._id?.toString() || m.memberId?.toString();
            if (memberIdStr && !latestMap.has(memberIdStr)) {
                const endDate = new Date(m.endDate);
                endDate.setHours(23, 59, 59, 999);

                let computedStatus = m.membershipStatus;
                if (computedStatus !== 'Frozen' && computedStatus !== 'Cancelled') {
                    if (endDate < now) {
                        computedStatus = 'Expired';
                    } else if (new Date(m.startDate) > todayEnd) {
                        computedStatus = 'Scheduled';
                    } else {
                        computedStatus = 'Active';
                    }
                }

                const mObj = m.toObject();
                mObj.computedStatus = computedStatus;
                mObj.membershipStatus = computedStatus;
                latestMap.set(memberIdStr, mObj);
            }
        });

        res.json(Array.from(latestMap.values()));
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

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const memberships = await MemberMembership.find({
            gymId: req.user.gymId,
            membershipStatus: { $in: ["Active", "Scheduled"] },
            endDate: { $gte: new Date() }
        })
            .populate("memberId")
            .populate("membershipPlanId")
            .populate("trainerId", "name email phone role")
            .populate("salesPersonId", "name email phone role")
            .sort({ createdAt: -1 });

        const Transaction = require('../models/Transaction');
        const MembershipPlan = require('../models/MembershipPlan');

        // Step 1: Auto-correct any accumulated paidAmount on Active & Scheduled membership records in DB
        for (let m of memberships) {
            const planObj = m.membershipPlanId ? await MembershipPlan.findById(m.membershipPlanId._id || m.membershipPlanId) : null;
            const realPrice = m.finalPrice > 0 ? m.finalPrice : (planObj?.price || m.originalPrice || 699);

            if (m.membershipStatus === 'Active' && m.paidAmount > realPrice && realPrice > 0) {
                const overflowPaid = m.paidAmount - realPrice;
                m.paidAmount = realPrice;
                m.balanceAmount = 0;
                m.paymentStatus = 'Paid';
                m.paidUntilDate = m.endDate;

                await MemberMembership.updateOne(
                    { _id: m._id },
                    {
                        $set: {
                            paidAmount: realPrice,
                            balanceAmount: 0,
                            paymentStatus: 'Paid',
                            paidUntilDate: m.endDate
                        }
                    }
                );

                // Find or update scheduled membership for this member
                let sched = memberships.find(sm => (sm.memberId?._id || sm.memberId)?.toString() === (m.memberId?._id || m.memberId)?.toString() && sm.membershipStatus === 'Scheduled');
                if (sched) {
                    sched.paidAmount = overflowPaid;
                    sched.finalPrice = realPrice;
                    sched.balanceAmount = Math.max(0, realPrice - overflowPaid);
                    sched.paymentStatus = overflowPaid >= realPrice ? 'Paid' : 'Partial';

                    const schedStartMs = new Date(sched.startDate).getTime();
                    const schedEndMs = new Date(sched.endDate).getTime();
                    const totalDays = Math.max(1, Math.round((schedEndMs - schedStartMs) / (1000 * 60 * 60 * 24)));
                    const perDayCost = realPrice / totalDays;
                    const exactDays = Math.floor(overflowPaid / perDayCost);
                    sched.paidUntilDate = new Date(schedStartMs + (exactDays * 24 * 60 * 60 * 1000));

                    await MemberMembership.updateOne(
                        { _id: sched._id },
                        {
                            $set: {
                                finalPrice: sched.finalPrice,
                                paidAmount: sched.paidAmount,
                                balanceAmount: sched.balanceAmount,
                                paymentStatus: sched.paymentStatus,
                                paidUntilDate: sched.paidUntilDate
                            }
                        }
                    );
                }
            } else if (m.membershipStatus === 'Scheduled') {
                if (m.paidAmount < realPrice && realPrice > 0) {
                    m.finalPrice = realPrice;
                    m.originalPrice = m.originalPrice || realPrice;
                    m.balanceAmount = Math.max(0, realPrice - (m.paidAmount || 0));
                    m.paymentStatus = (m.paidAmount || 0) >= realPrice ? 'Paid' : ((m.paidAmount || 0) > 0 ? 'Partial' : 'Pending');

                    const schedStartMs = new Date(m.startDate).getTime();
                    const schedEndMs = new Date(m.endDate).getTime();
                    const totalDays = Math.max(1, Math.round((schedEndMs - schedStartMs) / (1000 * 60 * 60 * 24)));
                    const perDayCost = realPrice / totalDays;
                    const exactDays = Math.floor((m.paidAmount || 0) / perDayCost);
                    m.paidUntilDate = new Date(schedStartMs + (exactDays * 24 * 60 * 60 * 1000));

                    await MemberMembership.updateOne(
                        { _id: m._id },
                        {
                            $set: {
                                finalPrice: m.finalPrice,
                                balanceAmount: m.balanceAmount,
                                paymentStatus: m.paymentStatus,
                                paidUntilDate: m.paidUntilDate
                            }
                        }
                    );
                }
            }
        }

        let processed = memberships.map(m => {
            const mObj = m.toObject();
            if (mObj.membershipStatus !== 'Frozen' && mObj.membershipStatus !== 'Cancelled') {
                if (new Date(mObj.startDate) <= todayEnd) {
                    mObj.membershipStatus = 'Active';
                } else {
                    mObj.membershipStatus = 'Scheduled';
                }
            }
            return mObj;
        });

        // Step 2: Auto-heal missing Scheduled plans for fully paid active members with extra transactions
        const activeMems = memberships.filter(m => m.membershipStatus === 'Active' && m.paymentStatus === 'Paid');
        
        for (const actMem of activeMems) {
            const mId = actMem.memberId?._id || actMem.memberId;
            if (!mId) continue;
            
            const hasSched = memberships.some(m => (m.memberId?._id || m.memberId)?.toString() === mId.toString() && (m.membershipStatus === 'Scheduled' || new Date(m.startDate) > todayEnd));
            
            if (!hasSched) {
                const txs = await Transaction.find({
                    memberId: mId,
                    createdAt: { $gt: actMem.createdAt }
                });
                
                const extraTxPaid = txs.reduce((sum, t) => sum + (t.amountPaid || 0), 0);
                if (extraTxPaid > 0) {
                    const schedStart = new Date(actMem.endDate);
                    schedStart.setDate(schedStart.getDate() + 1);

                    const durationMs = new Date(actMem.endDate).getTime() - new Date(actMem.startDate).getTime();
                    const validDurationMs = durationMs > 0 ? durationMs : 30 * 24 * 60 * 60 * 1000;
                    const schedEnd = new Date(schedStart.getTime() + validDurationMs);

                    const planObj = actMem.membershipPlanId ? await MembershipPlan.findById(actMem.membershipPlanId._id || actMem.membershipPlanId) : null;
                    const planPrice = planObj?.price || actMem.finalPrice || actMem.originalPrice || 699;

                    const totalDays = Math.max(1, Math.round(validDurationMs / (1000 * 60 * 60 * 24)));
                    const perDayCost = planPrice > 0 ? (planPrice / totalDays) : 0;
                    const exactDays = perDayCost > 0 ? Math.floor(extraTxPaid / perDayCost) : 0;

                    const paidUntil = extraTxPaid >= planPrice ? schedEnd : new Date(schedStart.getTime() + (exactDays * 24 * 60 * 60 * 1000));
                    const pStatus = extraTxPaid >= planPrice ? 'Paid' : 'Partial';

                    const newSched = await MemberMembership.create({
                        gymId: req.user.gymId,
                        memberId: mId,
                        membershipPlanId: actMem.membershipPlanId?._id || actMem.membershipPlanId,
                        planName: actMem.planName,
                        duration: actMem.duration,
                        durationUnit: actMem.durationUnit,
                        totalSessions: actMem.totalSessions,
                        startDate: schedStart,
                        endDate: schedEnd,
                        paidUntilDate: paidUntil,
                        originalPrice: planPrice,
                        discount: 0,
                        finalPrice: planPrice,
                        paidAmount: extraTxPaid,
                        balanceAmount: Math.max(0, planPrice - extraTxPaid),
                        paymentStatus: pStatus,
                        membershipStatus: 'Scheduled'
                    });
                    
                    const populatedSched = await MemberMembership.findById(newSched._id).populate("memberId").populate("membershipPlanId");
                    if (populatedSched) processed.push(populatedSched.toObject());
                }
            }
        }

        res.json(processed);

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
