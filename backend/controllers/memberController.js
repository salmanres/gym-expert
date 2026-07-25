const Member = require('../models/Member');
const Transaction = require('../models/Transaction');
const Enquiry = require('../models/Enquiry');

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
}).populate("gymId");

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
        const transactions = await Transaction.find({ gymId: req.user.gymId })
            .populate('memberId', 'firstName lastName contactNumber memberId')
            .populate('planId', 'name')
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

        const updatedMember = await Member.findByIdAndUpdate(
            req.params.id,
            updateData,
            {
                new: true,
                runValidators: true,
            }
        );

        if (req.body.recordTransaction) {
            const MemberMembership = require('../models/MemberMembership');
            
            // 1. Create Transaction
            await Transaction.create({
                gymId: req.user.gymId,
                memberId: member._id,
                planId: req.body.membershipPlan || null,
                amountPaid: Number(req.body.newPaymentAmount) || 0,
                paymentMode: req.body.paymentMode || 'Cash',
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
