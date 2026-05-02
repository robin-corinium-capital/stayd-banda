import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chainable,
  updateChain,
  ownerSession,
  createSchemaMock,
} from "@/__tests__/e2e/helpers";
import { NextRequest } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockGetApiSession, mockIsAuthError, mockDb, mockBcryptCompare, mockBcryptHash } =
  vi.hoisted(() => ({
    mockGetApiSession: vi.fn(),
    mockIsAuthError: vi.fn().mockReturnValue(false),
    mockDb: {
      select: vi.fn(),
      update: vi.fn(),
    },
    mockBcryptCompare: vi.fn(),
    mockBcryptHash: vi.fn(),
  }));

vi.mock("@/lib/auth-helpers", () => ({
  getApiSession: mockGetApiSession,
  isAuthError: mockIsAuthError,
}));

vi.mock("@/db", () => ({ db: mockDb }));
vi.mock("@/db/schema", () => createSchemaMock());
vi.mock("bcryptjs", () => ({
  default: {
    compare: mockBcryptCompare,
    hash: mockBcryptHash,
  },
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
}));

// ── Imports ────────────────────────────────────────────────────────────────

import { PATCH } from "../profile/route";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeReq(body: Record<string, unknown>) {
  return new NextRequest(
    new URL("http://localhost:3000/api/settings/profile"),
    { method: "PATCH", body: JSON.stringify(body) }
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("PATCH /api/settings/profile", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
  });

  it("returns 401 when unauthenticated", async () => {
    const unauthResp = new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 });
    mockGetApiSession.mockResolvedValue(unauthResp);
    mockIsAuthError.mockReturnValue(true);

    const res = await PATCH(makeReq({ name: "New" }));
    expect(res.status).toBe(401);
  });

  it("updates name only", async () => {
    mockDb.update.mockReturnValue(updateChain());

    const res = await PATCH(makeReq({ name: "New Name" }));
    expect(res.status).toBe(200);
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("returns 400 when changing password without current password", async () => {
    const res = await PATCH(makeReq({ newPassword: "newpass123" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Current password");
  });

  it("returns 400 when new password is too short", async () => {
    const res = await PATCH(makeReq({ currentPassword: "old", newPassword: "short" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("8 characters");
  });

  it("returns 400 for social login account (no passwordHash)", async () => {
    mockDb.select.mockReturnValue(chainable([{ passwordHash: null }]));

    const res = await PATCH(makeReq({ currentPassword: "old", newPassword: "newpass123" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("social login");
  });

  it("returns 400 for incorrect current password", async () => {
    mockDb.select.mockReturnValue(chainable([{ passwordHash: "$2a$10$hash" }]));
    mockBcryptCompare.mockResolvedValue(false);

    const res = await PATCH(makeReq({ currentPassword: "wrong", newPassword: "newpass123" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("incorrect");
  });

  it("changes password successfully", async () => {
    mockDb.select.mockReturnValue(chainable([{ passwordHash: "$2a$10$hash" }]));
    mockBcryptCompare.mockResolvedValue(true);
    mockBcryptHash.mockResolvedValue("$2a$12$newhash");
    mockDb.update.mockReturnValue(updateChain());

    const res = await PATCH(makeReq({ currentPassword: "correct", newPassword: "newpass123" }));
    expect(res.status).toBe(200);
    expect(mockBcryptHash).toHaveBeenCalledWith("newpass123", 12);
  });
});
