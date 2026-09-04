const Enquiry = require('../models/Enquiry');
const { notifyGym } = require('../socket');

exports.createEnquiry = async (req, res) => {
    try {
        const gymId = req.user.gymId;
        if (!gymId) {
            return res.status(400).json({ message: 'User must belong to a gym to create an enquiry.' });
        }
        
        const phoneRegex = /^[6-9]\d{9}$/;
        if (req.body.contactNumber && !phoneRegex.test(req.body.contactNumber)) {
            return res.status(400).json({ message: 'Invalid primary contact number format.' });
        }
        if (req.body.altContact && !phoneRegex.test(req.body.altContact)) {
            return res.status(400).json({ message: 'Invalid alternate contact number format.' });
        }
        
        const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
        
        if (!req.body.followUpDate) {
            req.body.followUpDate = todayStr;
        }

        const enquiry = new Enquiry({
            gymId,
            ...req.body
        });

        await enquiry.save();

        // Broadcast real-time Socket notification
        notifyGym(gymId, {
            title: enquiry.status === 'Trial' ? 'New Trial Registered' : 'New Lead Enquiry Added',
            description: `${enquiry.firstName} ${enquiry.lastName || ''} — Status: ${enquiry.status || 'Pending'} (${enquiry.source || 'Walk-in'})`,
            type: 'LEAD',
            targetId: enquiry._id,
            link: '/dashboard/owner/leads'
        });

        res.status(201).json(enquiry);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating enquiry.', error: error.message });
    }
};

exports.getEnquiries = async (req, res) => {
    try {
        const gymId = req.user.gymId;
        const enquiries = await Enquiry.find({ gymId }).sort({ createdAt: -1 }).populate('branchId', 'name');
        res.json(enquiries);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching enquiries.' });
    }
};

exports.updateEnquiry = async (req, res) => {
    try {
        const enquiry = await Enquiry.findOne({ _id: req.params.id, gymId: req.user.gymId });

        if (!enquiry) {
            return res.status(404).json({ message: 'Enquiry not found.' });
        }

        const phoneRegex = /^[6-9]\d{9}$/;
        if (req.body.contactNumber && !phoneRegex.test(req.body.contactNumber)) {
            return res.status(400).json({ message: 'Invalid primary contact number format.' });
        }
        if (req.body.altContact && !phoneRegex.test(req.body.altContact)) {
            return res.status(400).json({ message: 'Invalid alternate contact number format.' });
        }

        // If followUpDate is empty or not provided in update payload, default to today's date
        const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
        if (req.body.followUpDate === '' || req.body.followUpDate === null || (!req.body.followUpDate && !enquiry.followUpDate)) {
            req.body.followUpDate = todayStr;
        }

        Object.assign(enquiry, req.body);
        
        // Fallback defaults for old data missing required fields
        if (!enquiry.gender) enquiry.gender = 'Male';
        if (!enquiry.attendedBy) enquiry.attendedBy = 'Admin';
        if (!enquiry.convertibility) enquiry.convertibility = 'Warm';
        if (!enquiry.source) enquiry.source = 'Walk-in';
        if (!enquiry.inquiryFor) enquiry.inquiryFor = 'Gym';

        await enquiry.save();

        // Broadcast real-time Socket notification
        notifyGym(req.user.gymId, {
            title: `Lead Updated: ${enquiry.firstName} ${enquiry.lastName || ''}`,
            description: `Status: ${enquiry.status} • Follow-up: ${enquiry.followUpDate ? new Date(enquiry.followUpDate).toLocaleDateString() : 'N/A'}`,
            type: 'LEAD',
            targetId: enquiry._id,
            link: '/dashboard/owner/leads'
        });

        res.json(enquiry);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating enquiry.' });
    }
};

exports.getEnquiryById = async (req, res) => {
    try {
        const enquiry = await Enquiry.findOne({ _id: req.params.id, gymId: req.user.gymId });
        if (!enquiry) {
            return res.status(404).json({ message: 'Enquiry not found.' });
        }
        res.json(enquiry);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching enquiry.' });
    }
};

exports.deleteEnquiry = async (req, res) => {
    try {
        const enquiry = await Enquiry.findOneAndDelete({ _id: req.params.id, gymId: req.user.gymId });
        
        if (!enquiry) {
            return res.status(404).json({ message: 'Enquiry not found or unauthorized.' });
        }

        res.json({ message: 'Enquiry deleted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error deleting enquiry.' });
    }
};
