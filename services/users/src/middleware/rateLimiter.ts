import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * Rate Limiting Middleware
 * Implements per-IP and per-API-key rate limiting using in-memory store
 * Note: For production, consider using Redis for distributed rate limiting
 */

// In-memory store for rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitOptions {
  max: number; // Maximum requests
  windowMs: number; // Time window in milliseconds
  keyGenerator: (req: FastifyRequest) => string;
}

/**
 * Simple rate limiting middleware
 * Returns 429 if rate limit exceeded
 */
export function createRateLimiter(options: RateLimitOptions) {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const key = options.keyGenerator(req);
    const now = Date.now();
    
    // Get or create entry
    let entry = rateLimitStore.get(key);
    
    // Clean up expired entries
    if (entry && now > entry.resetTime) {
      rateLimitStore.delete(key);
      entry = undefined;
    }
    
    if (!entry) {
      // Create new entry
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      return; // Allow request
    }
    
    // Check if limit exceeded
    if (entry.count >= options.max) {
      const ttl = Math.ceil((entry.resetTime - now) / 1000);
      return reply.code(429).send({
        error: "Rate limit exceeded",
        message: `Too many requests. Limit: ${options.max} requests per ${options.windowMs / 1000} seconds`,
        retryAfter: ttl,
      });
    }
    
    // Increment counter
    entry.count++;
  };
}

/**
 * Per-IP rate limiter (100 requests per minute)
 */
export const ipRateLimiter = createRateLimiter({
  max: 100,
  windowMs: 60 * 1000, // 1 minute
  keyGenerator: (req: FastifyRequest) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    return `rate-limit:ip:${ip}`;
  },
});

/**
 * Per-API-key rate limiter (1000 requests per minute)
 */
export const apiKeyRateLimiter = createRateLimiter({
  max: 1000,
  windowMs: 60 * 1000, // 1 minute
  keyGenerator: (req: FastifyRequest) => {
    // Use API key ID if available (set by apiKeyAuth middleware)
    const apiKeyId = (req as any).apiKeyId;
    if (apiKeyId) {
      return `rate-limit:apikey:${apiKeyId}`;
    }
    // Fallback to IP if no API key
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    return `rate-limit:ip:${ip}`;
  },
});

