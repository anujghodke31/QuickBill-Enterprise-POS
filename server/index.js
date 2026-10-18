const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
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

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

connectDB();

if (IS_PROD) {
    app.set('trust proxy', 1);
    app.use((req, res, next) => {
        if (req.headers['x-forwarded-proto'] !== 'https') {
            return res.redirect(301, `https://${req.headers.host}${req.url}`);
        }
        next();
    });
}

// ── Phase 1.5: Strict Helmet Content Security Policy ─────────────────────────
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://apis.google.com", "https://www.gstatic.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            connectSrc: ["'self'", "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com"],
            imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://firebasestorage.googleapis.com"],
            workerSrc: ["'self'", "blob:"],
        }
    },
    crossOriginEmbedderPolicy: false,
}));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
    origin: IS_PROD
        ? (origin, cb) => {
            if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
            cb(new Error('Not allowed by CORS'));
        }
        : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());

app.use(mongoSanitize()); 
app.use(xssClean);        

const morganStream = { write: (msg) => logger.info(msg.trim()) };
app.use(morgan(IS_PROD ? 'combined' : 'dev', { stream: morganStream }));

const requestCounts = new Map();
const WINDOW_MS = 60 * 1000;  
const ALERT_THRESHOLD = 200;   

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
        logger.warn({ event: 'high_request_volume', ip, count: entry.count, window: `${WINDOW_MS / 1000}s`, path: req.path });
    }
    next();
});

// ── Phase 1.3 API Versioning Redirect Middleware ─────────────────────────────
app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api/') && !req.originalUrl.startsWith('/api/v1/')) {
        const newUrl = req.originalUrl.replace('/api/', '/api/v1/');
        return res.redirect(308, newUrl);
    }
    next();
});

// Mount routes at /api/v1
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/invoices', protect, apiLimiter, invoiceRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/customers', protect, apiLimiter, customerRoutes);
app.use('/api/v1/employees', protect, apiLimiter, employeeRoutes);
app.use('/api/v1/suppliers', protect, apiLimiter, supplierRoutes);
app.use('/api/v1/returns', protect, apiLimiter, returnRoutes);
app.use('/api/v1/orders', orderRoutes);

const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));

app.get('*', (req, res) => {
    const indexPath = path.join(clientDist, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).json({ message: 'API works, but client/dist is missing. Did you run npm run build?' });
    }
});

app.use(errorHandler);

// ── Phase 5.2 Real-time Dashboard with Socket.io ─────────────────────────────
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: IS_PROD ? allowedOrigins : '*',
        methods: ['GET', 'POST']
    }
});
app.set('io', io);

io.on('connection', (socket) => {
    logger.debug({ event: 'socket_connection_established', id: socket.id });
});

server.listen(PORT, () => {
    logger.info({ event: 'server_start', port: PORT, env: process.env.NODE_ENV || 'development' });
    console.log(`Server running on port ${PORT}`);
});
