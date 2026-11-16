/**
 * In-Memory Sliding-Window Rate Limiter for Next.js App Router
 * Mitigates API spam, resource abuse, and financial loss from SMS/Telegram balance exhaustion.
 */

interface RateLimitRecord {
  timestamps: number[];
}

// Global in-memory map holding request timestamp histories
const rateLimitMap = new Map<string, RateLimitRecord>();

let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

/**
 * Periodically purge stale records to prevent memory exhaustion in long-running processes
 */
function pruneStaleRecords(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, record] of rateLimitMap.entries()) {
    const fresh = record.timestamps.filter(ts => now - ts < windowMs);
    if (fresh.length === 0) {
      rateLimitMap.delete(key);
    } else {
      record.timestamps = fresh;
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number; // Unix timestamp in seconds
  retryAfterSec: number;
}

/**
 * Check if a request identified by `identifier` exceeds `limit` in a sliding `windowMs`.
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60 * 1000
): RateLimitResult {
  const now = Date.now();
  pruneStaleRecords(windowMs);

  let record = rateLimitMap.get(identifier);
  if (!record) {
    record = { timestamps: [] };
    rateLimitMap.set(identifier, record);
  }

  // Filter out timestamps older than the sliding window
  record.timestamps = record.timestamps.filter(ts => now - ts < windowMs);

  const resetTime = Math.ceil((now + windowMs) / 1000);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetTime,
      retryAfterSec,
    };
  }

  record.timestamps.push(now);
  const remaining = Math.max(0, limit - record.timestamps.length);

  return {
    allowed: true,
    limit,
    remaining,
    resetTime,
    retryAfterSec: 0,
  };
}

/**
 * Extract client IP address reliably from incoming request headers
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfIp = request.headers.get('cf-connecting-ip');

  let ip = '';
  if (forwarded) {
    ip = forwarded.split(',')[0].trim();
  } else if (realIp) {
    ip = realIp.trim();
  } else if (cfIp) {
    ip = cfIp.trim();
  }

  if (ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }

  return ip || '127.0.0.1';
}
