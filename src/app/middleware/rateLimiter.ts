import type { NextFunction, Request, Response } from 'express';
import { createHash } from 'node:crypto';
import { pubClient } from '@app/redis/index.js';

type RateLimiterOptions = {
  name: string;
  windowMs: number;
  max: number;
  message?: string;
};

const incrementScript = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return { current, ttl }
`;

const clientKey = (req: Request) => {
  const identity = req.ip || req.socket.remoteAddress || 'unknown';
  return createHash('sha256').update(identity).digest('hex');
};

export const createRateLimiter = ({
  name,
  windowMs,
  max,
  message = 'Too many requests. Please try again later.',
}: RateLimiterOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Do not turn a temporary Redis outage into a full API outage.
    if (!pubClient.isReady) return next();

    try {
      const key = `rate-limit:${name}:${clientKey(req)}`;
      const result = (await pubClient.eval(incrementScript, {
        keys: [key],
        arguments: [String(windowMs)],
      })) as [number, number];

      const current = Number(result[0]);
      const ttlMs = Math.max(Number(result[1]), 0);
      const remaining = Math.max(max - current, 0);
      const resetSeconds = Math.max(Math.ceil(ttlMs / 1000), 1);

      res.setHeader('RateLimit-Limit', String(max));
      res.setHeader('RateLimit-Remaining', String(remaining));
      res.setHeader('RateLimit-Reset', String(resetSeconds));

      if (current > max) {
        res.setHeader('Retry-After', String(resetSeconds));
        res.status(429).json({
          success: false,
          statusCode: 429,
          message,
          retryAfter: resetSeconds,
        });
        return;
      }

      next();
    } catch (error) {
      console.error(`[RateLimiter:${name}] Redis error:`, error);
      next();
    }
  };
};

export const apiRateLimiter = createRateLimiter({
  name: 'api',
  windowMs: 15 * 60 * 1000,
  max: 300,
});

export const authRateLimiter = createRateLimiter({
  name: 'auth',
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts. Please try again later.',
});

export const paymentRateLimiter = createRateLimiter({
  name: 'payment',
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many payment requests. Please wait before trying again.',
});
