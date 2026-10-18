const redisClient = require('../config/redis');
const logger = require('../utils/logger');

const cache = (ttlSeconds) => {
    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const key = `cache:${req.originalUrl || req.url}`;

        try {
            const cachedResponse = await redisClient.get(key);

            if (cachedResponse) {
                res.setHeader('X-Cache', 'HIT');
                return res.status(200).json(JSON.parse(cachedResponse));
            }

            res.setHeader('X-Cache', 'MISS');

            // Intercept res.json to store in cache before sending
            const originalJson = res.json.bind(res);
            res.json = (body) => {
                // Only cache successful status codes
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    redisClient.setex(key, ttlSeconds, JSON.stringify(body))
                        .catch(err => logger.error({ event: 'redis_cache_write_error', error: err.message }));
                }
                return originalJson(body);
            };

            next();
        } catch (error) {
            logger.error({ event: 'redis_cache_read_error', error: error.message });
            next(); // Proceed without cache if Redis is down
        }
    };
};

const invalidateCache = async (pattern) => {
    try {
        const keys = await redisClient.keys(`cache:${pattern}`);
        if (keys.length > 0) {
            await redisClient.del(keys);
            logger.debug({ event: 'redis_cache_invalidated', keys });
        }
    } catch (error) {
        logger.error({ event: 'redis_cache_invalidate_error', error: error.message });
    }
};

module.exports = { cache, invalidateCache };
