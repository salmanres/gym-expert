const Membership = require('../models/Membership');

// Get all memberships for the logged-in gym owner
exports.getMemberships = async (req, res) => {
    try {
        const gymId = req.user.gymId;
        const memberships = await Membership.find({ gymId }).sort({ createdAt: -1 });
        res.json(memberships);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error fetching memberships' });
    }
};

// Create a new membership
exports.createMembership = async (req, res) => {
    try {
        const gymId = req.user.gymId;
        const { name, planType, duration, durationUnit, sessions, price, description, isActive } = req.body;

        const membership = new Membership({
            gymId,
            name,
            planType,
            duration,
            durationUnit,
            sessions,
            price,
            description,
            isActive
        });

        await membership.save();
        res.status(201).json(membership);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error creating membership' });
    }
};

// Get a single membership
exports.getMembershipById = async (req, res) => {
    try {
        const gymId = req.user.gymId;
        const membership = await Membership.findOne({ _id: req.params.id, gymId });
        
        if (!membership) return res.status(404).json({ message: 'Membership not found' });
        
        res.json(membership);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error fetching membership' });
    }
};

// Update a membership
exports.updateMembership = async (req, res) => {
    try {
        const gymId = req.user.gymId;
        const { name, planType, duration, durationUnit, sessions, price, description, isActive } = req.body;

        const membership = await Membership.findOneAndUpdate(
            { _id: req.params.id, gymId },
            { name, planType, duration, durationUnit, sessions, price, description, isActive },
            { new: true }
        );

        if (!membership) return res.status(404).json({ message: 'Membership not found' });

        res.json(membership);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error updating membership' });
    }
};

// Delete a membership
exports.deleteMembership = async (req, res) => {
    try {
        const gymId = req.user.gymId;
        const membership = await Membership.findOneAndDelete({ _id: req.params.id, gymId });

        if (!membership) return res.status(404).json({ message: 'Membership not found' });

        res.json({ message: 'Membership deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error deleting membership' });
    }
};
