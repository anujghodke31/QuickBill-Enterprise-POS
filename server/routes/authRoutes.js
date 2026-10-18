const express = require('express');
const router = express.Router();
const { loginLimiter, registrationLimiter } = require('../middleware/rateLimiters');
const { validateRequest } = require('../validators/validateRequest');
const { registerSchema, loginSchema } = require('../validators/authSchemas');

const {
    registerUser,
    loginUser,
    googleLoginUser,
    refreshToken,
    logoutUser,
    verifyEmail,
    requestPasswordReset,
    resetPassword
} = require('../controllers/authController');

router.post('/register', registrationLimiter, validateRequest(registerSchema), registerUser);
router.post('/login', loginLimiter, validateRequest(loginSchema), loginUser);
router.post('/google', loginLimiter, googleLoginUser);
router.post('/refresh', refreshToken);
router.post('/logout', logoutUser);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', loginLimiter, requestPasswordReset);
router.post('/reset-password', resetPassword);

module.exports = router;
