const Redis = require('ioredis');
const logger = require('../utils/logger');

// Support Redis config from environments or docker-compose
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy(times) {
        if (times > 5) {
            logger.error({ event: 'redis_connection_failed', message: 'Failed to connect to Redis after 5 retries.' });
            return null; // Stop retrying
        }
        return Math.min(times * 50, 2000);
    }
});

redisClient.on('connect', () => logger.info({ event: 'redis_connected' }));
redisClient.on('error', (err) => logger.error({ event: 'redis_error', error: err.message }));

module.exports = redisClient;