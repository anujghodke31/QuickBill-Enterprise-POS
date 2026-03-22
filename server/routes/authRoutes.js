const express = require('express');
const router = express.Router();
const { loginLimiter, registrationLimiter } = require('../middleware/rateLimiters');
const {
    registerUser,
    loginUser,
    googleLoginUser,
    verifyEmail,
    requestPasswordReset,
    resetPassword
} = require('../controllers/authController');

router.post('/register', registrationLimiter, registerUser);
router.post('/login', loginLimiter, loginUser);
router.post('/google', loginLimiter, googleLoginUser);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', loginLimiter, requestPasswordReset);
router.post('/reset-password', resetPassword);

module.exports = router;
