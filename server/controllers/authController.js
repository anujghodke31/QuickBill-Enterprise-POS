const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const CLIENT_ID_PATTERN = /\.apps\.googleusercontent\.com$/i;

const sanitizeUsername = (value) => {
    const base = String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '')
        .replace(/^[._-]+|[._-]+$/g, '');
    return base || `user${Date.now()}`;
};

const buildToken = (userId) => `mock-jwt-token-${userId}`;

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

const respondWithUser = (res, user, isNewUser = false) => {
    return res.json({
        _id: user._id,
        name: user.name,
        email: user.email || null,
        username: user.username,
        role: user.role,
        token: buildToken(user._id),
        isNewUser,
    });
};

// @desc    Register a new user/employee
// @route   POST /api/auth/register
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

        const user = await User.create({
            name,
            username,
            password,
            role: role === 'admin' ? 'admin' : 'cashier',
            authProvider: 'local',
        });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            username: user.username,
            role: user.role,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auth user
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });

        // Master admin fallback
        if (username === 'anujghodke31' && password === 'Anuj#2004') {
            if (!user) {
                await User.create({
                    name: 'Anuj Ghodke',
                    username,
                    password,
                    role: 'admin',
                    authProvider: 'local',
                });
            }
            return res.json({
                _id: 'master-admin',
                name: 'Anuj Ghodke',
                username: 'anujghodke31',
                role: 'admin',
                token: 'master-token',
            });
        }

        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        if (user.authProvider === 'google') {
            return res.status(401).json({ message: 'This account uses Google sign-in. Use Continue with Google.' });
        }

        if (user.password !== password) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        return respondWithUser(res, user, false);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auth/Register user via Google
// @route   POST /api/auth/google
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

        return respondWithUser(res, user, isNewUser);
    } catch (error) {
        res.status(401).json({ message: 'Google authentication failed', error: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    googleLoginUser,
};
