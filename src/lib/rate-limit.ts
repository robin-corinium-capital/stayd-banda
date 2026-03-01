interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterConfig {
  interval: number; // ms
  maxRequests: number;
}

export function rateLimit({ interval, maxRequests }: RateLimiterConfig) {
  const store = new Map<string, RateLimitEntry>();

  // Clean up expired entries every 60s
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    }
  }, 60_000);

  return {
    check(key: string): { success: boolean; remaining: number } {
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || entry.resetAt < now) {
        store.set(key, { count: 1, resetAt: now + interval });
        return { success: true, remaining: maxRequests - 1 };
      }

      if (entry.count >= maxRequests) {
        return { success: false, remaining: 0 };
      }

      entry.count++;
      return { success: true, remaining: maxRequests - entry.count };
    },
  };
}
