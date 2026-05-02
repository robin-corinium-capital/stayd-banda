import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chainable,
  fakeInvite,
  createSchemaMock,
} from "@/__tests__/e2e/helpers";
import { NextRequest } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockDb } = vi.hoisted(() => ({
  mockDb: { select: vi.fn() },
}));

vi.mock("@/db", () => ({ db: mockDb }));
vi.mock("@/db/schema", () => createSchemaMock());
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));

// ── Imports ────────────────────────────────────────────────────────────────

import { GET } from "../validate/route";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeReq(searchParams?: Record<string, string>) {
  const url = new URL("http://localhost:3000/api/invite/validate");
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      url.searchParams.set(k, v);
    }
  }
  return new NextRequest(url, { method: "GET" });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("GET /api/invite/validate", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 400 when token is missing", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(400);
  });

  it("returns 404 when invite not found", async () => {
    mockDb.select.mockReturnValue(chainable([]));
    const res = await GET(makeReq({ token: "nonexistent" }));
    expect(res.status).toBe(404);
  });

  it("returns 400 when invite already used", async () => {
    const invite = fakeInvite({ usedAt: new Date().toISOString() });
    mockDb.select.mockReturnValue(chainable([invite]));

    const res = await GET(makeReq({ token: "used-token" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("already been used");
  });

  it("returns 400 when invite expired", async () => {
    const invite = fakeInvite({
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    mockDb.select.mockReturnValue(chainable([invite]));

    const res = await GET(makeReq({ token: "expired-token" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("expired");
  });

  it("returns role and orgName for valid invite", async () => {
    const invite = fakeInvite({ usedAt: null });
    const org = { name: "Beach Corp" };
    mockDb.select
      .mockReturnValueOnce(chainable([invite]))  // invite lookup
      .mockReturnValueOnce(chainable([org]));     // org lookup

    const res = await GET(makeReq({ token: "valid-token" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.role).toBe("cleaner");
    expect(json.orgName).toBe("Beach Corp");
    expect(json.expiresAt).toBeDefined();
  });
});
