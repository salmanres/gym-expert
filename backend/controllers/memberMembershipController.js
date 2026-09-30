const Member = require("../models/Member");
const MembershipPlan = require("../models/MembershipPlan");
const MemberMembership = require("../models/MemberMembership");
const Transaction = require("../models/Transaction");
const { notifyGym } = require("../socket");


const parseDateOnly = (value) => {
    if (!value) return null;

    if (value instanceof Date) {
        const date = new Date(value);
        date.setHours(0, 0, 0, 0);
        return date;
    }

    const raw = String(value).split("T")[0];
    const parts = raw.split("-").map(Number);

    if (
        parts.length !== 3 ||
        parts.some(Number.isNaN)
    ) {
        return null;
    }

    const [year, month, day] = parts;

    const date = new Date(
        year,
        month - 1,
        day
    );

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    date.setHours(0, 0, 0, 0);

    return date;
};

/*
|--------------------------------------------------------------------------
| Add calendar days
|--------------------------------------------------------------------------
*/

const addCalendarDays = (date, days) => {
    const result = new Date(date);

    result.setHours(0, 0, 0, 0);

    result.setDate(
        result.getDate() + Number(days || 0)
    );

    return result;
};

/*
|--------------------------------------------------------------------------
| Today
|--------------------------------------------------------------------------
*/

const getTodayStart = () => {
    const today = new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );

    return today;
};

const getTodayEnd = () => {
    const today = new Date();

    today.setHours(
        23,
        59,
        59,
        999
    );

    return today;
};

/*
|--------------------------------------------------------------------------
| Inclusive calendar days
|--------------------------------------------------------------------------
|
| Example:
|
| 23 Sep → 21 Oct
|
| = 29 calendar days
|
|--------------------------------------------------------------------------
*/

const getInclusiveDays = (start, end) => {
    const startDate = parseDateOnly(start);
    const endDate = parseDateOnly(end);

    if (!startDate || !endDate) {
        return 1;
    }

    const diff = Math.round(
        (
            endDate.getTime() -
            startDate.getTime()
        ) /
        (1000 * 60 * 60 * 24)
    );

    return Math.max(
        1,
        diff + 1
    );
};


/*
|--------------------------------------------------------------------------
| ASSIGN MEMBERSHIP
|--------------------------------------------------------------------------
| POST /api/member-memberships
|--------------------------------------------------------------------------
*/

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

        if (
            !membershipPlans ||
            membershipPlans.length === 0
        ) {
            return res.status(400).json({
                message:
                    "At least one membership plan is required."
            });
        }

        const membershipPlanId =
            membershipPlans[0];

        /*
        |--------------------------------------------------------------------------
        | Check Member
        |--------------------------------------------------------------------------
        */

        const member =
            await Member.findOne({
                _id: memberId,
                gymId
            });

        if (!member) {
            return res.status(404).json({
                message: "Member not found."
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Check Plan
        |--------------------------------------------------------------------------
        */

        const plan =
            await MembershipPlan.findOne({
                _id: membershipPlanId,
                gymId
            });

        if (!plan) {
            return res.status(404).json({
                message:
                    "Membership plan not found."
            });
        }

        /*
        |--------------------------------------------------------------------------
        | DATE FIX
        |--------------------------------------------------------------------------
        */

        const todayEnd =
            getTodayEnd();

        let start =
            parseDateOnly(planStartDate);

        let end =
            planEndDate
                ? parseDateOnly(planEndDate)
                : (
                    start
                        ? new Date(start)
                        : null
                );

        if (!start || !end) {
            return res.status(400).json({
                message:
                    "Valid plan start date and end date are required."
            });
        }

        if (end < start) {
            return res.status(400).json({
                message:
                    "Plan end date cannot be before plan start date."
            });
        }

        /*
        |--------------------------------------------------------------------------
        | PT / NON-PT CATEGORY
        |--------------------------------------------------------------------------
        */

        const pNameStr =
            String(
                plan.name || ""
            ).toLowerCase();

        const pTypeStr =
            Array.isArray(plan.planType)
                ? plan.planType
                    .join(" ")
                    .toLowerCase()
                : String(
                    plan.planType || ""
                ).toLowerCase();

        const isExplicitPT =
            pTypeStr.includes(
                "personal training"
            ) ||
            /\bpt\b/.test(pTypeStr) ||
            pNameStr.includes(
                "personal training"
            ) ||
            pNameStr.includes(
                "pt package"
            );

        const isNewPlanPT =
            Boolean(isPTConversion) ||
            isExplicitPT;

        if (isNewPlanPT && !trainerId) {
            return res.status(400).json({
                message: "A trainer is required for a PT membership."
            });
        }

        /*
        |--------------------------------------------------------------------------
        | PT ADD-ON / CONVERSION
        |--------------------------------------------------------------------------
        |
        | A PT plan is an additional membership.
        |
        | Existing normal membership:
        |     remains Active
        |
        | New PT membership:
        |     gets its own record
        |     gets its own payment
        |     gets its own trainer
        |     gets its own sessions
        |
        | parentMembershipId links the PT membership to the
        | existing normal membership.
        |--------------------------------------------------------------------------
        */

        let parentMembershipId = null;

        if (isNewPlanPT) {
            const requestedParentId = req.body.parentMembershipId;
            let parentMembership;

            if (requestedParentId) {
                parentMembership = await MemberMembership.findOne({
                    _id: requestedParentId,
                    memberId,
                    gymId,
                    membershipStatus: {
                        $in: ["Active", "Scheduled"]
                    },
                    isPTConversion: {
                        $ne: true
                    }
                });

                if (!parentMembership) {
                    return res.status(400).json({
                        message: "The selected parent membership is not available for this PT add-on."
                    });
                }
            } else {
                parentMembership = await MemberMembership.findOne({
                    memberId,
                    membershipStatus: "Active",
                    isPTConversion: {
                        $ne: true
                    },
                    startDate: {
                        $lte: todayEnd
                    },
                    endDate: {
                        $gte: getTodayStart()
                    }
                }).sort({
                    endDate: -1
                });
            }

            if (parentMembership) {
                parentMembershipId =
                    parentMembership._id;
            }
        }

        /*
        |--------------------------------------------------------------------------
        | FUTURE / SCHEDULED PLAN
        |--------------------------------------------------------------------------
        |
        | For normal membership:
        | new membership starts after existing normal membership.
        |
        | For PT:
        | PT remains its own category.
        |--------------------------------------------------------------------------
        */

        // If start date is in the future, it is a Scheduled plan
        // Start and end dates chosen by user are respected


        /*
        |--------------------------------------------------------------------------
        | EXPIRE CURRENT ACTIVE MEMBERSHIP
        |--------------------------------------------------------------------------
        |
        | IMPORTANT:
        |
        | PT assignment does NOT expire the normal membership.
        |
        | It only replaces an older PT membership if one already exists.
        |--------------------------------------------------------------------------
        */

        if (start <= todayEnd) {

            if (isNewPlanPT) {

                await MemberMembership.updateMany(
                    {
                        memberId,
                        membershipStatus:
                            "Active",
                        isPTConversion:
                            true
                    },
                    {
                        $set: {
                            membershipStatus:
                                "Expired"
                        }
                    }
                );

            } else {

                await MemberMembership.updateMany(
                    {
                        memberId,
                        membershipStatus:
                            "Active",
                        isPTConversion: {
                            $ne: true
                        }
                    },
                    {
                        $set: {
                            membershipStatus:
                                "Expired"
                        }
                    }
                );
            }
        }

        /*
        |--------------------------------------------------------------------------
        | PAID UNTIL DATE
        |--------------------------------------------------------------------------
        */

        if (paidUntilDate) {

            const pDate =
                parseDateOnly(
                    paidUntilDate
                );

            if (!pDate) {
                return res.status(400).json({
                    message:
                        "Invalid paid until date."
                });
            }

            if (pDate > end) {
                return res.status(400).json({
                    message:
                        "Paid until date cannot be after membership end date."
                });
            }

            if (pDate < start) {
                return res.status(400).json({
                    message:
                        "Paid until date cannot be before membership start date."
                });
            }
        }

        /*
        |--------------------------------------------------------------------------
        | PRICING
        |--------------------------------------------------------------------------
        */

        const originalPrice =
            (
                req.body.originalPrice !==
                    undefined &&
                req.body.originalPrice !==
                    null &&
                req.body.originalPrice !== ""
            )
                ? Number(
                    req.body.originalPrice
                )
                : plan.price;

        const discountAmount =
            Number(discount) || 0;

        const finalPrice =
            Math.max(
                0,
                originalPrice -
                    discountAmount
            );

        const paid =
            Number(amountPaid) || 0;

        const walletVal =
            Number(walletUsed) || 0;

        /*
        |--------------------------------------------------------------------------
        | WALLET VALIDATION
        |--------------------------------------------------------------------------
        */

        if (walletVal > 0) {

            if (
                (member.walletBalance || 0) <
                walletVal
            ) {
                return res.status(400).json({
                    message:
                        "Insufficient wallet balance."
                });
            }
        }

        const totalPaid =
            paid + walletVal;

        /*
        |--------------------------------------------------------------------------
        | PAYMENT STATUS
        |--------------------------------------------------------------------------
        */

        let paymentStatus =
            "Pending";

        if (
            totalPaid >= finalPrice &&
            finalPrice > 0
        ) {
            paymentStatus =
                "Paid";

        } else if (
            totalPaid > 0
        ) {
            paymentStatus =
                "Partial";
        }

        if (finalPrice === 0) {
            paymentStatus =
                "Paid";
        }

        /*
        |--------------------------------------------------------------------------
        | PAID UNTIL
        |--------------------------------------------------------------------------
        */

        let calculatedPaidUntilDate =
            null;

        let extraAmountToWallet =
            0;

        let actualAllocatedPaidAmount =
            totalPaid;

        if (
            paymentStatus ===
            "Paid"
        ) {

            calculatedPaidUntilDate =
                end;

        } else if (
            paidUntilDate
        ) {

            calculatedPaidUntilDate =
                parseDateOnly(
                    paidUntilDate
                );

        } else if (
            paymentStatus ===
                "Partial" &&
            finalPrice > 0
        ) {

            const totalDays =
                getInclusiveDays(
                    start,
                    end
                );

            const perDayCost =
                finalPrice /
                totalDays;

            const exactDays =
                totalPaid /
                perDayCost;

            const floorDays =
                Math.floor(
                    exactDays
                );

            const costForFloorDays =
                Number(
                    (
                        floorDays *
                        perDayCost
                    ).toFixed(2)
                );

            extraAmountToWallet =
                Number(
                    (
                        totalPaid -
                        costForFloorDays
                    ).toFixed(2)
                );

            if (
                extraAmountToWallet > 0
            ) {
                actualAllocatedPaidAmount =
                    costForFloorDays;
            }

            const allocatedDays =
                Math.max(
                    1,
                    floorDays
                );

            calculatedPaidUntilDate =
                addCalendarDays(
                    start,
                    allocatedDays - 1
                );

        } else if (
            paymentStatus ===
            "Pending"
        ) {

            calculatedPaidUntilDate =
                new Date(start);
        }

        /*
        |--------------------------------------------------------------------------
        | MEMBERSHIP STATUS
        |--------------------------------------------------------------------------
        */

        const calculatedMembershipStatus =
            start <= todayEnd
                ? "Active"
                : "Scheduled";

        /*
        |--------------------------------------------------------------------------
        | CREATE MEMBERSHIP
        |--------------------------------------------------------------------------
        */

        const membership =
            await MemberMembership.create({

                gymId,

                memberId,

                membershipPlanId,

                planName:
                    plan.name,

                duration:
                    plan.duration,

                durationUnit:
                    plan.durationUnit,

                totalSessions:
                    Number(totalSessions) ||
                    plan.sessions ||
                    0,

                usedSessions: 0,

                startDate:
                    start,

                endDate:
                    end,

                originalPrice:
                    originalPrice,

                discount:
                    discountAmount,

                finalPrice:
                    finalPrice,

                paidAmount:
                    actualAllocatedPaidAmount,

                totalCollected:
                    totalPaid,

                balanceAmount:
                    Math.max(
                        0,
                        finalPrice -
                            actualAllocatedPaidAmount
                    ),

                paidUntilDate:
                    calculatedPaidUntilDate,

                paymentStatus:
                    paymentStatus,

                membershipStatus:
                    calculatedMembershipStatus,

                assignedBy:
                    req.user.id,

                trainerId:
                    trainerId ||
                    undefined,

                salesPersonId:
                    salesPersonId ||
                    undefined,

                reference:
                    reference ||
                    undefined,

                /*
                | PT ADD-ON LINK
                */
                parentMembershipId:
                    parentMembershipId ||
                    undefined,

                isPTConversion:
                    Boolean(
                        isNewPlanPT
                    ),

                bonusDays:
                    Number(bonusDays) ||
                    0,

                bonusHistory:
                    Number(bonusDays) > 0
                        ? [
                            {
                                days:
                                    Number(
                                        bonusDays
                                    ),

                                reason:
                                    "Welcome/Referral Bonus",

                                addedBy:
                                    req.user.id
                            }
                        ]
                        : []
            });

        /*
        |--------------------------------------------------------------------------
        | UPDATE WALLET
        |--------------------------------------------------------------------------
        */

        if (
            walletVal > 0 ||
            extraAmountToWallet > 0
        ) {

            member.walletBalance = Math.round((
                Math.max(
                    0,
                    (
                        member.walletBalance ||
                        0
                    ) - walletVal
                ) +
                Math.max(
                    0,
                    extraAmountToWallet
                )
            ) * 100) / 100;
        }

        /*
        |--------------------------------------------------------------------------
        | SYNC MEMBER
        |--------------------------------------------------------------------------
        |
        | PT MUST NOT replace:
        |
        | member.membershipPlan
        | member.planStartDate
        | member.planEndDate
        |
        | because those belong to the normal membership.
        |--------------------------------------------------------------------------
        */

        if (
            calculatedMembershipStatus ===
            "Active" &&
            !isNewPlanPT
        ) {

            member.status =
                "Active";

            member.membershipPlan =
                membershipPlanId;

            member.planStartDate =
                start;

            member.planEndDate =
                end;

            member.paymentStatus =
                paymentStatus;

        } else if (
            calculatedMembershipStatus ===
            "Active"
        ) {

            // PT is an additional membership.
            // Keep the existing normal membership intact.
            member.status =
                "Active";
        }

        await member.save();

        /*
        |--------------------------------------------------------------------------
        | TRANSACTION
        |--------------------------------------------------------------------------
        */

        if (totalPaid > 0) {

            await Transaction.create({

                gymId,

                memberId,

                membershipId:
                    membership._id,

                planId:
                    membershipPlanId,

                collectedBy:
                    req.user.id ||
                    req.user._id,

                amountPaid:
                    totalPaid,

                cashAmount:
                    paid,

                walletAmount:
                    walletVal,

                paymentMode:
                    walletVal > 0 &&
                    paid > 0
                        ? "Mixed"
                        : walletVal > 0
                            ? "Wallet Cash"
                            : (
                                req.body
                                    .paymentMode ||
                                "Cash"
                            ),

                transactionId:
                    req.body
                        .transactionId ||
                    `TRX-${Date.now()}`,

                paymentStatus:
                    paymentStatus ===
                    "Paid"
                        ? "Paid"
                        : "Partial",

                paymentDate:
                    req.body.paymentDate
                        ? new Date(
                            req.body.paymentDate
                        )
                        : new Date()
            });
        }

        /*
        |--------------------------------------------------------------------------
        | SOCKET
        |--------------------------------------------------------------------------
        */

        try {
            notifyGym(gymId, {
                title:
                    "Membership Assigned",

                description:
                    `${member.firstName} ${
                        member.lastName || ""
                    } assigned to ${
                        plan.name
                    }${
                        isNewPlanPT
                            ? " (PT Add-on)"
                            : ""
                    } (${paymentStatus} - ₹${totalPaid})`,

                type:
                    "MEMBERSHIP",

                targetId:
                    member._id,

                link:
                    `/dashboard/owner/members/view/${member._id}`
            });

        } catch (socketError) {

            console.error(
                "Membership socket error:",
                socketError
            );
        }

        return res.status(201).json({
            message:
                "Membership assigned successfully.",
            membership
        });

    } catch (err) {

        console.error(
            "assignMembership error:",
            err
        );

        return res.status(500).json({
            message:
                "Server Error"
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
            return res.status(400).json({
                message: "At least one membership plan is required."
            });
        }

        const membershipPlanId = membershipPlans[0];

        const membership =
            await MemberMembership.findOne({
                _id: membershipId,
                gymId
            });

        if (!membership) {
            return res.status(404).json({
                message: "Membership assignment not found."
            });
        }

        const plan =
            await MembershipPlan.findOne({
                _id: membershipPlanId,
                gymId
            });

        if (!plan) {
            return res.status(404).json({
                message: "Membership plan not found."
            });
        }

        const start =
            parseDateOnly(planStartDate) ||
            new Date(planStartDate);

        const end =
            planEndDate
                ? (
                    parseDateOnly(planEndDate) ||
                    new Date(planEndDate)
                )
                : new Date(start);

        const originalPrice =
            (
                req.body.originalPrice !== undefined &&
                req.body.originalPrice !== null &&
                req.body.originalPrice !== ''
            )
                ? Number(req.body.originalPrice)
                : plan.price;

        const discountAmount =
            Number(discount) || 0;

        const finalPrice =
            Math.max(
                0,
                originalPrice - discountAmount
            );

        const additionalPaid =
            Number(req.body.amountPaid) || 0;

        const newPaidAmount =
            (membership.paidAmount || 0) +
            additionalPaid;

        const balanceAmount =
            Math.max(
                0,
                finalPrice - newPaidAmount
            );

        let paymentStatus = "Pending";

        if (
            newPaidAmount >= finalPrice &&
            finalPrice > 0
        ) {
            paymentStatus = "Paid";
        } else if (
            newPaidAmount > 0
        ) {
            paymentStatus = "Partial";
        }

        if (finalPrice === 0) {
            paymentStatus = "Paid";
        }

        const todayStart = getTodayStart();
        const todayEnd = getTodayEnd();

        let calculatedMembershipStatus = membership.membershipStatus;
        if (membership.membershipStatus !== "Frozen" && membership.membershipStatus !== "Cancelled") {
            if (end < todayStart) {
                calculatedMembershipStatus = "Expired";
            } else if (start > todayEnd) {
                calculatedMembershipStatus = "Scheduled";
            } else {
                calculatedMembershipStatus = "Active";
            }
        }

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

        if (req.body.trainerId !== undefined) {
            membership.trainerId = req.body.trainerId || undefined;
        }
        if (req.body.salesPersonId !== undefined) {
            membership.salesPersonId = req.body.salesPersonId || undefined;
        }
        if (req.body.reference !== undefined) {
            membership.reference = req.body.reference || undefined;
        }
        if (req.body.notes !== undefined) {
            membership.notes = req.body.notes || undefined;
        }
        if (req.body.bonusDays !== undefined) {
            membership.bonusDays = Number(req.body.bonusDays) || 0;
        }
        if (req.body.isPTConversion !== undefined) {
            membership.isPTConversion = Boolean(req.body.isPTConversion);
        }

        // Paid until date calculation
        if (paymentStatus === "Paid") {
            membership.paidUntilDate = end;
        } else if (req.body.paidUntilDate) {
            membership.paidUntilDate = parseDateOnly(req.body.paidUntilDate);
        } else if (paymentStatus === "Partial" && finalPrice > 0) {
            const totalDays = getInclusiveDays(start, end);
            const perDayCost = finalPrice / totalDays;
            const floorDays = Math.floor(newPaidAmount / perDayCost);
            const allocatedDays = Math.max(1, floorDays);
            membership.paidUntilDate = addCalendarDays(start, allocatedDays - 1);
        } else if (paymentStatus === "Pending") {
            membership.paidUntilDate = new Date(start);
        }

        membership.membershipStatus = calculatedMembershipStatus;

        await membership.save();

        /*
        |--------------------------------------------------------------------------
        | SYNC MEMBER MODEL
        |--------------------------------------------------------------------------
        */
        const member = await Member.findOne({ _id: membership.memberId, gymId });
        if (member) {
            if (calculatedMembershipStatus === "Active" && !membership.isPTConversion) {
                member.status = "Active";
                member.membershipPlan = membershipPlanId;
                member.planStartDate = start;
                member.planEndDate = end;
                member.paymentStatus = paymentStatus;
                member.paidUntilDate = membership.paidUntilDate;
                if (req.body.trainerId) member.trainerId = req.body.trainerId;
                if (req.body.salesPersonId) member.referredByStaff = req.body.salesPersonId;
                await member.save();
            } else if (calculatedMembershipStatus === "Active" && membership.isPTConversion) {
                member.status = "Active";
                await member.save();
            } else if (calculatedMembershipStatus === "Scheduled") {
                const otherActive = await MemberMembership.findOne({
                    memberId: member._id,
                    _id: { $ne: membership._id },
                    membershipStatus: "Active",
                    isPTConversion: { $ne: true }
                });
                if (!otherActive) {
                    member.status = "Inactive";
                    await member.save();
                }
            } else if (calculatedMembershipStatus === "Expired") {
                const otherActive = await MemberMembership.findOne({
                    memberId: member._id,
                    _id: { $ne: membership._id },
                    membershipStatus: "Active",
                    isPTConversion: { $ne: true }
                });
                if (!otherActive) {
                    member.status = "Expired";
                    await member.save();
                }
            }
        }

        /*
        |--------------------------------------------------------------------------
        | ADDITIONAL PAYMENT TRANSACTION
        |--------------------------------------------------------------------------
        */

        if (additionalPaid > 0) {

            await Transaction.create({
                gymId,

                memberId:
                    membership.memberId,

                membershipId:
                    membership._id,

                planId:
                    membershipPlanId,

                collectedBy:
                    req.user.id ||
                    req.user._id,

                amountPaid:
                    additionalPaid,

                cashAmount:
                    additionalPaid,

                paymentMode:
                    req.body.paymentMode ||
                    'Cash',

                transactionId:
                    req.body.transactionId ||
                    `TRX-${Date.now()}`,

                paymentStatus:
                    'Paid',

                paymentDate:
                    new Date()
            });
        }

        /*
        |--------------------------------------------------------------------------
        | SOCKET
        |--------------------------------------------------------------------------
        */

        try {

            const memberInfo =
                await Member.findById(
                    membership.memberId
                ).select(
                    'firstName lastName memberId'
                );

            const mName =
                memberInfo
                    ? `${memberInfo.firstName} ${
                        memberInfo.lastName || ''
                    }`.trim()
                    : 'Member';

            notifyGym(gymId, {

                title:
                    `Membership Plan Updated: ${mName}`,

                description:
                    `Plan: ${plan.name} ` +
                    `(Status: ${paymentStatus} • ` +
                    `Balance: ₹${balanceAmount}).`,

                type:
                    'MEMBERSHIP',

                targetId:
                    membership.memberId,

                link:
                    `/dashboard/owner/membership`
            });

        } catch (sErr) {

            console.error(
                "Socket error:",
                sErr
            );
        }

        return res.status(200).json({
            message:
                "Membership updated successfully.",

            membership
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            message:
                "Server Error"
        });
    }
};


// @desc    Add Payment to Membership
// @route   POST /api/member-memberships/:id/payment
// @access  Private
exports.addPayment = async (req, res) => {

    try {

        const gymId =
            req.user.gymId;

        const membershipId =
            req.params.id;

        const {
            amountPaid,
            walletUsed,
            paidUntilDate,
            paymentMode,
            transactionId
        } = req.body;

        const membership =
            await MemberMembership.findOne({
                _id: membershipId,
                gymId
            }).populate('memberId');

        if (!membership) {

            return res.status(404).json({
                message:
                    "Membership assignment not found."
            });
        }

        const member =
            membership.memberId;

        if (!member) {

            return res.status(404).json({
                message:
                    "Member not found."
            });
        }

        const paid =
            Number(amountPaid) || 0;

        const walletVal =
            Number(walletUsed) || 0;

        /*
        |--------------------------------------------------------------------------
        | WALLET VALIDATION
        |--------------------------------------------------------------------------
        */

        if (walletVal > 0) {

            if (
                (member.walletBalance || 0) <
                walletVal
            ) {

                return res.status(400).json({
                    message:
                        "Insufficient wallet balance."
                });
            }
        }

        const totalPaid =
            paid + walletVal;

        if (totalPaid <= 0) {

            return res.status(400).json({
                message:
                    "Payment amount must be greater than zero."
            });
        }

        /*
        |--------------------------------------------------------------------------
        | PAID UNTIL DATE VALIDATION
        |--------------------------------------------------------------------------
        */

        if (paidUntilDate) {

            const pDate =
                parseDateOnly(paidUntilDate) ||
                new Date(paidUntilDate);

            if (
                pDate >
                membership.endDate
            ) {

                return res.status(400).json({
                    message:
                        "Paid until date cannot be after membership end date."
                });
            }

            if (
                pDate <
                membership.startDate
            ) {

                return res.status(400).json({
                    message:
                        "Paid until date cannot be before membership start date."
                });
            }
        }

        /*
        |--------------------------------------------------------------------------
        | UPDATE PAYMENT
        |--------------------------------------------------------------------------
        */

        membership.paidAmount =
            (membership.paidAmount || 0) +
            totalPaid;

        membership.balanceAmount =
            Math.max(
                0,
                membership.finalPrice -
                membership.paidAmount
            );

        let paymentStatus =
            "Pending";

        if (
            membership.paidAmount >=
                membership.finalPrice &&
            membership.finalPrice > 0
        ) {

            paymentStatus =
                "Paid";

        } else if (
            membership.paidAmount > 0
        ) {

            paymentStatus =
                "Partial";
        }

        if (
            membership.finalPrice === 0
        ) {

            paymentStatus =
                "Paid";
        }

        membership.paymentStatus =
            paymentStatus;

        /*
        |--------------------------------------------------------------------------
        | PAID UNTIL DATE CALCULATION
        |--------------------------------------------------------------------------
        */

        let calculatedPaidUntilDate =
            null;

        let extraAmountToWallet =
            0;

        if (
            paymentStatus ===
            'Paid'
        ) {

            calculatedPaidUntilDate =
                membership.endDate;

        } else if (
            paidUntilDate
        ) {

            calculatedPaidUntilDate =
                parseDateOnly(
                    paidUntilDate
                ) ||
                new Date(
                    paidUntilDate
                );

        } else if (
            paymentStatus ===
                'Partial' &&
            membership.finalPrice > 0
        ) {

            const totalDays =
                getInclusiveDays(
                    membership.startDate,
                    membership.endDate
                );

            const perDayCost =
                membership.finalPrice /
                totalDays;

            const totalCumulativePaid =
                membership.paidAmount;

            const exactDays =
                totalCumulativePaid /
                perDayCost;

            const floorDays =
                Math.floor(
                    exactDays
                );

            const costForFloorDays =
                Number(
                    (
                        floorDays *
                        perDayCost
                    ).toFixed(2)
                );

            extraAmountToWallet =
                Number(
                    (
                        totalCumulativePaid -
                        costForFloorDays
                    ).toFixed(2)
                );

            membership.paidAmount =
                costForFloorDays;

            membership.balanceAmount =
                Math.max(
                    0,
                    membership.finalPrice -
                    membership.paidAmount
                );

            calculatedPaidUntilDate =
                addCalendarDays(
                    membership.startDate,
                    Math.max(
                        1,
                        floorDays
                    ) - 1
                );

        } else if (
            paymentStatus ===
            'Pending'
        ) {

            calculatedPaidUntilDate =
                new Date(
                    membership.startDate
                );
        }

        membership.paidUntilDate =
            calculatedPaidUntilDate;

        membership.totalCollected =
            (membership.totalCollected || 0) +
            totalPaid;

        await membership.save();

        /*
        |--------------------------------------------------------------------------
        | WALLET UPDATE
        |--------------------------------------------------------------------------
        */

        if (
            walletVal > 0 ||
            extraAmountToWallet > 0
        ) {

            member.walletBalance = Math.round((
                Math.max(
                    0,
                    (member.walletBalance || 0) -
                    walletVal
                ) +
                extraAmountToWallet
            ) * 100) / 100;
        }

        /*
        |--------------------------------------------------------------------------
        | MEMBER PAYMENT STATUS
        |--------------------------------------------------------------------------
        */

        member.paymentStatus =
            paymentStatus;

        if (
            membership.membershipStatus ===
            'Active'
        ) {

            member.status =
                'Active';
        }

        await member.save();

        /*
        |--------------------------------------------------------------------------
        | PAYMENT TRANSACTION
        |--------------------------------------------------------------------------
        */

        await Transaction.create({

            gymId,

            memberId:
                member._id,

            membershipId:
                membership._id,

            planId:
                membership.membershipPlanId,

            collectedBy:
                req.user.id ||
                req.user._id,

            amountPaid:
                totalPaid,

            cashAmount:
                paid,

            walletAmount:
                walletVal,

            paymentMode:
                walletVal > 0 &&
                paid > 0
                    ? 'Mixed'
                    : walletVal > 0
                        ? 'Wallet Cash'
                        : (
                            paymentMode ||
                            'Cash'
                        ),

            transactionId:
                transactionId ||
                `TRX-${Date.now()}`,

            paymentStatus:
                paymentStatus === 'Paid'
                    ? 'Paid'
                    : 'Partial',

            paymentDate:
                req.body.paymentDate
                    ? new Date(
                        req.body.paymentDate
                    )
                    : new Date()
        });

        /*
        |--------------------------------------------------------------------------
        | SOCKET
        |--------------------------------------------------------------------------
        */

        try {

            notifyGym(gymId, {

                title:
                    `Fee Collected: ₹${totalPaid}`,

                description:
                    `Payment of ₹${totalPaid} recorded for ${
                        member.firstName
                    } ${
                        member.lastName || ''
                    } (${
                        membership.planName ||
                        'Plan'
                    }).`,

                type:
                    'PAYMENT',

                targetId:
                    member._id,

                link:
                    `/dashboard/owner/finance`
            });

        } catch (sErr) {

            console.error(
                "Socket error:",
                sErr
            );
        }

        return res.status(200).json({

            message:
                "Payment added successfully.",

            membership
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            message:
                "Server Error"
        });
    }
};


// @desc    Add Bonus Days to Membership
// @route   POST /api/member-memberships/:id/bonus
// @access  Private
exports.addBonusDays = async (req, res) => {

    try {

        const gymId =
            req.user.gymId;

        const membershipId =
            req.params.id;

        const {
            days,
            reason
        } = req.body;

        if (
            days === undefined ||
            days === '' ||
            Number(days) === 0 ||
            !reason
        ) {

            return res.status(400).json({
                message:
                    "Valid days (positive or negative) and reason are required."
            });
        }

        const membership =
            await MemberMembership.findOne({
                _id: membershipId,
                gymId
            });

        if (!membership) {

            return res.status(404).json({
                message:
                    "Membership assignment not found."
            });
        }

        /*
        |--------------------------------------------------------------------------
        | ADD DAYS TO DATES
        |--------------------------------------------------------------------------
        */

        const bonusMs =
            Number(days) *
            24 *
            60 *
            60 *
            1000;

        if (membership.endDate) {

            membership.endDate =
                new Date(
                    new Date(
                        membership.endDate
                    ).getTime() +
                    bonusMs
                );
        }

        if (
            membership.paidUntilDate
        ) {

            membership.paidUntilDate =
                new Date(
                    new Date(
                        membership.paidUntilDate
                    ).getTime() +
                    bonusMs
                );
        }

        membership.bonusDays =
            (membership.bonusDays || 0) +
            Number(days);

        membership.bonusHistory.push({

            days:
                Number(days),

            reason:
                reason,

            date:
                new Date(),

            addedBy:
                req.user.id
        });

        await membership.save();

        /*
        |--------------------------------------------------------------------------
        | SOCKET
        |--------------------------------------------------------------------------
        */

        try {

            const mBonusInfo =
                await Member.findById(
                    membership.memberId
                ).select(
                    'firstName lastName memberId'
                );

            const mBonusName =
                mBonusInfo
                    ? `${mBonusInfo.firstName} ${
                        mBonusInfo.lastName || ''
                    }`.trim()
                    : 'Member';

            notifyGym(gymId, {

                title:
                    `Bonus Days Added: +${days} Days`,

                description:
                    `${days} days added to ${
                        mBonusName
                    } (${
                        membership.planName ||
                        'Plan'
                    }). Reason: ${
                        reason
                    }.`,

                type:
                    'MEMBERSHIP',

                targetId:
                    membership.memberId,

                link:
                    `/dashboard/owner/membership`
            });

        } catch (sErr) {

            console.error(
                "Socket error:",
                sErr
            );
        }

        return res.status(200).json({

            message:
                `Successfully added ${days} bonus days.`,

            membership
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            message:
                "Server Error"
        });
    }
};


// @desc    Mark a PT session completed / used (+1)
// @route   POST /api/member-memberships/:id/use-session
// @access  Private
exports.markPTSessionUsed = async (req, res) => {

    try {

        const gymId =
            req.user.gymId;

        const membershipId =
            req.params.id;

        const {
            notes
        } = req.body;

        const membership =
            await MemberMembership.findOne({
                _id: membershipId,
                gymId
            });

        if (!membership) {

            return res.status(404).json({
                message:
                    "Membership assignment not found."
            });
        }

        /*
        |--------------------------------------------------------------------------
        | SESSION LIMIT
        |--------------------------------------------------------------------------
        */

        if (
            membership.totalSessions > 0 &&
            membership.usedSessions >=
                membership.totalSessions
        ) {

            return res.status(400).json({
                message:
                    "All sessions for this package have already been completed."
            });
        }

        membership.usedSessions =
            (membership.usedSessions || 0) +
            1;

        membership.sessionLogs.push({

            date:
                new Date(),

            trainerId:
                membership.trainerId ||
                req.user.id,

            notes:
                notes ||
                'PT Session Completed',

            loggedBy:
                req.user.id
        });

        await membership.save();

        /*
        |--------------------------------------------------------------------------
        | SOCKET
        |--------------------------------------------------------------------------
        */

        try {

            const mPtInfo =
                await Member.findById(
                    membership.memberId
                ).select(
                    'firstName lastName memberId'
                );

            const mPtName =
                mPtInfo
                    ? `${mPtInfo.firstName} ${
                        mPtInfo.lastName || ''
                    }`.trim()
                    : 'Member';

            notifyGym(gymId, {

                title:
                    `PT Session Completed: ${mPtName}`,

                description:
                    `Session ${
                        membership.usedSessions
                    }/${
                        membership.totalSessions ||
                        '∞'
                    } completed with trainer. Notes: ${
                        notes ||
                        'Completed'
                    }.`,

                type:
                    'MEMBERSHIP',

                targetId:
                    membership.memberId,

                link:
                    `/dashboard/owner/membership`
            });

        } catch (sErr) {

            console.error(
                "Socket error:",
                sErr
            );
        }

        return res.status(200).json({

            message:
                `PT Session logged successfully. (${
                    membership.usedSessions
                }/${
                    membership.totalSessions ||
                    '∞'
                } completed)`,

            membership
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            message:
                "Server Error"
        });
    }
};


// @desc    Freeze / Unfreeze Membership & Extend End Dates Automatically
// @route   POST /api/member-memberships/:id/freeze
// @access  Private
exports.toggleFreezeMembership = async (req, res) => {

    try {

        const gymId =
            req.user.gymId;

        const membershipId =
            req.params.id;

        const {
            reason
        } = req.body;

        const membership =
            await MemberMembership.findOne({
                _id: membershipId,
                gymId
            });

        if (!membership) {

            return res.status(404).json({
                message:
                    "Membership assignment not found."
            });
        }

        const now =
            new Date();

        /*
        |--------------------------------------------------------------------------
        | UNFREEZE
        |--------------------------------------------------------------------------
        */

        if (
            membership.membershipStatus ===
            'Frozen'
        ) {

            const freezeStart =
                membership.freezeDate
                    ? new Date(
                        membership.freezeDate
                    )
                    : now;

            const diffMs =
                now.getTime() -
                freezeStart.getTime();

            const daysFrozen =
                Math.max(
                    1,
                    Math.ceil(
                        diffMs /
                        (
                            1000 *
                            60 *
                            60 *
                            24
                        )
                    )
                );

            if (membership.endDate) {

                membership.endDate =
                    new Date(
                        new Date(
                            membership.endDate
                        ).getTime() +
                        (
                            daysFrozen *
                            24 *
                            60 *
                            60 *
                            1000
                        )
                    );
            }

            if (
                membership.paidUntilDate
            ) {

                membership.paidUntilDate =
                    new Date(
                        new Date(
                            membership.paidUntilDate
                        ).getTime() +
                        (
                            daysFrozen *
                            24 *
                            60 *
                            60 *
                            1000
                        )
                    );
            }

            membership.membershipStatus =
                'Active';

            membership.freezeDate =
                null;

            const lastHistory =
                membership.freezeHistory[
                    membership.freezeHistory.length - 1
                ];

            if (
                lastHistory &&
                !lastHistory.unfreezeDate
            ) {

                lastHistory.unfreezeDate =
                    now;

                lastHistory.daysFrozen =
                    daysFrozen;

            } else {

                membership.freezeHistory.push({

                    freezeDate:
                        freezeStart,

                    unfreezeDate:
                        now,

                    daysFrozen:
                        daysFrozen,

                    reason:
                        reason ||
                        'Unfrozen by Admin',

                    actionBy:
                        req.user.id
                });
            }

            await membership.save();

            /*
            |--------------------------------------------------------------------------
            | SOCKET
            |--------------------------------------------------------------------------
            */

            try {

                notifyGym(gymId, {

                    title:
                        'Membership Unfrozen',

                    description:
                        `Membership for ${
                            membership.planName
                        } unfrozen. Extended by ${
                            daysFrozen
                        } days.`,

                    type:
                        'MEMBERSHIP',

                    targetId:
                        membership.memberId,

                    link:
                        `/dashboard/owner/members/view/${
                            membership.memberId
                        }`
                });

            } catch (sErr) {

                console.error(
                    "Socket error:",
                    sErr
                );
            }

            return res.status(200).json({

                message:
                    `Membership Unfrozen! End date extended by ${
                        daysFrozen
                    } days to ${
                        new Date(
                            membership.endDate
                        ).toLocaleDateString()
                    }`,

                membership
            });
        }

        /*
        |--------------------------------------------------------------------------
        | FREEZE
        |--------------------------------------------------------------------------
        */

        if (
            membership.membershipStatus ===
            'Active'
        ) {

            membership.membershipStatus =
                'Frozen';

            membership.freezeDate =
                now;

            membership.freezeHistory.push({

                freezeDate:
                    now,

                unfreezeDate:
                    null,

                daysFrozen:
                    0,

                reason:
                    reason ||
                    'Frozen by Admin',

                actionBy:
                    req.user.id
            });

            await membership.save();

            try {

                notifyGym(gymId, {

                    title:
                        'Membership Frozen',

                    description:
                        `Membership for ${
                            membership.planName
                        } has been frozen.`,

                    type:
                        'MEMBERSHIP',

                    targetId:
                        membership.memberId,

                    link:
                        `/dashboard/owner/members/view/${
                            membership.memberId
                        }`
                });

            } catch (sErr) {

                console.error(
                    "Socket error:",
                    sErr
                );
            }

            return res.status(200).json({

                message:
                    "Membership frozen successfully.",

                membership
            });
        }

        return res.status(400).json({

            message:
                `Membership cannot be frozen/unfrozen while its status is ${membership.membershipStatus}.`
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            message:
                "Server Error"
        });
    }
};

// @desc Get Latest Memberships
// @route GET /api/member-memberships/latest
// @access Private
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

        const now = getTodayStart();
        const todayEnd = getTodayEnd();

        memberships.forEach(m => {

            const memberIdStr =
                m.memberId?._id?.toString() ||
                m.memberId?.toString();

            if (
                memberIdStr &&
                !latestMap.has(memberIdStr)
            ) {

                const endDate =
                    new Date(m.endDate);

                endDate.setHours(
                    23,
                    59,
                    59,
                    999
                );

                let computedStatus =
                    m.membershipStatus;

                if (
                    computedStatus !== 'Frozen' &&
                    computedStatus !== 'Cancelled'
                ) {

                    if (
                        m.paymentStatus === 'Pending' &&
                        (m.paidAmount || 0) <= 0
                    ) {

                        computedStatus =
                            'Pending';

                    } else if (
                        endDate < now
                    ) {

                        computedStatus =
                            'Expired';

                    } else if (
                        new Date(m.startDate) >
                        todayEnd
                    ) {

                        computedStatus =
                            'Scheduled';

                    } else {

                        computedStatus =
                            'Active';
                    }
                }

                const mObj =
                    m.toObject();

                mObj.computedStatus =
                    computedStatus;

                mObj.membershipStatus =
                    computedStatus;

                latestMap.set(
                    memberIdStr,
                    mObj
                );
            }
        });

        res.json(
            Array.from(
                latestMap.values()
            )
        );

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message:
                "Server Error"
        });
    }
};


// @desc Get Active Memberships
// @route GET /api/member-memberships/active
// @access Private
exports.getActiveMemberships = async (req, res) => {

    try {

        const todayEnd =
            getTodayEnd();

        const memberships =
            await MemberMembership.find({

                gymId:
                    req.user.gymId,

                membershipStatus:
                    {
                        $in: [
                            "Active",
                            "Scheduled"
                        ]
                    },

                endDate:
                    {
                        $gte:
                            getTodayStart()
                    }

            })
                .populate("memberId")
                .populate("membershipPlanId")
                .populate(
                    "trainerId",
                    "name email phone role"
                )
                .populate(
                    "salesPersonId",
                    "name email phone role"
                )
                .sort({
                    createdAt:
                        -1
                });

        const processed =
            memberships.map(m => {

                const mObj =
                    m.toObject();

                if (
                    mObj.membershipStatus !==
                        'Frozen' &&
                    mObj.membershipStatus !==
                        'Cancelled'
                ) {

                    if (
                        new Date(
                            mObj.startDate
                        ) <= todayEnd
                    ) {

                        mObj.membershipStatus =
                            'Active';

                    } else {

                        mObj.membershipStatus =
                            'Scheduled';
                    }
                }

                return mObj;
            });

        res.json(processed);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message:
                "Server Error"
        });
    }
};


// @desc Get Membership History of Member
// @route GET /api/member-memberships/member/:memberId
// @access Private
exports.getMemberMembershipHistory = async (
    req,
    res
) => {

    try {

        const todayStart =
            getTodayStart();

        const todayEnd =
            getTodayEnd();

        const memberships =
            await MemberMembership.find({

                gymId:
                    req.user.gymId,

                memberId:
                    req.params.memberId

            })
                .populate(
                    "membershipPlanId"
                )
                .populate(
                    "trainerId",
                    "name email phone role"
                )
                .populate(
                    "salesPersonId",
                    "name email phone role"
                )
                .sort({
                    startDate:
                        -1
                });

        const processed =
            memberships.map(m => {

                const mObj =
                    m.toObject();

                if (
                    mObj.membershipStatus !==
                        'Frozen' &&
                    mObj.membershipStatus !==
                        'Cancelled'
                ) {

                    const start =
                        parseDateOnly(
                            mObj.startDate
                        );

                    const end =
                        parseDateOnly(
                            mObj.endDate
                        );

                    if (end) {

                        end.setHours(
                            23,
                            59,
                            59,
                            999
                        );
                    }

                    if (
                        end &&
                        end < todayStart
                    ) {

                        mObj.membershipStatus =
                            'Expired';

                    } else if (
                        start &&
                        start <= todayEnd
                    ) {

                        mObj.membershipStatus =
                            'Active';

                    } else if (
                        start &&
                        start > todayEnd
                    ) {

                        mObj.membershipStatus =
                            'Scheduled';
                    }
                }

                return mObj;
            });

        res.json(processed);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message:
                "Server Error"
        });
    }
};


// @desc Delete an assigned membership
// @route DELETE /api/member-memberships/:id
// @access Private
exports.deleteAssignedMembership = async (
    req,
    res
) => {

    try {

        const gymId =
            req.user.gymId;

        const membership =
            await MemberMembership.findOne({
                _id:
                    req.params.id,

                gymId
            });

        if (!membership) {

            return res.status(404).json({
                message:
                    "Membership assignment not found."
            });
        }

        const memberId =
            membership.memberId;

        /*
        |--------------------------------------------------------------------------
        | DELETE ASSOCIATED TRANSACTIONS
        |--------------------------------------------------------------------------
        */

        await Transaction.deleteMany({
            gymId,
            membershipId: membership._id
        });

        /*
        |--------------------------------------------------------------------------
        | DELETE MEMBERSHIP
        |--------------------------------------------------------------------------
        */

        await membership.deleteOne();

        /*
        |--------------------------------------------------------------------------
        | FIND REMAINING ACTIVE / SCHEDULED
        |--------------------------------------------------------------------------
        */

        const remainingActive =
            await MemberMembership.findOne({

                gymId,

                memberId,

                membershipStatus:
                    {
                        $in: [
                            'Active',
                            'Scheduled'
                        ]
                    }

            }).sort({
                createdAt:
                    -1
            });

        /*
        |--------------------------------------------------------------------------
        | UPDATE MEMBER MASTER RECORD
        |--------------------------------------------------------------------------
        */

        const member =
            await Member.findById(
                memberId
            );

        if (member) {

            if (
                remainingActive
            ) {

                member.status =
                    remainingActive
                        .membershipStatus;

                member.membershipPlan =
                    remainingActive
                        .membershipPlanId;

                member.planStartDate =
                    remainingActive
                        .startDate;

                member.planEndDate =
                    remainingActive
                        .endDate;

                member.paymentStatus =
                    remainingActive
                        .paymentStatus;

            } else {

                member.membershipPlan =
                    undefined;

                member.planStartDate =
                    undefined;

                member.planEndDate =
                    undefined;

                member.paymentStatus =
                    'Pending';
            }

            await member.save();
        }

        /*
        |--------------------------------------------------------------------------
        | SOCKET NOTIFICATION
        |--------------------------------------------------------------------------
        */

        notifyGym(
            gymId,
            {
                title:
                    'Membership Deleted',

                description:
                    `Membership assignment for ${
                        membership.planName
                    } was deleted.`,

                type:
                    'MEMBERSHIP',

                targetId:
                    memberId,

                link:
                    `/dashboard/owner/members/view/${
                        memberId
                    }`
            }
        );

        res.status(200).json({

            message:
                "Membership assignment deleted successfully."
        });

    } catch (err) {

        console.error(
            'deleteAssignedMembership error:',
            err
        );

        res.status(500).json({
            message:
                "Server Error"
        });
    }
};