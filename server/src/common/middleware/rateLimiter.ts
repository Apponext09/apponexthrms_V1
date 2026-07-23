import rateLimit from 'express-rate-limit';
import { getEnv } from '../../config/env';

const env = getEnv();

/**
 * General API rate limiter
 * 100 requests per minute per IP by default
 */
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests, please try again later',
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === '/api/v1/health';
  },
});

/**
 * Stricter rate limiter for auth endpoints (login, register, OTP, etc.)
 * 10 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 30 : 500,
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  skipSuccessfulRequests: true, // Only limit failed attempts
});

/**
 * Strict rate limiter for password reset
 * 5 requests per hour per IP
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many password reset attempts, please try again later',
  standardHeaders: true,
});

/**
 * Rate limiter per user (can be combined with IP-based limiters)
 */
export function createUserRateLimiter(options: {
  windowMs?: number;
  max?: number;
  message?: string;
}) {
  return rateLimit({
    windowMs: options.windowMs || 60000,
    max: options.max || 100,
    message: options.message || 'Too many requests, please try again later',
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise use IP
      return req.user?.sub || req.socket.remoteAddress || 'unknown';
    },
    standardHeaders: true,
  });
}
