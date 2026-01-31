import { createMiddleware } from 'hono/factory';
import { RateLimitError } from '../utils/errors.js';
import { env } from '../config/env.js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory rate limit store
// In production, use Redis for distributed rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60_000); // Clean up every minute

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, maxRequests, keyPrefix = 'rl' } = options;

  return createMiddleware(async (c, next) => {
    // Get identifier - prefer agent ID, fall back to IP
    const agent = c.get('agent');
    const identifier = agent?.id || c.req.header('x-forwarded-for') || 'unknown';
    const key = `${keyPrefix}:${identifier}`;

    const now = Date.now();
    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt < now) {
      // Create new entry or reset expired one
      entry = {
        count: 1,
        resetAt: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    } else {
      entry.count++;
    }

    // Calculate remaining and reset time
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetIn = Math.ceil((entry.resetAt - now) / 1000);

    // Set rate limit headers
    c.header('X-RateLimit-Limit', String(maxRequests));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > maxRequests) {
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${resetIn} seconds.`,
        resetIn
      );
    }

    return next();
  });
}

// General API rate limiter: 60 requests per minute
export const apiRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 60,
  keyPrefix: 'api',
});

// Token launch rate limiter: configurable per hour
export const launchRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: env.RATE_LIMIT_LAUNCHES_PER_HOUR,
  keyPrefix: 'launch',
});

// Image upload rate limiter: 20 per minute
export const uploadRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 20,
  keyPrefix: 'upload',
});

// Registration rate limiter: 5 per hour per IP
export const registrationRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
  keyPrefix: 'register',
});
