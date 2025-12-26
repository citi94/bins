/**
 * Simple in-memory rate limiter
 * Note: This resets across serverless function invocations, but provides
 * basic protection within a single instance's lifetime
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Store rate limit entries by IP
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically (every 100 requests)
let requestCount = 0;

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (usually IP address)
 * @param config - Rate limit configuration
 * @returns Whether the request is allowed and remaining quota
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  requestCount++;
  if (requestCount % 100 === 0) {
    cleanup();
  }

  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // If no entry or window expired, create new entry
  if (!entry || entry.resetAt < now) {
    const resetAt = now + config.windowMs;
    rateLimitStore.set(identifier, { count: 1, resetAt });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetAt,
    };
  }

  // Check if over limit
  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Increment counter
  entry.count++;
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  // Check various headers for real IP (reverse proxy scenarios)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Netlify-specific header
  const netlifyIP = request.headers.get('x-nf-client-connection-ip');
  if (netlifyIP) {
    return netlifyIP;
  }

  // Fallback - won't work in serverless but provides a default
  return 'unknown';
}

// Default configurations for different endpoints
export const RATE_LIMITS = {
  // Postcode lookup: 30 requests per minute per IP
  lookup: { windowMs: 60 * 1000, maxRequests: 30 },
  // Subscribe: 10 requests per minute per IP
  subscribe: { windowMs: 60 * 1000, maxRequests: 10 },
  // Calendar fetch: 60 requests per minute per IP
  calendar: { windowMs: 60 * 1000, maxRequests: 60 },
  // Delete: 5 requests per minute per IP
  delete: { windowMs: 60 * 1000, maxRequests: 5 },
} as const;
