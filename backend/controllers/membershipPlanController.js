const MembershipPlan = require("../models/MembershipPlan");
const { notifyGym } = require("../socket");

// @desc    Get all membership plans
// @route   GET /api/membership-plans
// @access  Private
exports.getMemberships = async (req, res) => {
    try {
        const gymId = req.user.gymId;

        const memberships = await MembershipPlan.find({ gymId })
            .sort({ createdAt: -1 });

        res.status(200).json(memberships);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Server error fetching membership plans",
        });
    }
};

// @desc    Create membership plan
// @route   POST /api/membership-plans
// @access  Private
exports.createMembership = async (req, res) => {
    try {
        const gymId = req.user.gymId;

        const exists = await MembershipPlan.findOne({
            gymId,
            name: req.body.name,
        });

        if (exists) {
            return res.status(400).json({
                message: "Membership plan already exists.",
            });
        }

        const membership = await MembershipPlan.create({
            gymId,
            ...req.body,
        });

        // Broadcast real-time Socket notification
        notifyGym(gymId, {
            title: `New Plan Created: ${membership.name}`,
            description: `Price: ₹${membership.price || 0} • Duration: ${membership.duration || 1} ${membership.durationUnit || 'Months'}.`,
            type: 'MEMBERSHIP',
            targetId: membership._id,
            link: '/dashboard/owner/membership'
        });

        res.status(201).json(membership);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Server error creating membership plan",
        });
    }
};

// @desc    Get membership plan by id
// @route   GET /api/membership-plans/:id
// @access  Private
exports.getMembershipById = async (req, res) => {
    try {
        const gymId = req.user.gymId;

        const membership = await MembershipPlan.findOne({
            _id: req.params.id,
            gymId,
        });

        if (!membership) {
            return res.status(404).json({
                message: "Membership plan not found",
            });
        }

        res.status(200).json(membership);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Server error fetching membership plan",
        });
    }
};

// @desc    Update membership plan
// @route   PUT /api/membership-plans/:id
// @access  Private
exports.updateMembership = async (req, res) => {
    try {
        const gymId = req.user.gymId;

        const membership = await MembershipPlan.findOneAndUpdate(
            {
                _id: req.params.id,
                gymId,
            },
            {
                ...req.body,
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!membership) {
            return res.status(404).json({
                message: "Membership plan not found",
            });
        }

        // Broadcast real-time Socket notification
        notifyGym(gymId, {
            title: `Plan Updated: ${membership.name}`,
            description: `Price: ₹${membership.price || 0} • Duration: ${membership.duration || 1} ${membership.durationUnit || 'Months'}.`,
            type: 'MEMBERSHIP',
            targetId: membership._id,
            link: '/dashboard/owner/membership'
        });

        res.status(200).json(membership);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Server error updating membership plan",
        });
    }
};

// @desc    Deactivate (soft delete) membership plan
// @route   DELETE /api/membership-plans/:id
// @access  Private
exports.deleteMembership = async (req, res) => {
    try {
        const gymId = req.user.gymId;

        const membership = await MembershipPlan.findOneAndUpdate(
            {
                _id: req.params.id,
                gymId,
            },
            {
                isActive: false,
            },
            {
                new: true,
            }
        );

        if (!membership) {
            return res.status(404).json({
                message: "Membership plan not found",
            });
        }

        // Broadcast real-time Socket notification
        notifyGym(gymId, {
            title: `Plan Deactivated: ${membership.name}`,
            description: `${membership.name} has been deactivated.`,
            type: 'MEMBERSHIP',
            targetId: membership._id,
            link: '/dashboard/owner/membership'
        });

        res.status(200).json({
            message: "Membership plan deactivated successfully",
            membership,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Server error deactivating membership plan",
        });
    }
};