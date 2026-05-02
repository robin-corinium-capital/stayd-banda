import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chainable,
  deleteChain,
  ownerSession,
  assignedCleanerSession,
  fakeOrgMember,
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
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  getApiSession: mockGetApiSession,
  isAuthError: mockIsAuthError,
  isOwner: (s: { role: string }) => s.role === "owner",
}));

vi.mock("@/db", () => ({ db: mockDb }));
vi.mock("@/db/schema", () => createSchemaMock());
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  inArray: vi.fn(),
  isNull: vi.fn(),
  gt: vi.fn(),
}));

// ── Imports ────────────────────────────────────────────────────────────────

import { GET, DELETE } from "../team/route";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeReq(method: string, body?: Record<string, unknown>) {
  return new NextRequest(new URL("http://localhost:3000/api/settings/team"), {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

// ── GET tests ──────────────────────────────────────────────────────────────

describe("GET /api/settings/team", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
  });

  it("returns 403 for non-owner", async () => {
    mockGetApiSession.mockResolvedValue(assignedCleanerSession);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns members and invites", async () => {
    const members = [
      { id: "om-1", role: "owner", createdAt: "2025-01-01", userId: "user-owner", userName: "Owner", userEmail: "owner@test.com" },
    ];
    const invites = [fakeInvite()];

    mockDb.select
      .mockReturnValueOnce(chainable(members))    // members query
      .mockReturnValueOnce(chainable(invites));    // pending invites

    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.members).toHaveLength(1);
    expect(json.invites).toHaveLength(1);
    // Token should be truncated
    expect(json.invites[0].token).toContain("...");
  });

  it("fetches assignments for cleaners", async () => {
    const members = [
      { id: "om-1", role: "owner", createdAt: "2025-01-01", userId: "user-owner", userName: "Owner", userEmail: "owner@test.com" },
      { id: "om-2", role: "cleaner", createdAt: "2025-01-02", userId: "user-cleaner", userName: "Cleaner", userEmail: "cleaner@test.com" },
    ];
    const assignments = [{ userId: "user-cleaner", propertyName: "Beach House" }];
    const invites: unknown[] = [];

    mockDb.select
      .mockReturnValueOnce(chainable(members))         // members
      .mockReturnValueOnce(chainable(assignments))      // assignments
      .mockReturnValueOnce(chainable(invites));          // invites

    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    const cleaner = json.members.find((m: { role: string }) => m.role === "cleaner");
    expect(cleaner.assignedProperties).toEqual(["Beach House"]);
  });
});

// ── DELETE tests ───────────────────────────────────────────────────────────

describe("DELETE /api/settings/team", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
  });

  it("returns 403 for non-owner", async () => {
    mockGetApiSession.mockResolvedValue(assignedCleanerSession);
    const res = await DELETE(makeReq("DELETE", { memberId: "om-1" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 without memberId", async () => {
    const res = await DELETE(makeReq("DELETE", {}));
    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent member", async () => {
    mockDb.select.mockReturnValue(chainable([]));
    const res = await DELETE(makeReq("DELETE", { memberId: "om-999" }));
    expect(res.status).toBe(404);
  });

  it("returns 400 when trying to remove self", async () => {
    mockDb.select.mockReturnValue(
      chainable([fakeOrgMember({ userId: ownerSession.userId })])
    );
    const res = await DELETE(makeReq("DELETE", { memberId: "om-1" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("yourself");
  });

  it("removes member successfully", async () => {
    mockDb.select.mockReturnValue(
      chainable([fakeOrgMember({ userId: "user-other" })])
    );
    mockDb.delete.mockReturnValue(deleteChain());

    const res = await DELETE(makeReq("DELETE", { memberId: "om-2" }));
    expect(res.status).toBe(200);
    expect(mockDb.delete).toHaveBeenCalledTimes(2); // assignments + membership
  });
});
