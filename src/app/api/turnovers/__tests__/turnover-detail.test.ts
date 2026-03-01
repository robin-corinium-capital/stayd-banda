import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockGetApiSession, mockIsAuthError, mockIsOwner, mockDb, mockDeleteObject } =
  vi.hoisted(() => {
    return {
      mockGetApiSession: vi.fn(),
      mockIsAuthError: vi.fn().mockReturnValue(false),
      mockIsOwner: vi.fn(),
      mockDb: {
        select: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      mockDeleteObject: vi.fn().mockResolvedValue(undefined),
    };
  });

vi.mock("@/lib/auth-helpers", () => ({
  getApiSession: mockGetApiSession,
  isAuthError: mockIsAuthError,
  isOwner: mockIsOwner,
}));

vi.mock("@/lib/r2", () => ({
  deleteObject: mockDeleteObject,
}));

// Chainable mock for drizzle query builder
function chainable(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "select",
    "from",
    "where",
    "innerJoin",
    "orderBy",
    "limit",
    "groupBy",
    "returning",
    "set",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(resolvedValue);
  (chain as Record<string, unknown>)[Symbol.toStringTag] = "Promise";
  return chain;
}

vi.mock("@/db", () => ({
  db: mockDb,
}));

vi.mock("@/db/schema", () => {
  const t = (name: string) => ({ name });
  return {
    turnovers: {
      id: t("id"),
      propertyId: t("property_id"),
      checkoutDate: t("checkout_date"),
      checkinDate: t("checkin_date"),
      departingGuestRef: t("departing_guest_ref"),
      arrivingGuestRef: t("arriving_guest_ref"),
      status: t("status"),
      retentionExtended: t("retention_extended"),
      createdBy: t("created_by"),
      createdAt: t("created_at"),
      completedAt: t("completed_at"),
    },
    properties: {
      id: t("id"),
      orgId: t("org_id"),
      name: t("name"),
    },
    propertyAssignments: {
      propertyId: t("property_id"),
      userId: t("user_id"),
    },
    areas: {
      id: t("id"),
      propertyId: t("property_id"),
      sortOrder: t("sort_order"),
      name: t("name"),
    },
    photos: {
      turnoverId: t("turnover_id"),
      photoSet: t("photo_set"),
      uploadTimestamp: t("upload_timestamp"),
      r2KeyOriginal: t("r2_key_original"),
      r2KeyThumbnail: t("r2_key_thumbnail"),
    },
  };
});

// ── Imports (after mocks) ──────────────────────────────────────────────────

import { GET, PATCH, DELETE } from "../[id]/route";
import { NextRequest } from "next/server";

// ── Helpers ────────────────────────────────────────────────────────────────

const ownerSession = {
  userId: "user-1",
  orgId: "org-1",
  role: "owner",
  email: "owner@test.com",
};

const cleanerSession = {
  userId: "user-2",
  orgId: "org-1",
  role: "cleaner",
  email: "cleaner@test.com",
};

function makeReq(method: string, body?: Record<string, unknown>) {
  const url = new URL("http://localhost:3000/api/turnovers/t-1");
  return new NextRequest(url, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

const makeParams = () => Promise.resolve({ id: "t-1" });

const fakeTurnover = {
  id: "t-1",
  propertyId: "p-1",
  checkoutDate: "2025-03-01",
  checkinDate: "2025-03-02",
  departingGuestRef: null,
  arrivingGuestRef: null,
  status: "open",
  retentionExtended: false,
  createdBy: "user-1",
  createdAt: new Date().toISOString(),
  completedAt: null,
  propertyName: "Beach House",
  propertyOrgId: "org-1",
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("GET /api/turnovers/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
    mockIsOwner.mockReturnValue(true);
  });

  it("returns 404 when turnover not found", async () => {
    // getTurnoverWithAccess → select returns empty
    mockDb.select.mockReturnValue(chainable([]));

    const res = await GET(makeReq("GET"), { params: makeParams() });
    expect(res.status).toBe(404);
  });

  it("returns turnover with areas and grouped photos on success", async () => {
    // First select: turnover lookup
    mockDb.select
      .mockReturnValueOnce(chainable([fakeTurnover]))
      // Second select: areas
      .mockReturnValueOnce(chainable([{ id: "a-1", name: "Kitchen" }]))
      // Third select: photos
      .mockReturnValueOnce(
        chainable([
          { id: "ph-1", photoSet: "post_checkout", areaId: "a-1" },
          { id: "ph-2", photoSet: "pre_checkin", areaId: null },
        ])
      );

    const res = await GET(makeReq("GET"), { params: makeParams() });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.propertyName).toBe("Beach House");
    expect(json.areas).toHaveLength(1);
    expect(json.totalPhotos).toBe(2);
  });
});

describe("PATCH /api/turnovers/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
    mockIsOwner.mockReturnValue(true);
  });

  it("returns 404 when turnover not found", async () => {
    mockDb.select.mockReturnValue(chainable([]));

    const res = await PATCH(makeReq("PATCH", { status: "complete" }), {
      params: makeParams(),
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when non-owner non-creator tries to update", async () => {
    mockGetApiSession.mockResolvedValue(cleanerSession);
    mockIsOwner.mockReturnValue(false);

    // Turnover exists but createdBy is different user
    const turnoverByOther = { ...fakeTurnover, createdBy: "user-99" };
    mockDb.select.mockReturnValue(chainable([turnoverByOther]));

    const res = await PATCH(makeReq("PATCH", { status: "complete" }), {
      params: makeParams(),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid status", async () => {
    mockDb.select.mockReturnValue(chainable([fakeTurnover]));

    const res = await PATCH(makeReq("PATCH", { status: "invalid_status" }), {
      params: makeParams(),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when no valid fields provided", async () => {
    mockDb.select.mockReturnValue(chainable([fakeTurnover]));

    const res = await PATCH(makeReq("PATCH", { bogus_field: "value" }), {
      params: makeParams(),
    });
    expect(res.status).toBe(400);
  });

  it("sets completedAt when status is 'complete'", async () => {
    mockDb.select.mockReturnValue(chainable([fakeTurnover]));

    const updatedTurnover = { ...fakeTurnover, status: "complete", completedAt: new Date() };
    const updateChain: Record<string, unknown> = {};
    updateChain.set = vi.fn().mockReturnValue(updateChain);
    updateChain.where = vi.fn().mockReturnValue(updateChain);
    updateChain.returning = vi.fn().mockResolvedValue([updatedTurnover]);
    mockDb.update.mockReturnValue(updateChain);

    const res = await PATCH(makeReq("PATCH", { status: "complete" }), {
      params: makeParams(),
    });
    expect(res.status).toBe(200);

    // Verify set was called with completedAt
    const setCall = (updateChain.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(setCall.status).toBe("complete");
    expect(setCall.completedAt).toBeInstanceOf(Date);
  });
});

describe("DELETE /api/turnovers/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
    mockIsOwner.mockReturnValue(true);
  });

  it("returns 403 when non-owner tries to delete", async () => {
    mockGetApiSession.mockResolvedValue(cleanerSession);
    mockIsOwner.mockReturnValue(false);

    const res = await DELETE(makeReq("DELETE"), { params: makeParams() });
    expect(res.status).toBe(403);
  });

  it("returns 404 when turnover not found", async () => {
    mockDb.select.mockReturnValue(chainable([]));

    const res = await DELETE(makeReq("DELETE"), { params: makeParams() });
    expect(res.status).toBe(404);
  });

  it("deletes R2 objects then DB record on success", async () => {
    // First select: turnover lookup
    mockDb.select
      .mockReturnValueOnce(chainable([fakeTurnover]))
      // Second select: photos for R2 cleanup
      .mockReturnValueOnce(
        chainable([
          { r2KeyOriginal: "org-1/p-1/t-1/photo1.jpg", r2KeyThumbnail: "org-1/p-1/t-1/photo1_thumb.jpg" },
          { r2KeyOriginal: "org-1/p-1/t-1/photo2.jpg", r2KeyThumbnail: null },
        ])
      );

    const deleteChain: Record<string, unknown> = {};
    deleteChain.where = vi.fn().mockResolvedValue(undefined);
    mockDb.delete.mockReturnValue(deleteChain);

    const res = await DELETE(makeReq("DELETE"), { params: makeParams() });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    // 3 R2 deletes: 2 originals + 1 thumbnail (second photo has null thumbnail)
    expect(mockDeleteObject).toHaveBeenCalledTimes(3);
    expect(mockDeleteObject).toHaveBeenCalledWith("org-1/p-1/t-1/photo1.jpg");
    expect(mockDeleteObject).toHaveBeenCalledWith("org-1/p-1/t-1/photo1_thumb.jpg");
    expect(mockDeleteObject).toHaveBeenCalledWith("org-1/p-1/t-1/photo2.jpg");
  });
});
