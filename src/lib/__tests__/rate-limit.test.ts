import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit } from "../rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const limiter = rateLimit({ interval: 60_000, maxRequests: 3 });

    expect(limiter.check("ip1").success).toBe(true);
    expect(limiter.check("ip1").success).toBe(true);
    expect(limiter.check("ip1").success).toBe(true);
  });

  it("blocks requests over the limit", () => {
    const limiter = rateLimit({ interval: 60_000, maxRequests: 2 });

    limiter.check("ip1");
    limiter.check("ip1");
    expect(limiter.check("ip1").success).toBe(false);
    expect(limiter.check("ip1").remaining).toBe(0);
  });

  it("resets after interval", () => {
    const limiter = rateLimit({ interval: 60_000, maxRequests: 1 });

    limiter.check("ip1");
    expect(limiter.check("ip1").success).toBe(false);

    vi.advanceTimersByTime(61_000);

    expect(limiter.check("ip1").success).toBe(true);
  });

  it("tracks different keys independently", () => {
    const limiter = rateLimit({ interval: 60_000, maxRequests: 1 });

    limiter.check("ip1");
    expect(limiter.check("ip1").success).toBe(false);
    expect(limiter.check("ip2").success).toBe(true);
  });

  it("returns correct remaining count", () => {
    const limiter = rateLimit({ interval: 60_000, maxRequests: 3 });

    expect(limiter.check("ip1").remaining).toBe(2);
    expect(limiter.check("ip1").remaining).toBe(1);
    expect(limiter.check("ip1").remaining).toBe(0);
  });
});
