const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
        
        try {
            if (!process.env.JWT_SECRET) {
                return res.status(500).json({ message: 'Server configuration error' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (decoded.id === 'master-admin') {
                req.user = {
                    _id: 'master-admin',
                    name: 'Super Admin',
                    role: 'superadmin' // Master is superadmin
                };
                return next();
            }

            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            next();
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized, token failed or expired' });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: `Access Denied: Role '${req.user?.role}' is not authorized to access this resource.` 
            });
        }
        next();
    };
};

module.exports = { protect, authorizeRoles };
