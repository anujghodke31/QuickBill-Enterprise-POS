const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { 
    registerUser, 
    loginUser, 
    googleLoginUser,
    verifyEmail,
    requestPasswordReset,
    resetPassword
} = require('../controllers/authController');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per window
    message: { message: 'Too many login attempts, please try again after 15 minutes' }
});

router.post('/register', registerUser);
router.post('/login', loginLimiter, loginUser);
router.post('/google', loginLimiter, googleLoginUser);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', loginLimiter, requestPasswordReset);
router.post('/reset-password', resetPassword);

module.exports = router;
