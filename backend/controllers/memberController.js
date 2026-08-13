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
            .sort({ paymentDate: -1 });

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

            // Sync with active MemberMembership
            const activeMembership = await MemberMembership.findOne({
                memberId: updatedMember._id,
                membershipStatus: "Active"
            }).sort({ createdAt: -1 });

            if (activeMembership) {
                if (updateData.amountPaid !== undefined) {
                    activeMembership.paidAmount = updateData.amountPaid;
                }
                if (updateData.paymentStatus) {
                    activeMembership.paymentStatus = updateData.paymentStatus;
                }
                if (updateData.paidUntilDate) {
                    activeMembership.paidUntilDate = updateData.paidUntilDate;
                }
                
                const finalPrice = activeMembership.finalPrice || 0;
                const paidAmt = activeMembership.paidAmount || 0;
                activeMembership.balanceAmount = Math.max(0, finalPrice - paidAmt);
                
                await activeMembership.save();
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
    updateMember,
    deleteMember
};
