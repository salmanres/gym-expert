const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

            req.user = await User.findById(decoded.id).select('-password');
            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const superAdminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'SUPERADMIN') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as SuperAdmin' });
    }
};

const gymOwnerOnly = (req, res, next) => {
    if (req.user && (req.user.role === 'GYM_OWNER' || req.user.role === 'SUPERADMIN')) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as Gym Owner' });
    }
};

module.exports = { protect, superAdminOnly, gymOwnerOnly };
