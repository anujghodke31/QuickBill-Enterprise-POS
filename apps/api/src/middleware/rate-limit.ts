import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { env } from '../config/env';
import { AppError } from '../lib/errors';

function limiter(windowMs: number, limit: number, message: string, perUser = false) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => env.isTest,
    keyGenerator: (req) =>
      perUser && req.user ? `u:${req.user.id}` : ipKeyGenerator(req.ip ?? ''),
    handler: (_req, _res, next) => next(new AppError(429, 'RATE_LIMITED', message)),
  });
}

export const authLimiter = limiter(
  15 * 60 * 1000,
  20,
  'Too many sign-in attempts. Please wait a few minutes and try again.',
);

export const apiLimiter = limiter(60 * 1000, 600, 'Too many requests. Please slow down.');

export const orderLimiter = limiter(
  10 * 60 * 1000,
  15,
  'Too many orders from this device. Please try again later.',
);

/** Claude calls cost money: cap them per signed-in user. */
export const aiLimiter = limiter(
  60 * 1000,
  12,
  'AI request limit reached. Please wait a minute.',
  true,
);
