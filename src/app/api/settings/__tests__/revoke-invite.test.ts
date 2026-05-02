import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  deleteChain,
  ownerSession,
  assignedCleanerSession,
  createSchemaMock,
} from "@/__tests__/e2e/helpers";
import { NextRequest } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockGetApiSession, mockIsAuthError, mockDb } = vi.hoisted(() => ({
  mockGetApiSession: vi.fn(),
  mockIsAuthError: vi.fn().mockReturnValue(false),
  mockDb: {
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
}));

// ── Imports ────────────────────────────────────────────────────────────────

import { DELETE } from "../team/revoke-invite/route";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeReq(body?: Record<string, unknown>) {
  return new NextRequest(
    new URL("http://localhost:3000/api/settings/team/revoke-invite"),
    { method: "DELETE", ...(body ? { body: JSON.stringify(body) } : {}) }
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("DELETE /api/settings/team/revoke-invite", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
  });

  it("returns 403 for non-owner", async () => {
    mockGetApiSession.mockResolvedValue(assignedCleanerSession);
    const res = await DELETE(makeReq({ inviteId: "inv-1" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 without inviteId", async () => {
    const res = await DELETE(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("revokes invite successfully", async () => {
    mockDb.delete.mockReturnValue(deleteChain());
    const res = await DELETE(makeReq({ inviteId: "inv-1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toContain("revoked");
  });
});
