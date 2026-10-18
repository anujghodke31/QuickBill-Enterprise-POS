const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// ── Redaction format to never log secure data ─────────────
const redactFilter = winston.format((info) => {
    const sensitiveKeys = ['password', 'token', 'refreshToken', 'credential', 'cardNumber'];
    const redactNode = (node) => {
        if (!node || typeof node !== 'object') return;
        Object.keys(node).forEach(key => {
            if (sensitiveKeys.includes(key)) {
                node[key] = '[REDACTED]';
            } else if (typeof node[key] === 'object') {
                redactNode(node[key]);
            }
        });
    };
    redactNode(info);
    return info;
});

const isProd = process.env.NODE_ENV === 'production';

const transportsList = [
    // Daily Rotate for Combined errors
    new DailyRotateFile({
        filename: path.join(__dirname, '../../logs/error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxFiles: '14d',
        maxSize: '20m',
        zippedArchive: true,
    }),
    // Daily Rotate for Generic Combined
    new DailyRotateFile({
        filename: path.join(__dirname, '../../logs/combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxFiles: '14d',
        maxSize: '20m',
        zippedArchive: true,
    })
];

if (!isProd) {
    transportsList.push(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    );
}

const logger = winston.createLogger({
    levels: winston.config.npm.levels, // error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6
    level: isProd ? 'info' : 'debug',
    format: winston.format.combine(
        redactFilter(),
        logFormat
    ),
    defaultMeta: { service: 'quickbill-api' },
    transports: transportsList
});

module.exports = logger;
