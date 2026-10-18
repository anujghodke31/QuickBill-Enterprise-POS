const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const logger = require('../utils/logger');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const CLIENT_ID_PATTERN = /\.apps\.googleusercontent\.com$/i;

const sanitizeUsername = (value) => {
    const base = String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '')
        .replace(/^[._-]+|[._-]+$/g, '');
    return base || `user${Date.now()}`;
};

const buildToken = (userId) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is required to generate tokens');
    }
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: '15m',
    });
};

const buildRefreshToken = (userId) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is required to generate tokens');
    }
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: '7d',
    });
};

const setRefreshTokenCookie = (res, token) => {
    res.cookie('refreshToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
};

const createUniqueUsername = async (seed) => {
    const base = sanitizeUsername(seed);
    let candidate = base;
    let suffix = 1;

    while (await User.findOne({ username: candidate })) {
        candidate = `${base}${suffix}`;
        suffix += 1;
    }

    return candidate;
};

const respondWithUser = async (res, user, isNewUser = false) => {
    const accessToken = buildToken(user._id);
    const refreshToken = buildRefreshToken(user._id);

    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push(refreshToken);
    if (user.refreshTokens.length > 5) {
        user.refreshTokens = user.refreshTokens.slice(-5);
    }
    await user.save();

    setRefreshTokenCookie(res, refreshToken);

    return res.json({
        _id: user._id,
        name: user.name,
        email: user.email || null,
        username: user.username,
        role: user.role,
        token: accessToken,
        isNewUser,
    });
};

const registerUser = async (req, res) => {
    const { name, username, password, role } = req.body;

    if (!name || !username || !password) {
        return res.status(400).json({ message: 'Name, username and password are required' });
    }

    try {
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const emailVerificationToken = crypto.randomBytes(32).toString('hex');
        
        const user = await User.create({
            name,
            username,
            password,
            role: role === 'admin' ? 'admin' : 'cashier',
            authProvider: 'local',
            emailVerificationToken,
            emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000
        });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            username: user.username,
            role: user.role,
            message: 'User registered. Please verify your email.',
            emailVerificationToken
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const loginUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });

        const masterUsername = process.env.MASTER_ADMIN_USERNAME;
        const masterPassword = process.env.MASTER_ADMIN_PASSWORD;

        if (masterUsername && masterPassword && username === masterUsername && password === masterPassword) {
            if (!user) {
                await User.create({
                    name: 'Super Admin',
                    username,
                    password,
                    role: 'admin',
                    authProvider: 'local',
                    isEmailVerified: true
                });
            }
            logger.info({ event: 'login_success', username: masterUsername, role: 'admin', method: 'master' });
            
            const accessToken = buildToken('master-admin');
            const refreshToken = buildRefreshToken('master-admin');
            setRefreshTokenCookie(res, refreshToken);
            
            return res.json({
                _id: 'master-admin',
                name: 'Super Admin',
                username: masterUsername,
                role: 'admin',
                token: accessToken,
            });
        }

        if (!user) {
            logger.warn({ event: 'login_failed', username, reason: 'user_not_found' });
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        if (user.authProvider === 'google') {
            logger.warn({ event: 'login_failed', username, reason: 'google_account_local_attempt' });
            return res.status(401).json({ message: 'This account uses Google sign-in. Use Continue with Google.' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            logger.warn({ event: 'login_failed', username, reason: 'invalid_password' });
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        logger.info({ event: 'login_success', userId: user._id, username: user.username, role: user.role });
        return await respondWithUser(res, user, false);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const googleLoginUser = async (req, res) => {
    const { credential, role } = req.body;

    if (!credential) {
        return res.status(400).json({ message: 'Google credential is required' });
    }

    try {
        const allowedAudiences = [
            process.env.GOOGLE_CLIENT_ID,
            process.env.FIREBASE_GOOGLE_CLIENT_ID,
        ].filter((audience) => CLIENT_ID_PATTERN.test(String(audience || '').trim()));

        const verifyOptions = { idToken: credential };
        if (allowedAudiences.length > 0) {
            verifyOptions.audience = allowedAudiences;
        }

        const ticket = await googleClient.verifyIdToken(verifyOptions);
        const payload = ticket.getPayload();

        if (!payload || !payload.sub || !payload.email) {
            return res.status(400).json({ message: 'Invalid Google token payload' });
        }

        if (!payload.email_verified) {
            return res.status(401).json({ message: 'Google email is not verified' });
        }

        const normalizedEmail = String(payload.email).toLowerCase();

        let user = await User.findOne({
            $or: [{ googleId: payload.sub }, { email: normalizedEmail }],
        });

        let isNewUser = false;

        if (!user) {
            const usernameSeed = normalizedEmail.split('@')[0] || payload.name || 'googleuser';
            const username = await createUniqueUsername(usernameSeed);

            user = await User.create({
                name: payload.name || username,
                email: normalizedEmail,
                username,
                password: `google-auth-${payload.sub}`,
                role: role === 'admin' ? 'admin' : 'cashier',
                googleId: payload.sub,
                authProvider: 'google',
            });
            isNewUser = true;
            logger.info({ event: 'google_register', email: normalizedEmail, username });
        } else {
            let changed = false;
            if (!user.googleId) {
                user.googleId = payload.sub;
                changed = true;
            }
            if (!user.email) {
                user.email = normalizedEmail;
                changed = true;
            }
            if (!user.authProvider) {
                user.authProvider = 'google';
                changed = true;
            }
            if (changed) {
                await user.save();
            }
        }

        logger.info({ event: 'google_login_success', userId: user._id, email: normalizedEmail, isNewUser });
        return await respondWithUser(res, user, isNewUser);
    } catch (error) {
        logger.error({ event: 'google_auth_error', message: error.message });
        res.status(401).json({ message: 'Google authentication failed', error: error.message });
    }
};

const refreshToken = async (req, res) => {
    const { refreshToken: token } = req.cookies;

    if (!token) return res.status(401).json({ message: 'No refresh token provided' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Handle Master Admin fallback
        if (decoded.id === 'master-admin') {
            const newAccessToken = buildToken('master-admin');
            return res.json({ token: newAccessToken });
        }

        const user = await User.findById(decoded.id);

        if (!user || !user.refreshTokens.includes(token)) {
            res.clearCookie('refreshToken');
            return res.status(403).json({ message: 'Invalid refresh token' });
        }

        const newAccessToken = buildToken(user._id);
        const newRefreshToken = buildRefreshToken(user._id);

        user.refreshTokens = user.refreshTokens.map(rt => (rt === token ? newRefreshToken : rt));
        await user.save();

        setRefreshTokenCookie(res, newRefreshToken);
        res.json({ token: newAccessToken });
    } catch (error) {
        res.clearCookie('refreshToken');
        res.status(403).json({ message: 'Expired or invalid refresh token' });
    }
};

const logoutUser = async (req, res) => {
    const { refreshToken: token } = req.cookies;
    
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.id !== 'master-admin') {
                const user = await User.findById(decoded.id);
                if (user) {
                    user.refreshTokens = user.refreshTokens.filter(rt => rt !== token);
                    await user.save();
                }
            }
        } catch (error) {
            // Ignore error
        }
    }

    res.clearCookie('refreshToken');
    res.status(200).json({ message: 'Logged out successfully' });
};

const verifyEmail = async (req, res) => {
    const { token } = req.body;
    try {
        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verification token' });
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        res.json({ message: 'Email verified successfully', user: { _id: user._id, username: user.username } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const requestPasswordReset = async (req, res) => {
    const { username } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
        await user.save();

        res.json({ message: 'Password reset token generated', resetToken }); 
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Password has been reset' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    googleLoginUser,
    refreshToken,
    logoutUser,
    verifyEmail,
    requestPasswordReset,
    resetPassword
};
