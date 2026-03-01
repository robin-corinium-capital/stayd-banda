import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const {
  mockGetApiSession,
  mockIsAuthError,
  mockDb,
  mockGetObject,
  mockPutObject,
  mockSharp,
} = vi.hoisted(() => {
  const sharpInstance = {
    metadata: vi.fn().mockResolvedValue({ format: "jpeg", exif: null }),
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("thumb-data")),
  };
  return {
    mockGetApiSession: vi.fn(),
    mockIsAuthError: vi.fn().mockReturnValue(false),
    mockDb: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    },
    mockGetObject: vi.fn().mockResolvedValue(Buffer.from("fake-image-data")),
    mockPutObject: vi.fn().mockResolvedValue(undefined),
    mockSharp: Object.assign(vi.fn().mockReturnValue(sharpInstance), {
      _instance: sharpInstance,
    }),
  };
});

vi.mock("@/lib/auth-helpers", () => ({
  getApiSession: mockGetApiSession,
  isAuthError: mockIsAuthError,
}));

vi.mock("@/lib/r2", () => ({
  getObject: mockGetObject,
  putObject: mockPutObject,
}));

vi.mock("sharp", () => ({
  default: mockSharp,
}));

// Chainable mock
function chainable(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "select",
    "from",
    "where",
    "innerJoin",
    "orderBy",
    "limit",
    "returning",
    "values",
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
      status: t("status"),
    },
    properties: {
      id: t("id"),
      orgId: t("org_id"),
    },
    propertyAssignments: {
      propertyId: t("property_id"),
      userId: t("user_id"),
    },
    areas: {
      id: t("id"),
      propertyId: t("property_id"),
    },
    photos: {
      turnoverId: t("turnover_id"),
    },
  };
});

// ── Imports ────────────────────────────────────────────────────────────────

import { POST } from "../confirm/route";
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

function makeReq(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/photos/confirm", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const validBody = {
  r2_key: "org-1/p-1/t-1/photo.jpg",
  turnover_id: "t-1",
  photo_set: "post_checkout",
  area_id: "a-1",
  original_filename: "IMG_001.jpg",
  file_size_bytes: 5000,
  mime_type: "image/jpeg",
  is_damage_flagged: false,
  damage_note: null,
};

const fakeTurnover = {
  id: "t-1",
  propertyId: "p-1",
  status: "open",
  propertyOrgId: "org-1",
};

const fakePhoto = {
  id: "ph-1",
  turnoverId: "t-1",
  areaId: "a-1",
  photoSet: "post_checkout",
  r2KeyOriginal: "org-1/p-1/t-1/photo.jpg",
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("POST /api/photos/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
  });

  it("returns 400 when required fields missing", async () => {
    const res = await POST(makeReq({ r2_key: "some-key" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("required");
  });

  it("returns 400 for invalid photo_set", async () => {
    const res = await POST(
      makeReq({ ...validBody, photo_set: "invalid_set" })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("photo_set");
  });

  it("returns 404 when turnover not found", async () => {
    mockDb.select.mockReturnValue(chainable([]));

    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(404);
  });

  it("returns 404 when turnover belongs to different org", async () => {
    mockDb.select.mockReturnValue(
      chainable([{ ...fakeTurnover, propertyOrgId: "other-org" }])
    );

    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(404);
  });

  it("returns 403 when cleaner not assigned to property", async () => {
    mockGetApiSession.mockResolvedValue(cleanerSession);

    mockDb.select
      .mockReturnValueOnce(chainable([fakeTurnover])) // turnover lookup
      .mockReturnValueOnce(chainable([])); // assignment check

    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(403);
  });

  it("returns 400 when area not found for property", async () => {
    mockDb.select
      .mockReturnValueOnce(chainable([fakeTurnover])) // turnover lookup
      .mockReturnValueOnce(chainable([])); // area check

    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Area");
  });

  it("returns 500 when R2 getObject fails", async () => {
    mockDb.select
      .mockReturnValueOnce(chainable([fakeTurnover])) // turnover lookup
      .mockReturnValueOnce(chainable([{ id: "a-1", propertyId: "p-1" }])); // area check

    mockGetObject.mockRejectedValueOnce(new Error("R2 down"));

    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("storage");
  });

  it("creates photo and returns 201 on success", async () => {
    mockDb.select
      .mockReturnValueOnce(chainable([fakeTurnover])) // turnover lookup
      .mockReturnValueOnce(chainable([{ id: "a-1", propertyId: "p-1" }])); // area check

    // Insert photo
    const insertChain: Record<string, unknown> = {};
    insertChain.values = vi.fn().mockReturnValue(insertChain);
    insertChain.returning = vi.fn().mockResolvedValue([fakePhoto]);
    mockDb.insert.mockReturnValue(insertChain);

    // Update turnover status (open → in_progress)
    const updateChain: Record<string, unknown> = {};
    updateChain.set = vi.fn().mockReturnValue(updateChain);
    updateChain.where = vi.fn().mockResolvedValue(undefined);
    mockDb.update.mockReturnValue(updateChain);

    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("ph-1");
  });

  it("auto-updates turnover status from open to in_progress", async () => {
    mockDb.select
      .mockReturnValueOnce(chainable([{ ...fakeTurnover, status: "open" }]))
      .mockReturnValueOnce(chainable([{ id: "a-1", propertyId: "p-1" }]));

    const insertChain: Record<string, unknown> = {};
    insertChain.values = vi.fn().mockReturnValue(insertChain);
    insertChain.returning = vi.fn().mockResolvedValue([fakePhoto]);
    mockDb.insert.mockReturnValue(insertChain);

    const updateChain: Record<string, unknown> = {};
    updateChain.set = vi.fn().mockReturnValue(updateChain);
    updateChain.where = vi.fn().mockResolvedValue(undefined);
    mockDb.update.mockReturnValue(updateChain);

    await POST(makeReq(validBody));

    // Verify update was called to change status
    expect(mockDb.update).toHaveBeenCalled();
    const setCall = (updateChain.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(setCall.status).toBe("in_progress");
  });

  it("does NOT update status when turnover already in_progress", async () => {
    mockDb.select
      .mockReturnValueOnce(chainable([{ ...fakeTurnover, status: "in_progress" }]))
      .mockReturnValueOnce(chainable([{ id: "a-1", propertyId: "p-1" }]));

    const insertChain: Record<string, unknown> = {};
    insertChain.values = vi.fn().mockReturnValue(insertChain);
    insertChain.returning = vi.fn().mockResolvedValue([fakePhoto]);
    mockDb.insert.mockReturnValue(insertChain);

    await POST(makeReq(validBody));

    // Update should NOT be called
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("accepts pre_checkin as valid photo_set", async () => {
    mockDb.select
      .mockReturnValueOnce(chainable([fakeTurnover]))
      .mockReturnValueOnce(chainable([{ id: "a-1", propertyId: "p-1" }]));

    const insertChain: Record<string, unknown> = {};
    insertChain.values = vi.fn().mockReturnValue(insertChain);
    insertChain.returning = vi.fn().mockResolvedValue([{ ...fakePhoto, photoSet: "pre_checkin" }]);
    mockDb.insert.mockReturnValue(insertChain);

    const updateChain: Record<string, unknown> = {};
    updateChain.set = vi.fn().mockReturnValue(updateChain);
    updateChain.where = vi.fn().mockResolvedValue(undefined);
    mockDb.update.mockReturnValue(updateChain);

    const res = await POST(
      makeReq({ ...validBody, photo_set: "pre_checkin" })
    );
    expect(res.status).toBe(201);
  });
});
