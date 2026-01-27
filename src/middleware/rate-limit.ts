/**
 * Rate limiting middleware for API routes
 * Prevents abuse by limiting requests per user per time window
 */

import type { MiddlewareHandler } from "astro";

import { RateLimitConstraints } from "@/types";

/**
 * Custom error class for rate limit violations
 */
export class RateLimitError extends Error {
  constructor(public resetTime: number) {
    super("Rate limit exceeded");
    this.name = "RateLimitError";
  }
}

/**
 * Rate limit tracking data structure
 */
interface RateLimitData {
  count: number;
  resetAt: number;
}

/**
 * In-memory store for rate limit tracking
 * Note: In production, use Redis or similar distributed cache
 */
const rateLimitStore = new Map<string, RateLimitData>();

/**
 * Rate limiting middleware
 * Enforces request limits per user per time window
 *
 * Current limits:
 * - 100 requests per minute for general API endpoints
 * - Tracked per authenticated user
 *
 * @throws RateLimitError if limit exceeded
 */
export const rateLimitMiddleware: MiddlewareHandler = async (context, next) => {
  // Only apply to API routes
  if (!context.url.pathname.startsWith("/api")) {
    return next();
  }

  // Skip if no user (auth middleware will handle this)
  const userId = context.locals.userId;
  if (!userId) {
    return next();
  }

  const now = Date.now();
  const key = `rate_limit:${userId}`;
  const limit = RateLimitConstraints.REQUESTS_PER_MINUTE;
  const windowMs = 60000; // 1 minute in milliseconds

  // Get or initialize rate limit data for user
  let userLimit = rateLimitStore.get(key);

  // Reset window if expired
  if (!userLimit || now > userLimit.resetAt) {
    userLimit = {
      count: 0,
      resetAt: now + windowMs,
    };
  }

  // Increment request count
  userLimit.count++;
  rateLimitStore.set(key, userLimit);

  // Check if limit exceeded
  if (userLimit.count > limit) {
    throw new RateLimitError(userLimit.resetAt);
  }

  // Continue to next middleware/handler
  const response = await next();

  // Add rate limit headers to response
  response.headers.set("X-RateLimit-Limit", limit.toString());
  response.headers.set("X-RateLimit-Remaining", Math.max(0, limit - userLimit.count).toString());
  response.headers.set("X-RateLimit-Reset", Math.floor(userLimit.resetAt / 1000).toString());

  return response;
};

/**
 * Cleanup function to remove expired entries from rate limit store
 * Should be called periodically (e.g., every minute)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every minute
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimitStore, 60000);
}
