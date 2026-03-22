const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');
const productRoutes = require('./routes/productRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const returnRoutes = require('./routes/returnRoutes');
const orderRoutes = require('./routes/orderRoutes');
const { protect } = require('./middleware/authMiddleware');
const { apiLimiter } = require('./middleware/rateLimiters');
const logger = require('./utils/logger');
const mongoSanitize = require('express-mongo-sanitize');
const { xssClean } = require('./middleware/sanitizationMiddleware');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// ── Ensure logs directory exists ────────────────────────────────────────────
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

// ── Connect to Database ─────────────────────────────────────────────────────
connectDB();

// ── Security: Enforce HTTPS in production ──────────────────────────────────
if (IS_PROD) {
    app.set('trust proxy', 1);
    app.use((req, res, next) => {
        if (req.headers['x-forwarded-proto'] !== 'https') {
            return res.redirect(301, `https://${req.headers.host}${req.url}`);
        }
        next();
    });
}

// ── Security: HTTP headers via Helmet ───────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: IS_PROD ? undefined : false, // Relax CSP in dev for HMR
    crossOriginEmbedderPolicy: false, // Allow Google fonts / Firebase
}));

// ── CORS — locked to allowed origins in production ──────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

app.use(cors({
    origin: IS_PROD
        ? (origin, cb) => {
            if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
            logger.warn({ event: 'cors_blocked', origin });
            cb(new Error('Not allowed by CORS'));
        }
        : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// ── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// ── Sanitize Data (NoSQL Injection & XSS) ────────────────────────────────────
app.use(mongoSanitize()); // Prevent NoSQL operator injections (strips $ and .)
app.use(xssClean);        // Prevent XSS attacks by filtering script tags recursively

// ── HTTP access logging via Morgan → Winston ─────────────────────────────────
const morganStream = { write: (msg) => logger.info(msg.trim()) };
app.use(morgan(IS_PROD ? 'combined' : 'dev', { stream: morganStream }));

// ── Suspicious traffic detector ───────────────────────────────────────────────
const requestCounts = new Map();
const WINDOW_MS = 60 * 1000;  // 1 minute
const ALERT_THRESHOLD = 200;   // Requests per window per IP before logging alert

app.use((req, _res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const entry = requestCounts.get(ip) || { count: 0, windowStart: now };

    if (now - entry.windowStart > WINDOW_MS) {
        entry.count = 1;
        entry.windowStart = now;
    } else {
        entry.count += 1;
    }
    requestCounts.set(ip, entry);

    if (entry.count === ALERT_THRESHOLD) {
        logger.warn({
            event: 'high_request_volume',
            ip,
            count: entry.count,
            window: `${WINDOW_MS / 1000}s`,
            path: req.path,
        });
    }
    next();
});

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/products', productRoutes);
app.use('/api/invoices', protect, apiLimiter, invoiceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/customers', protect, apiLimiter, customerRoutes);
app.use('/api/employees', protect, apiLimiter, employeeRoutes);
app.use('/api/suppliers', protect, apiLimiter, supplierRoutes);
app.use('/api/returns', protect, apiLimiter, returnRoutes);
app.use('/api/orders', orderRoutes);

// ── Serve React build in production ─────────────────────────────────────────
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));

app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
});

// ── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
    logger.info({ event: 'server_start', port: PORT, env: process.env.NODE_ENV || 'development' });
    console.log(`Server running on port ${PORT}`);
});
