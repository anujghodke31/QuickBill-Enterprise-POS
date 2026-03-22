const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
    const IS_PROD = process.env.NODE_ENV === 'production';

    logger.error({
        event: 'api_error',
        statusCode,
        message: err.message,
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
        stack: err.stack,
    });

    res.status(statusCode).json({
        message: err.message,
        stack: IS_PROD ? undefined : err.stack,
    });
};

module.exports = { errorHandler };
