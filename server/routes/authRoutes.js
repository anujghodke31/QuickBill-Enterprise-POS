const express = require('express');
const router = express.Router();
const { registerUser, loginUser, googleLoginUser } = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleLoginUser);

module.exports = router;
