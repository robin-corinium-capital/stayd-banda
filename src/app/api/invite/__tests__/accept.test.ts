import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chainable,
  insertChain,
  updateChain,
  ownerSession,
  fakeInvite,
  createSchemaMock,
} from "@/__tests__/e2e/helpers";
import { NextRequest } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockGetApiSession, mockIsAuthError, mockDb } = vi.hoisted(() => ({
  mockGetApiSession: vi.fn(),
  mockIsAuthError: vi.fn().mockReturnValue(false),
  mockDb: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  getApiSession: mockGetApiSession,
  isAuthError: mockIsAuthError,
}));

vi.mock("@/db", () => ({ db: mockDb }));
vi.mock("@/db/schema", () => createSchemaMock());
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
}));

// ── Imports ────────────────────────────────────────────────────────────────

import { POST } from "../accept/route";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeReq(body?: Record<string, unknown>) {
  return new NextRequest(new URL("http://localhost:3000/api/invite/accept"), {
    method: "POST",
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("POST /api/invite/accept", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
  });

  it("returns 401 when unauthenticated", async () => {
    const unauthResp = new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 });
    mockGetApiSession.mockResolvedValue(unauthResp);
    mockIsAuthError.mockReturnValue(true);

    const res = await POST(makeReq({ token: "abc" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when token is missing", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("returns 404 when invite not found", async () => {
    mockDb.select.mockReturnValue(chainable([]));
    const res = await POST(makeReq({ token: "nonexistent" }));
    expect(res.status).toBe(404);
  });

  it("returns 400 when invite already used", async () => {
    const invite = fakeInvite({ usedAt: new Date().toISOString() });
    mockDb.select.mockReturnValue(chainable([invite]));

    const res = await POST(makeReq({ token: "used" }));
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

    const res = await POST(makeReq({ token: "expired" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("expired");
  });

  it("returns 400 when already a member", async () => {
    const invite = fakeInvite({ usedAt: null });
    mockDb.select
      .mockReturnValueOnce(chainable([invite]))              // invite lookup
      .mockReturnValueOnce(chainable([{ id: "existing" }])); // existing member

    const res = await POST(makeReq({ token: "valid" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("already a member");
  });

  it("accepts invite, creates member, and marks used", async () => {
    const invite = fakeInvite({ usedAt: null, propertyIds: "p-1,p-2" });
    mockDb.select
      .mockReturnValueOnce(chainable([invite]))  // invite lookup
      .mockReturnValueOnce(chainable([]));        // no existing member

    mockDb.insert.mockReturnValue(insertChain({}));
    mockDb.update.mockReturnValue(updateChain());

    const res = await POST(makeReq({ token: "valid" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.orgId).toBe("org-1");
    // insert called for orgMember + 2 property assignments = 3 times
    expect(mockDb.insert).toHaveBeenCalledTimes(3);
  });
});
