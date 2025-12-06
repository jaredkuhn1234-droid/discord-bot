interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const userLimits = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW = 10000; // 10 seconds
const RATE_LIMIT_MAX = 5; // 5 commands per window

export const checkRateLimit = (userId: string): boolean => {
  const now = Date.now();
  const entry = userLimits.get(userId);

  if (!entry || now > entry.resetAt) {
    userLimits.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count += 1;
  return true;
};

export const clearExpiredLimits = () => {
  const now = Date.now();
  for (const [userId, entry] of userLimits.entries()) {
    if (now > entry.resetAt) {
      userLimits.delete(userId);
    }
  }
};

// Clean up expired entries every minute
setInterval(clearExpiredLimits, 60000);
