const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * Shared handler — logs blocked requests before rejecting them.
 */
const onLimitReached = (req, _res, options) => {
    logger.warn({
        event: 'rate_limit_hit',
        ip: req.ip,
        path: req.path,
        method: req.method,
        limit: options.max,
        windowMs: options.windowMs,
    });
};

/**
 * Login / Google sign-in / forgot-password
 * 5 attempts per 15 minutes per IP — brute-force guard.
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        onLimitReached(req, res, options);
        res.status(429).json({ message: 'Too many login attempts, please try again after 15 minutes' });
    },
});

/**
 * Account registration
 * 3 registrations per hour per IP — prevents mass account creation.
 */
const registrationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        onLimitReached(req, res, options);
        res.status(429).json({ message: 'Too many accounts created from this IP, please try again after an hour' });
    },
});

/**
 * General authenticated API endpoints
 * 120 requests per minute per IP — prevents scraping / automation.
 */
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        onLimitReached(req, res, options);
        res.status(429).json({ message: 'Too many requests, please slow down' });
    },
});

/**
 * Storefront public product browsing
 * 200 requests per minute per IP — higher ceiling for genuine browsing,
 * but blocks aggressive scrapers.
 */
const storefrontLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        onLimitReached(req, res, options);
        res.status(429).json({ message: 'Too many requests to the storefront, please slow down' });
    },
});

/**
 * Public order placement (storefront checkout)
 * 10 orders per 10 minutes per IP — prevents order spam / inventory abuse.
 */
const orderCreationLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        onLimitReached(req, res, options);
        res.status(429).json({ message: 'Too many orders placed, please wait a few minutes' });
    },
});

module.exports = {
    loginLimiter,
    registrationLimiter,
    apiLimiter,
    storefrontLimiter,
    orderCreationLimiter,
};
