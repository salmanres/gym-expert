const Member = require('../models/Member');
const Transaction = require('../models/Transaction');
const Enquiry = require('../models/Enquiry');
const Gym = require('../models/Gym');
const MemberMembership = require('../models/MemberMembership');

// @desc    Create new member
// @route   POST /api/members
// @access  Private
const createMember = async (req, res) => {
    try {
        const gymId = req.user.gymId;
        let memberId = req.body.memberId;
        if (!memberId) {
            const count = await Member.countDocuments({ gymId });
            memberId = `MEM-${(count + 1).toString().padStart(4, '0')}`;
        }

        let memberData = { ...req.body };
        
        // Clean ALL empty string fields to prevent Mongoose CastError for Numbers, Dates, ObjectIds
        Object.keys(memberData).forEach(key => {
            if (memberData[key] === '') {
                delete memberData[key];
            }
        });

        const newMember = new Member({
            ...memberData,
            memberId,
            gymId
        });

        const savedMember = await newMember.save();

        if (req.body.enquiryId) {
            await Enquiry.findByIdAndUpdate(req.body.enquiryId, { status: 'Converted', isMemberCreated: true });
        }

        // Process Custom / Flexible Referral Rewards (Bonus Days &/or Wallet Cash)
        if (req.body.referredBy) {
            try {
                const gym = await Gym.findById(gymId);
                const rewardType = req.body.referralRewardType || (gym ? gym.referralRewardType : 'Both');
                const bonusDays = req.body.referralBonusDays !== undefined ? Number(req.body.referralBonusDays) : (gym ? gym.referrerBonusDays : 7);
                const walletAmt = req.body.referralWalletAmount !== undefined ? Number(req.body.referralWalletAmount) : (gym ? gym.referrerWalletAmount : 200);

                const referrerMember = await Member.findById(req.body.referredBy);

                if (referrerMember) {
                    // 1. Grant Wallet Cash if selected
                    if ((rewardType === 'Wallet Cash' || rewardType === 'Both') && walletAmt > 0) {
                        referrerMember.walletBalance = (referrerMember.walletBalance || 0) + walletAmt;
                        await referrerMember.save();
                    }

                    // 2. Grant Bonus Days if selected
                    if ((rewardType === 'Bonus Days' || rewardType === 'Both') && bonusDays > 0) {
                        const referrerMembership = await MemberMembership.findOne({
                            gymId,
                            memberId: req.body.referredBy,
                            membershipStatus: 'Active'
                        }).sort({ createdAt: -1 });

                        if (referrerMembership && referrerMembership.endDate) {
                            const newEndDate = new Date(referrerMembership.endDate);
                            newEndDate.setDate(newEndDate.getDate() + bonusDays);
                            referrerMembership.endDate = newEndDate;
                            referrerMembership.bonusDaysAdded = (referrerMembership.bonusDaysAdded || 0) + bonusDays;
                            await referrerMembership.save();
                        }
                    }
                }
            } catch (refErr) {
                console.error("Referral reward processing error:", refErr);
            }
        }

        res.status(201).json(savedMember);
    } catch (error) {
        console.error('Error creating member:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all members for a gym
// @route   GET /api/members
// @access  Private
const getMembers = async (req, res) => {
    try {
        const gymId = req.user.gymId;
        const members = await Member.find({ gymId })
            .populate('referredBy', 'firstName lastName memberId contactNumber')
            .sort({ createdAt: -1 });
        res.status(200).json(members);
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get single member by ID
// @route   GET /api/members/:id
// @access  Private
const getMemberById = async (req, res) => {
    try {
        const member = await Member.findOne({
            _id: req.params.id,
            gymId: req.user.gymId
        })
            .populate('gymId')
            .populate('referredBy', 'firstName lastName memberId contactNumber');

        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }
        res.status(200).json(member);
    } catch (error) {
        console.error('Error fetching member:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all transactions for a gym
// @route   GET /api/members/transactions/all
// @access  Private
const getTransactions = async (req, res) => {
    try {
        // Backfill missing collectedBy on old transactions with req.user._id (or req.user.id)
        await Transaction.updateMany(
            { gymId: req.user.gymId, collectedBy: null },
            { $set: { collectedBy: req.user._id || req.user.id } }
        );

        let transactions = await Transaction.find({ 
            gymId: req.user.gymId,
            amountPaid: { $gt: 0 }
        })
            .populate('memberId', 'firstName lastName contactNumber memberId')
            .populate('planId', 'name')
            .populate('collectedBy', 'name email role')
            .sort({ paymentDate: -1 });

        // Auto-sync / backfill any existing MemberMembership payments that missed a Transaction record
        const activeMemberships = await MemberMembership.find({ 
            gymId: req.user.gymId, 
            paidAmount: { $gt: 0 } 
        })
            .populate('memberId', 'firstName lastName contactNumber memberId')
            .populate('membershipPlanId', 'name')
            .populate('assignedBy', 'name email role');

        const existingMemberTxIds = new Set(transactions.map(t => t.memberId?._id?.toString()));

        for (const m of activeMemberships) {
            if (m.memberId && m.paidAmount > 0 && !existingMemberTxIds.has(m.memberId._id.toString())) {
                const newTx = await Transaction.create({
                    gymId: req.user.gymId,
                    memberId: m.memberId._id,
                    planId: m.membershipPlanId?._id || null,
                    collectedBy: m.assignedBy?._id || req.user.id,
                    amountPaid: m.paidAmount,
                    paymentMode: 'Cash',
                    transactionId: `TRX-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                    paymentStatus: 'Paid',
                    paymentDate: m.createdAt || new Date()
                });
                const populatedTx = await Transaction.findById(newTx._id)
                    .populate('memberId', 'firstName lastName contactNumber memberId')
                    .populate('planId', 'name')
                    .populate('collectedBy', 'name email role');
                transactions.push(populatedTx);
            }
        }

        // Re-sort all transactions by date
        transactions.sort((a, b) => new Date(b.paymentDate || b.createdAt) - new Date(a.paymentDate || a.createdAt));

        res.status(200).json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateMember = async (req, res) => {
    try {
        const member = await Member.findById(req.params.id);

        if (!member) {
            return res.status(404).json({ message: "Member not found" });
        }

        // Ensure member belongs to logged-in gym
        if (member.gymId.toString() !== req.user.gymId.toString()) {
            return res.status(401).json({ message: "Not authorized" });
        }

        let updateData = { ...req.body };

        // Remove empty string values
        Object.keys(updateData).forEach((key) => {
            if (updateData[key] === "") {
                delete updateData[key];
            }
        });

        // Never allow these fields to be updated from Member API
        delete updateData.gymId;
        delete updateData.memberId;
        delete updateData.enquiryId;
        delete updateData.createdAt;
        delete updateData.updatedAt;

        if (req.body.walletUsed && Number(req.body.walletUsed) > 0) {
            updateData.walletBalance = Math.max(0, (member.walletBalance || 0) - Number(req.body.walletUsed));
        }

        const updatedMember = await Member.findByIdAndUpdate(
            req.params.id,
            updateData,
            {
                new: true,
                runValidators: true,
            }
        );

        if (req.body.recordTransaction && (Number(req.body.newPaymentAmount) > 0 || Number(req.body.walletUsed) > 0)) {
            const paid = Number(req.body.newPaymentAmount) || 0;
            const walletVal = Number(req.body.walletUsed) || 0;
            const totalPaid = paid + walletVal;
            
            // 1. Create Transaction ONLY if amount > 0
            await Transaction.create({
                gymId: req.user.gymId,
                memberId: member._id,
                planId: req.body.membershipPlan || null,
                collectedBy: req.user._id || req.user.id,
                amountPaid: totalPaid,
                paymentMode: walletVal > 0 && paid === 0 ? 'Wallet Cash' : (req.body.paymentMode || 'Cash'),
                transactionId: req.body.transactionId || `TRX-${Date.now()}`,
                paymentStatus: 'Paid',
                paymentDate: req.body.paymentDate || new Date()
            });

            // 2. Update MemberMembership
            const activePlan = await MemberMembership.findOne({ memberId: member._id, membershipStatus: "Active" }).sort({ createdAt: -1 });
            if (activePlan) {
                activePlan.paidAmount = Number(req.body.amountPaid) || 0;
                activePlan.balanceAmount = activePlan.finalPrice - activePlan.paidAmount;
                activePlan.paymentStatus = req.body.paymentStatus || activePlan.paymentStatus;
                if (req.body.paidUntilDate) {
                    activePlan.paidUntilDate = new Date(req.body.paidUntilDate);
                }

                if (req.body.bonusDaysAwarded && Number(req.body.bonusDaysAwarded) > 0) {
                    const bonus = Number(req.body.bonusDaysAwarded);
                    activePlan.bonusDaysAdded = (activePlan.bonusDaysAdded || 0) + bonus;
                    if (activePlan.endDate) {
                        const newEndDate = new Date(activePlan.endDate);
                        newEndDate.setDate(newEndDate.getDate() + bonus);
                        activePlan.endDate = newEndDate;
                    }
                }

                await activePlan.save();
            }
        }

        res.status(200).json(updatedMember);
    } catch (error) {
        console.error("Error updating member:", error);
        res.status(500).json({
            message: "Server error",
            error: error.message,
        });
    }
};

// @desc    Delete a member
// @route   DELETE /api/members/:id
// @access  Private
const deleteMember = async (req, res) => {
    try {
        const member = await Member.findById(req.params.id);

        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }

        if (member.gymId.toString() !== req.user.gymId.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await member.remove();
        res.status(200).json({ id: req.params.id });
    } catch (error) {
        console.error('Error deleting member:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createMember,
    getMembers,
    getMemberById,
    getTransactions,
    updateMember,
    deleteMember
};
