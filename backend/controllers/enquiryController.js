const mongoose = require('mongoose');
const Enquiry = require('../models/Enquiry');
const { notifyGym } = require('../socket');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[6-9]\d{9}$/;

/*
|--------------------------------------------------------------------------
| Sanitize Payload
|--------------------------------------------------------------------------
| Remove only fields that must never be controlled by frontend.
| Since this is a single-branch CRM, there is no branchId handling.
|--------------------------------------------------------------------------
*/

const sanitizePayload = (body = {}) => {
    const payload = { ...body };

    // Backend-controlled fields
    delete payload.gymId;
    delete payload.createdBy;
    delete payload._id;
    delete payload.createdAt;
    delete payload.updatedAt;

    // Original creator information should not be changed
    delete payload.addedByName;
    delete payload.addedByRole;

    return payload;
};

/*
|--------------------------------------------------------------------------
| Validate Phone Numbers
|--------------------------------------------------------------------------
*/

const validatePhoneNumbers = (body = {}) => {
    if (
        body.contactNumber &&
        !phoneRegex.test(String(body.contactNumber).trim())
    ) {
        return 'Invalid primary contact number format.';
    }

    if (
        body.altContact &&
        !phoneRegex.test(String(body.altContact).trim())
    ) {
        return 'Invalid alternate contact number format.';
    }

    return null;
};

/*
|--------------------------------------------------------------------------
| Validate Email
|--------------------------------------------------------------------------
*/

const validateEmail = (email) => {
    if (!email || String(email).trim() === '') {
        return null;
    }

    if (!emailRegex.test(String(email).trim())) {
        return 'Invalid email address format.';
    }

    return null;
};

/*
|--------------------------------------------------------------------------
| Normalize Date Fields
|--------------------------------------------------------------------------
*/

const normalizeDateFields = (payload) => {
    const dateFields = [
        'dob',
        'followUpDate',
        'trialDate',
        'trialEndDate'
    ];

    dateFields.forEach((field) => {
        if (payload[field] === '') {
            payload[field] = null;
        }
    });

    return payload;
};

/*
|--------------------------------------------------------------------------
| CREATE ENQUIRY
|--------------------------------------------------------------------------
*/

exports.createEnquiry = async (req, res) => {
    try {
        const gymId = req.user.gymId;

        if (!gymId) {
            return res.status(400).json({
                message: 'User must belong to a gym to create an enquiry.'
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Validate Phone
        |--------------------------------------------------------------------------
        */

        const phoneError = validatePhoneNumbers(req.body);

        if (phoneError) {
            return res.status(400).json({
                message: phoneError
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Validate Email
        |--------------------------------------------------------------------------
        */

        const emailError = validateEmail(req.body.email);

        if (emailError) {
            return res.status(400).json({
                message: emailError
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Sanitize
        |--------------------------------------------------------------------------
        */

        const sanitizedBody = sanitizePayload(req.body);

        /*
        |--------------------------------------------------------------------------
        | Normalize Values
        |--------------------------------------------------------------------------
        */

        normalizeDateFields(sanitizedBody);

        if (sanitizedBody.email) {
            sanitizedBody.email = String(
                sanitizedBody.email
            ).trim().toLowerCase();
        }

        /*
        |--------------------------------------------------------------------------
        | Creator Information
        |--------------------------------------------------------------------------
        */

        const creatorRole =
            req.user.role === 'GYM_OWNER'
                ? 'Owner'
                : req.user.role === 'ADMIN' ||
                  req.user.role === 'SUPERADMIN'
                ? 'Admin'
                : req.user.role === 'TRAINER'
                ? 'Trainer'
                : 'Staff';

        const creatorName = req.user.name || creatorRole;

        /*
        |--------------------------------------------------------------------------
        | Create Enquiry
        |--------------------------------------------------------------------------
        */

        const enquiry = new Enquiry({
            ...sanitizedBody,

            // Always controlled by backend
            gymId,

            createdBy: req.user._id,

            addedByName: creatorName,

            addedByRole: creatorRole,

            attendedBy:
                sanitizedBody.attendedBy || creatorName
        });

        await enquiry.save();

        /*
        |--------------------------------------------------------------------------
        | Socket Notification
        |--------------------------------------------------------------------------
        */

        try {
            notifyGym(gymId, {
                title:
                    enquiry.status === 'Trial'
                        ? 'New Trial Registered'
                        : 'New Lead Enquiry Added',

                description:
                    `${enquiry.firstName} ${enquiry.lastName || ''} — ` +
                    `Status: ${enquiry.status || 'Pending'} ` +
                    `(${enquiry.source || 'Walk-in'})`,

                type: 'LEAD',

                targetId: enquiry._id,

                link: '/dashboard/owner/leads'
            });
        } catch (socketError) {
            console.error(
                'Non-blocking socket notification error in createEnquiry:',
                socketError
            );
        }

        return res.status(201).json(enquiry);

    } catch (error) {
        console.error(
            'createEnquiry error:',
            error
        );

        return res.status(500).json({
            message: 'Server error creating enquiry.',
            error: error.message
        });
    }
};

/*
|--------------------------------------------------------------------------
| GET ALL ENQUIRIES
|--------------------------------------------------------------------------
*/

exports.getEnquiries = async (req, res) => {
    try {
        const gymId = req.user.gymId;

        if (!gymId) {
            return res.status(400).json({
                message: 'User must belong to a gym.'
            });
        }

        const enquiries = await Enquiry.find({
            gymId
        }).sort({
            createdAt: -1
        });

        return res.json(enquiries);

    } catch (error) {
        console.error(
            'getEnquiries error:',
            error
        );

        return res.status(500).json({
            message: 'Server error fetching enquiries.'
        });
    }
};

/*
|--------------------------------------------------------------------------
| UPDATE ENQUIRY
|--------------------------------------------------------------------------
*/

exports.updateEnquiry = async (req, res) => {
    try {
        const gymId = req.user.gymId;

        if (!gymId) {
            return res.status(400).json({
                message: 'User must belong to a gym.'
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Validate ID
        |--------------------------------------------------------------------------
        */

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                message: 'Invalid enquiry ID.'
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Find Enquiry
        |--------------------------------------------------------------------------
        | gymId is included so one gym cannot update another gym's enquiry.
        |--------------------------------------------------------------------------
        */

        const enquiry = await Enquiry.findOne({
            _id: req.params.id,
            gymId
        });

        if (!enquiry) {
            return res.status(404).json({
                message: 'Enquiry not found.'
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Validate Phone
        |--------------------------------------------------------------------------
        */

        const phoneError = validatePhoneNumbers(req.body);

        if (phoneError) {
            return res.status(400).json({
                message: phoneError
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Validate Email
        |--------------------------------------------------------------------------
        */

        const emailError = validateEmail(req.body.email);

        if (emailError) {
            return res.status(400).json({
                message: emailError
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Sanitize Update
        |--------------------------------------------------------------------------
        */

        const updatePayload = sanitizePayload(req.body);

        /*
        |--------------------------------------------------------------------------
        | Normalize Values
        |--------------------------------------------------------------------------
        */

        normalizeDateFields(updatePayload);

        if (updatePayload.email) {
            updatePayload.email = String(
                updatePayload.email
            ).trim().toLowerCase();
        }

        /*
        |--------------------------------------------------------------------------
        | Update Enquiry
        |--------------------------------------------------------------------------
        */

        Object.assign(
            enquiry,
            updatePayload
        );

        await enquiry.save();

        /*
        |--------------------------------------------------------------------------
        | Socket Notification
        |--------------------------------------------------------------------------
        */

        try {
            notifyGym(gymId, {
                title:
                    `Lead Updated: ` +
                    `${enquiry.firstName} ` +
                    `${enquiry.lastName || ''}`,

                description:
                    `Status: ${enquiry.status || 'Pending'} • ` +
                    `Follow-up: ${
                        enquiry.followUpDate
                            ? new Date(
                                  enquiry.followUpDate
                              ).toLocaleDateString()
                            : 'N/A'
                    }`,

                type: 'LEAD',

                targetId: enquiry._id,

                link: '/dashboard/owner/leads'
            });
        } catch (socketError) {
            console.error(
                'Non-blocking socket notification error in updateEnquiry:',
                socketError
            );
        }

        return res.json(enquiry);

    } catch (error) {
        console.error(
            'updateEnquiry error:',
            error
        );

        return res.status(500).json({
            message: 'Server error updating enquiry.'
        });
    }
};

/*
|--------------------------------------------------------------------------
| GET ENQUIRY BY ID
|--------------------------------------------------------------------------
*/

exports.getEnquiryById = async (req, res) => {
    try {
        const gymId = req.user.gymId;

        if (!gymId) {
            return res.status(400).json({
                message: 'User must belong to a gym.'
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Validate ID
        |--------------------------------------------------------------------------
        */

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                message: 'Invalid enquiry ID.'
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Find Enquiry
        |--------------------------------------------------------------------------
        */

        const enquiry = await Enquiry.findOne({
            _id: req.params.id,
            gymId
        });

        if (!enquiry) {
            return res.status(404).json({
                message: 'Enquiry not found.'
            });
        }

        return res.json(enquiry);

    } catch (error) {
        console.error(
            'getEnquiryById error:',
            error
        );

        return res.status(500).json({
            message: 'Server error fetching enquiry.'
        });
    }
};

/*
|--------------------------------------------------------------------------
| DELETE ENQUIRY
|--------------------------------------------------------------------------
*/

exports.deleteEnquiry = async (req, res) => {
    try {
        const gymId = req.user.gymId;

        if (!gymId) {
            return res.status(400).json({
                message: 'User must belong to a gym.'
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Validate ID
        |--------------------------------------------------------------------------
        */

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                message: 'Invalid enquiry ID.'
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Delete only from current gym
        |--------------------------------------------------------------------------
        */

        const enquiry = await Enquiry.findOneAndDelete({
            _id: req.params.id,
            gymId
        });

        if (!enquiry) {
            return res.status(404).json({
                message: 'Enquiry not found or unauthorized.'
            });
        }

        const leadName =
            `${enquiry.firstName} ${enquiry.lastName || ''}`.trim();

        /*
        |--------------------------------------------------------------------------
        | Socket Notification
        |--------------------------------------------------------------------------
        */

        try {
            notifyGym(gymId, {
                title:
                    `Lead Enquiry Removed: ${leadName}`,

                description:
                    `Enquiry for ${leadName} ` +
                    `(${enquiry.status || 'Pending'}) ` +
                    `was removed from the leads directory.`,

                type: 'LEAD',

                targetId: req.params.id,

                link: '/dashboard/owner/leads'
            });
        } catch (socketError) {
            console.error(
                'Non-blocking socket notification error in deleteEnquiry:',
                socketError
            );
        }

        return res.json({
            message: 'Enquiry deleted successfully.'
        });

    } catch (error) {
        console.error(
            'deleteEnquiry error:',
            error
        );

        return res.status(500).json({
            message: 'Server error deleting enquiry.'
        });
    }
};