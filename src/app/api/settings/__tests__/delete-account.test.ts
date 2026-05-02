import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chainable,
  deleteChain,
  ownerSession,
  assignedCleanerSession,
  createSchemaMock,
} from "@/__tests__/e2e/helpers";
import { NextRequest } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockGetApiSession, mockIsAuthError, mockDb, mockDeleteObject } = vi.hoisted(() => ({
  mockGetApiSession: vi.fn(),
  mockIsAuthError: vi.fn().mockReturnValue(false),
  mockDb: {
    select: vi.fn(),
    delete: vi.fn(),
  },
  mockDeleteObject: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth-helpers", () => ({
  getApiSession: mockGetApiSession,
  isAuthError: mockIsAuthError,
  isOwner: (s: { role: string }) => s.role === "owner",
}));

vi.mock("@/db", () => ({ db: mockDb }));
vi.mock("@/db/schema", () => createSchemaMock());
vi.mock("@/lib/r2", () => ({ deleteObject: mockDeleteObject }));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  ne: vi.fn(),
}));

// ── Imports ────────────────────────────────────────────────────────────────

import { DELETE } from "../delete-account/route";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeReq(body: Record<string, unknown>) {
  return new NextRequest(
    new URL("http://localhost:3000/api/settings/delete-account"),
    { method: "DELETE", body: JSON.stringify(body) }
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("DELETE /api/settings/delete-account", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
  });

  it("returns 400 when email does not match", async () => {
    const res = await DELETE(makeReq({ confirmEmail: "wrong@test.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when confirmEmail is missing", async () => {
    const res = await DELETE(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when owner has other members", async () => {
    mockDb.select.mockReturnValue(
      chainable([{ id: "om-2", userId: "user-other" }])
    );

    const res = await DELETE(makeReq({ confirmEmail: ownerSession.email }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("team members");
  });

  it("deletes owner account with R2 cleanup and org deletion", async () => {
    // No other members
    mockDb.select
      .mockReturnValueOnce(chainable([]))  // no other members
      .mockReturnValueOnce(chainable([     // photos to clean up
        { r2KeyOriginal: "orig.jpg", r2KeyThumbnail: "thumb.jpg" },
      ]));

    mockDb.delete.mockReturnValue(deleteChain());

    const res = await DELETE(makeReq({ confirmEmail: ownerSession.email }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toContain("deleted");
    expect(mockDeleteObject).toHaveBeenCalledTimes(2);
    expect(mockDb.delete).toHaveBeenCalledTimes(2); // org + user
  });

  it("deletes cleaner account without org deletion", async () => {
    mockGetApiSession.mockResolvedValue(assignedCleanerSession);

    // Photos for org
    mockDb.select.mockReturnValue(chainable([]));
    mockDb.delete.mockReturnValue(deleteChain());

    const res = await DELETE(makeReq({ confirmEmail: assignedCleanerSession.email }));
    expect(res.status).toBe(200);
    expect(mockDb.delete).toHaveBeenCalledTimes(1); // just user, no org
  });
});
