import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chainable,
  deleteChain,
  ownerSession,
  assignedCleanerSession,
  createSchemaMock,
} from "@/__tests__/e2e/helpers";

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
  lt: vi.fn(),
  sql: vi.fn(),
}));

// ── Imports ────────────────────────────────────────────────────────────────

import { POST } from "../delete-expired/route";

// ── Tests ──────────────────────────────────────────────────────────────────

describe("POST /api/settings/delete-expired", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
  });

  it("returns 403 for non-owner", async () => {
    mockGetApiSession.mockResolvedValue(assignedCleanerSession);
    const res = await POST();
    expect(res.status).toBe(403);
  });

  it("returns count 0 when nothing expired", async () => {
    mockDb.select.mockReturnValue(chainable([]));

    const res = await POST();
    const json = await res.json();
    expect(json.count).toBe(0);
  });

  it("deletes expired turnovers with R2 cleanup", async () => {
    // First select: expired turnovers
    const expired = [{ id: "t-expired" }];
    // Second select: photos for that turnover
    const photos = [
      { r2KeyOriginal: "orig.jpg", r2KeyThumbnail: "thumb.jpg" },
    ];

    mockDb.select
      .mockReturnValueOnce(chainable(expired))
      .mockReturnValueOnce(chainable(photos));

    mockDb.delete.mockReturnValue(deleteChain());

    const res = await POST();
    const json = await res.json();
    expect(json.count).toBe(1);
    expect(mockDeleteObject).toHaveBeenCalledTimes(2);
    expect(mockDb.delete).toHaveBeenCalled();
  });
});
