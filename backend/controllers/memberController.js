const Member = require('../models/Member');

// @desc    Create new member
// @route   POST /api/members
// @access  Private
const createMember = async (req, res) => {
    try {
        const gymId = req.user.gymId;
        const newMember = new Member({
            ...req.body,
            gymId
        });

        const savedMember = await newMember.save();
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
        const members = await Member.find({ gymId }).populate('membershipPlan').sort({ createdAt: -1 });
        res.status(200).json(members);
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update a member
// @route   PUT /api/members/:id
// @access  Private
const updateMember = async (req, res) => {
    try {
        const member = await Member.findById(req.params.id);

        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }

        if (member.gymId.toString() !== req.user.gymId.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const updatedMember = await Member.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        res.status(200).json(updatedMember);
    } catch (error) {
        console.error('Error updating member:', error);
        res.status(500).json({ message: 'Server error' });
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
    updateMember,
    deleteMember
};
