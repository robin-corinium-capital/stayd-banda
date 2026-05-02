import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chainable,
  updateChain,
  deleteChain,
  ownerSession,
  assignedCleanerSession,
  viewerSession,
  fakePhoto,
  createSchemaMock,
} from "@/__tests__/e2e/helpers";
import { NextRequest } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockGetApiSession, mockIsAuthError, mockDb, mockDeleteObject } = vi.hoisted(() => ({
  mockGetApiSession: vi.fn(),
  mockIsAuthError: vi.fn().mockReturnValue(false),
  mockDb: {
    select: vi.fn(),
    update: vi.fn(),
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
vi.mock("@/lib/r2", () => ({
  deleteObject: mockDeleteObject,
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
}));

// ── Imports ────────────────────────────────────────────────────────────────

import { PATCH, DELETE } from "../[id]/route";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeReq(method: string, body?: Record<string, unknown>) {
  return new NextRequest(new URL("http://localhost:3000/api/photos/ph-1"), {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

const ctx = { params: Promise.resolve({ id: "ph-1" }) };

function photoInOrg(overrides?: Record<string, unknown>) {
  return fakePhoto({ propertyOrgId: "org-1", ...overrides });
}

// ── PATCH tests ────────────────────────────────────────────────────────────

describe("PATCH /api/photos/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
  });

  it("returns 401 when unauthenticated", async () => {
    const unauthResp = new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 });
    mockGetApiSession.mockResolvedValue(unauthResp);
    mockIsAuthError.mockReturnValue(true);

    const res = await PATCH(makeReq("PATCH", { is_damage_flagged: true }), ctx);
    expect(res.status).toBe(401);
  });

  it("returns 404 when photo not found", async () => {
    mockDb.select.mockReturnValue(chainable([]));

    const res = await PATCH(makeReq("PATCH", { is_damage_flagged: true }), ctx);
    expect(res.status).toBe(404);
  });

  it("returns 404 when photo in different org", async () => {
    mockDb.select.mockReturnValue(chainable([fakePhoto({ propertyOrgId: "org-other" })]));

    const res = await PATCH(makeReq("PATCH", { is_damage_flagged: true }), ctx);
    expect(res.status).toBe(404);
  });

  it("returns 403 for non-owner non-uploader", async () => {
    mockGetApiSession.mockResolvedValue(viewerSession);
    mockDb.select.mockReturnValue(chainable([photoInOrg({ uploadedBy: "user-someone-else" })]));

    const res = await PATCH(makeReq("PATCH", { is_damage_flagged: true }), ctx);
    expect(res.status).toBe(403);
  });

  it("allows owner to update any photo", async () => {
    const updated = photoInOrg({ isDamageFlagged: true });
    mockDb.select.mockReturnValue(chainable([photoInOrg({ uploadedBy: "user-someone" })]));
    mockDb.update.mockReturnValue(updateChain(updated));

    const res = await PATCH(makeReq("PATCH", { is_damage_flagged: true }), ctx);
    expect(res.status).toBe(200);
  });

  it("allows uploader to update own photo", async () => {
    mockGetApiSession.mockResolvedValue(assignedCleanerSession);
    const photo = photoInOrg({ uploadedBy: assignedCleanerSession.userId });
    const updated = { ...photo, isDamageFlagged: true };
    mockDb.select.mockReturnValue(chainable([photo]));
    mockDb.update.mockReturnValue(updateChain(updated));

    const res = await PATCH(makeReq("PATCH", { is_damage_flagged: true }), ctx);
    expect(res.status).toBe(200);
  });

  it("returns 400 when no valid fields provided", async () => {
    mockDb.select.mockReturnValue(chainable([photoInOrg()]));

    const res = await PATCH(makeReq("PATCH", { invalid_field: "x" }), ctx);
    expect(res.status).toBe(400);
  });
});

// ── DELETE tests ───────────────────────────────────────────────────────────

describe("DELETE /api/photos/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
  });

  it("returns 403 for non-owner", async () => {
    mockGetApiSession.mockResolvedValue(assignedCleanerSession);

    const res = await DELETE(makeReq("DELETE"), ctx);
    expect(res.status).toBe(403);
  });

  it("returns 404 when photo not found", async () => {
    mockDb.select.mockReturnValue(chainable([]));

    const res = await DELETE(makeReq("DELETE"), ctx);
    expect(res.status).toBe(404);
  });

  it("deletes R2 objects and database record", async () => {
    const photo = photoInOrg({
      r2KeyOriginal: "org-1/p-1/t-1/photo.jpg",
      r2KeyThumbnail: "org-1/p-1/t-1/photo_thumb.jpg",
    });
    mockDb.select.mockReturnValue(chainable([photo]));
    mockDb.delete.mockReturnValue(deleteChain());

    const res = await DELETE(makeReq("DELETE"), ctx);
    expect(res.status).toBe(200);
    expect(mockDeleteObject).toHaveBeenCalledTimes(2);
    expect(mockDeleteObject).toHaveBeenCalledWith("org-1/p-1/t-1/photo.jpg");
    expect(mockDeleteObject).toHaveBeenCalledWith("org-1/p-1/t-1/photo_thumb.jpg");
  });

  it("handles photo without thumbnail", async () => {
    const photo = photoInOrg({ r2KeyThumbnail: null });
    mockDb.select.mockReturnValue(chainable([photo]));
    mockDb.delete.mockReturnValue(deleteChain());

    const res = await DELETE(makeReq("DELETE"), ctx);
    expect(res.status).toBe(200);
    expect(mockDeleteObject).toHaveBeenCalledTimes(1);
  });
});
