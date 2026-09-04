const Member = require('../models/Member');
const Transaction = require('../models/Transaction');
const Enquiry = require('../models/Enquiry');
const Gym = require('../models/Gym');
const MemberMembership = require('../models/MemberMembership');
const User = require('../models/User');

// @desc    Create new member
// @route   POST /api/members
// @access  Private
const createMember = async (req, res) => {
    try {
        const gymId = req.user.gymId;
        let memberId = req.body.memberId;

        let memberData = { ...req.body };
        
        // Clean ALL empty string fields to prevent Mongoose CastError for Numbers, Dates, ObjectIds
        Object.keys(memberData).forEach(key => {
            if (memberData[key] === '') {
                delete memberData[key];
            }
        });

        // Security: Prevent malicious frontend manipulation
        delete memberData.walletBalance;
        delete memberData.referralBonusGranted;
        delete memberData.otp;
        delete memberData.otpExpiry;

        // Mobile number validation
        if (!memberData.contactNumber || !/^[6-9]\d{9}$/.test(memberData.contactNumber)) {
            return res.status(400).json({ message: 'A valid 10-digit mobile number is required.' });
        }

        const existingMember = await Member.findOne({ contactNumber: memberData.contactNumber, gymId });
        if (existingMember) {
            return res.status(400).json({ message: 'A member with this mobile number already exists.' });
        }

        const newMember = new Member({
            ...memberData,
            gymId
        });
        
        if (memberId) {
            newMember.memberId = memberId;
        }

        const savedMember = await newMember.save();

        if (req.body.enquiryId) {
            await Enquiry.findOneAndUpdate(
                { _id: req.body.enquiryId, gymId },
                { status: 'Converted', isMemberCreated: true }
            );
        }

        // Process Custom / Flexible Referral Rewards (Bonus Days &/or Wallet Cash)
        if (req.body.referredBy) {
            try {
                const gym = await Gym.findById(gymId);
                const rewardType = gym ? gym.referralRewardType : 'Both';
                const bonusDays = gym ? gym.referrerBonusDays : 7;
                const walletAmt = gym ? gym.referrerWalletAmount : 200;

                const referrerMember = await Member.findOne({
                    _id: req.body.referredBy,
                    gymId
                });

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
                            
                            if (referrerMembership.paidUntilDate) {
                                const newPaidUntilDate = new Date(referrerMembership.paidUntilDate);
                                newPaidUntilDate.setDate(newPaidUntilDate.getDate() + bonusDays);
                                referrerMembership.paidUntilDate = newPaidUntilDate;
                            }

                            referrerMembership.bonusDays = (referrerMembership.bonusDays || 0) + bonusDays;
                            referrerMembership.bonusHistory = referrerMembership.bonusHistory || [];
                            referrerMembership.bonusHistory.push({
                                days: bonusDays,
                                reason: 'Referral Bonus',
                                addedBy: req.user._id || req.user.id
                            });
                            
                            await referrerMembership.save();
                        }
                    }
                }
            } catch (refErr) {
                console.error("Referral reward processing error:", refErr);
            }
        }

        // Process Staff/Agent Referral Rewards
        if (req.body.referredByStaff) {
            try {
                const gym = await Gym.findById(gymId);
                const rewardType = gym ? gym.referralRewardType : 'Both';
                const walletAmt = gym ? gym.referrerWalletAmount : 200;

                const referrerStaff = await User.findOne({
                    _id: req.body.referredByStaff,
                    gymId
                });

                if (referrerStaff) {
                    if ((rewardType === 'Wallet Cash' || rewardType === 'Both') && walletAmt > 0) {
                        referrerStaff.walletBalance = (referrerStaff.walletBalance || 0) + walletAmt;
                        await referrerStaff.save();
                    }
                }
            } catch (refErr) {
                console.error("Staff Referral reward processing error:", refErr);
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
            .populate('referredByStaff', 'name email role')
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
            .populate('referredBy', 'firstName lastName memberId contactNumber')
            .populate('referredByStaff', 'name email role');

        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }
        
        const memberObj = member.toObject();
        
        // Fetch latest transaction for this member
        const latestTx = await Transaction.findOne({ memberId: member._id }).sort({ createdAt: -1 });
        if (latestTx) {
            memberObj.paymentMode = latestTx.paymentMode;
            memberObj.transactionId = latestTx.transactionId;
        }

        res.status(200).json(memberObj);
    } catch (error) {
        console.error('Error fetching member:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get single transaction by ID
// @route   GET /api/members/transactions/single/:id
// @access  Private
const getTransactionById = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id)
            .populate('memberId')
            .populate('planId');

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        res.status(200).json(transaction);
    } catch (error) {
        console.error('Error fetching transaction by id:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all transactions for a gym
// @route   GET /api/members/transactions/all
// @access  Private
const getTransactions = async (req, res) => {
    try {
        let transactions = await Transaction.find({ 
            gymId: req.user.gymId,
            amountPaid: { $gt: 0 }
        })
            .populate('memberId', 'firstName lastName contactNumber memberId')
            .populate('planId', 'name')
            .populate('collectedBy', 'name email role')
            .sort({ paymentDate: -1 })
            .lean();

        // Fallback to active membership plan name if planId is missing in transaction
        const memberIds = [...new Set(transactions.map(t => t.memberId?._id?.toString()).filter(Boolean))];
        const activeMemberships = await MemberMembership.find({ 
            memberId: { $in: memberIds }, 
            membershipStatus: { $in: ['Active', 'Scheduled'] }
        });

        transactions = transactions.map(tx => {
            if (!tx.planId) {
                const activeMem = activeMemberships.find(m => m.memberId?.toString() === tx.memberId?._id?.toString());
                if (activeMem) {
                    tx.planName = activeMem.planName || 'Membership Payment';
                }
            }
            return tx;
        });

        res.status(200).json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete a transaction
// @route   DELETE /api/members/transactions/:id
// @access  Private
const deleteTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Ensure transaction belongs to logged-in gym
        if (transaction.gymId.toString() !== req.user.gymId.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const amountPaid = transaction.amountPaid || 0;
        const walletAmount = transaction.walletAmount || transaction.walletAmountUsed || 0;

        // Find the associated MemberMembership
        let membershipQuery = {
            memberId: transaction.memberId,
            membershipStatus: { $in: ['Active', 'Scheduled', 'Expired'] }
        };
        if (transaction.planId) {
            membershipQuery.membershipPlanId = transaction.planId;
        }

        const membership = await MemberMembership.findOne(membershipQuery).sort({ createdAt: -1 });

        if (membership) {
            membership.paidAmount = Math.max(0, (membership.paidAmount || 0) - amountPaid);
            membership.balanceAmount = Math.max(0, membership.finalPrice - membership.paidAmount);

            let paymentStatus = "Pending";
            if (membership.paidAmount >= membership.finalPrice && membership.finalPrice > 0) paymentStatus = "Paid";
            else if (membership.paidAmount > 0) paymentStatus = "Partial";
            if (membership.finalPrice === 0) paymentStatus = "Paid";

            membership.paymentStatus = paymentStatus;

            if (paymentStatus === 'Paid') {
                membership.paidUntilDate = membership.endDate;
            } else if (paymentStatus === 'Partial' && membership.finalPrice > 0) {
                const startMs = new Date(membership.startDate).getTime();
                const endMs = new Date(membership.endDate).getTime();
                const totalMs = endMs - startMs;
                const paidRatio = membership.paidAmount / membership.finalPrice;
                membership.paidUntilDate = new Date(startMs + (totalMs * paidRatio));
            } else if (paymentStatus === 'Pending') {
                membership.paidUntilDate = new Date(membership.startDate);
            }

            await membership.save();
        }

        // Refund wallet balance if applicable
        if (walletAmount > 0) {
            const member = await Member.findById(transaction.memberId);
            if (member) {
                member.walletBalance = (member.walletBalance || 0) + walletAmount;
                await member.save();
            }
        }

        await transaction.deleteOne();
        res.status(200).json({ message: 'Transaction deleted and payments reverted', id: req.params.id });
    } catch (error) {
        console.error('Error deleting transaction:', error);
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
        const recordTransaction = updateData.recordTransaction;
        const newPaymentAmount = parseFloat(updateData.newPaymentAmount || 0);
        const walletUsed = parseFloat(updateData.walletUsed || 0);

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
        delete updateData.walletBalance;
        delete updateData.referralBonusGranted;
        delete updateData.otp;
        delete updateData.otpExpiry;

        if (updateData.contactNumber) {
            if (!/^[6-9]\d{9}$/.test(updateData.contactNumber)) {
                return res.status(400).json({ message: 'A valid 10-digit mobile number is required.' });
            }
            const existingMember = await Member.findOne({ 
                contactNumber: updateData.contactNumber, 
                gymId: req.user.gymId,
                _id: { $ne: req.params.id }
            });
            if (existingMember) {
                return res.status(400).json({ message: 'A member with this mobile number already exists.' });
            }
        }

        const updatedMember = await Member.findByIdAndUpdate(
            req.params.id,
            updateData,
            {
                new: true,
                runValidators: true,
            }
        );

        // Record Transaction and deduct wallet if requested
        if (recordTransaction) {
            // Deduct wallet balance if used
            if (walletUsed > 0 && updatedMember.walletBalance >= walletUsed) {
                updatedMember.walletBalance -= walletUsed;
                await updatedMember.save();
            }

            // Create Transaction record if actual money was paid or wallet was used
            if (newPaymentAmount > 0 || walletUsed > 0) {
                await Transaction.create({
                    gymId: req.user.gymId,
                    memberId: updatedMember._id,
                    planId: updatedMember.membershipPlan,
                    amountPaid: newPaymentAmount,
                    paymentMode: updateData.paymentMode || 'Cash',
                    transactionId: updateData.transactionId,
                    paymentDate: new Date(),
                    collectedBy: req.user._id,
                    walletAmountUsed: walletUsed
                });
            }

            // Sync with active / scheduled MemberMembership
            const activeMembership = await MemberMembership.findOne({
                memberId: updatedMember._id,
                membershipStatus: "Active"
            }).sort({ createdAt: -1 });

            if (activeMembership) {
                const isActiveFullyPaid = activeMembership.paymentStatus === 'Paid' || (activeMembership.balanceAmount || 0) <= 0;

                if (isActiveFullyPaid && newPaymentAmount > 0) {
                    // Active plan is already fully paid! Create or update Scheduled (Future) membership
                    let scheduledMem = await MemberMembership.findOne({
                        memberId: updatedMember._id,
                        membershipStatus: "Scheduled"
                    }).sort({ createdAt: -1 });

                    if (scheduledMem) {
                        scheduledMem.paidAmount = (scheduledMem.paidAmount || 0) + newPaymentAmount;
                        scheduledMem.balanceAmount = Math.max(0, scheduledMem.finalPrice - scheduledMem.paidAmount);
                        scheduledMem.paymentStatus = scheduledMem.paidAmount >= scheduledMem.finalPrice ? 'Paid' : 'Partial';
                        await scheduledMem.save();
                    } else {
                        const schedStart = new Date(activeMembership.endDate);
                        schedStart.setDate(schedStart.getDate() + 1);

                        const durationMs = new Date(activeMembership.endDate).getTime() - new Date(activeMembership.startDate).getTime();
                        const schedEnd = new Date(schedStart.getTime() + (durationMs > 0 ? durationMs : 30 * 24 * 60 * 60 * 1000));

                        const planPrice = activeMembership.finalPrice || activeMembership.originalPrice || newPaymentAmount;
                        const pStatus = newPaymentAmount >= planPrice ? 'Paid' : 'Partial';

                        await MemberMembership.create({
                            gymId: req.user.gymId,
                            memberId: updatedMember._id,
                            membershipPlanId: activeMembership.membershipPlanId,
                            planName: activeMembership.planName,
                            duration: activeMembership.duration,
                            durationUnit: activeMembership.durationUnit,
                            totalSessions: activeMembership.totalSessions,
                            startDate: schedStart,
                            endDate: schedEnd,
                            originalPrice: activeMembership.originalPrice || planPrice,
                            discount: activeMembership.discount || 0,
                            finalPrice: planPrice,
                            paidAmount: newPaymentAmount,
                            balanceAmount: Math.max(0, planPrice - newPaymentAmount),
                            paymentStatus: pStatus,
                            membershipStatus: 'Scheduled'
                        });
                    }
                } else {
                    // Update active plan (partial/pending payment balance collection)
                    if (updateData.amountPaid !== undefined) {
                        activeMembership.paidAmount = updateData.amountPaid;
                    } else if (newPaymentAmount > 0) {
                        activeMembership.paidAmount = (activeMembership.paidAmount || 0) + newPaymentAmount;
                    }

                    if (updateData.paymentStatus) {
                        activeMembership.paymentStatus = updateData.paymentStatus;
                    }
                    if (updateData.paidUntilDate) {
                        activeMembership.paidUntilDate = updateData.paidUntilDate;
                    }
                    if (updateData.planStartDate) {
                        activeMembership.startDate = updateData.planStartDate;
                    }
                    if (updateData.planEndDate) {
                        activeMembership.endDate = updateData.planEndDate;
                    }
                    
                    const finalPrice = activeMembership.finalPrice || 0;
                    const paidAmt = activeMembership.paidAmount || 0;
                    
                    let paymentStatus = "Pending";
                    if (paidAmt >= finalPrice && finalPrice > 0) paymentStatus = "Paid";
                    else if (paidAmt > 0) paymentStatus = "Partial";
                    if (finalPrice === 0) paymentStatus = "Paid";

                    activeMembership.paymentStatus = paymentStatus;

                    if (paymentStatus === 'Paid') {
                        activeMembership.paidUntilDate = activeMembership.endDate;
                        activeMembership.balanceAmount = 0;
                    } else {
                        activeMembership.balanceAmount = Math.max(0, finalPrice - paidAmt);
                    }
                    
                    await activeMembership.save();
                }
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
    getTransactionById,
    deleteTransaction,
    updateMember,
    deleteMember
};
