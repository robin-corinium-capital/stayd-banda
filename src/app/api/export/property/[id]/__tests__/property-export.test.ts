import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const {
  mockGetApiSession,
  mockIsAuthError,
  mockIsOwner,
  mockSanitiseFilename,
  mockGetObject,
  mockDb,
  mockArchiver,
  MockPassThroughInstance,
} = vi.hoisted(() => {
  const mockPT = {
    on: vi.fn(),
    destroy: vi.fn(),
  };

  const mockArch = {
    on: vi.fn(),
    pipe: vi.fn(),
    append: vi.fn(),
    finalize: vi.fn().mockResolvedValue(undefined),
  };

  return {
    mockGetApiSession: vi.fn(),
    mockIsAuthError: vi.fn().mockReturnValue(false),
    mockIsOwner: vi.fn(),
    mockSanitiseFilename: vi.fn((str: string) =>
      str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    ),
    mockGetObject: vi.fn(),
    mockDb: {
      select: vi.fn(),
    },
    mockArchiver: vi.fn(() => mockArch),
    MockPassThroughInstance: mockPT,
  };
});

vi.mock("@/lib/auth-helpers", () => ({
  getApiSession: mockGetApiSession,
  isAuthError: mockIsAuthError,
  isOwner: mockIsOwner,
}));

vi.mock("@/lib/export-helpers", () => ({
  sanitiseFilename: mockSanitiseFilename,
}));

vi.mock("@/lib/r2", () => ({
  getObject: mockGetObject,
}));

vi.mock("archiver", () => ({
  default: mockArchiver,
}));

vi.mock("stream", () => ({
  PassThrough: function () {
    return MockPassThroughInstance;
  },
}));

// Build a chainable mock for drizzle query builder
function chainable(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "select",
    "from",
    "where",
    "innerJoin",
    "leftJoin",
    "orderBy",
    "limit",
    "groupBy",
    "returning",
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
    properties: {
      id: t("id"),
      orgId: t("org_id"),
      name: t("name"),
    },
    turnovers: {
      id: t("id"),
      propertyId: t("property_id"),
      checkoutDate: t("checkout_date"),
      checkinDate: t("checkin_date"),
    },
    photos: {
      id: t("id"),
      turnoverId: t("turnover_id"),
      photoSet: t("photo_set"),
      r2KeyOriginal: t("r2_key_original"),
      originalFilename: t("original_filename"),
      mimeType: t("mime_type"),
      areaId: t("area_id"),
      uploadTimestamp: t("upload_timestamp"),
    },
    areas: {
      id: t("id"),
      name: t("name"),
    },
  };
});

// ── Imports (after mocks) ──────────────────────────────────────────────────

import { GET } from "../route";
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

const fakeProperty = {
  id: "p-1",
  orgId: "org-1",
  name: "Beach House",
  address: "123 Beach Rd",
  propertyType: "house",
  bedrooms: 3,
  notes: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fakeTurnovers = [
  {
    id: "t-1",
    propertyId: "p-1",
    checkoutDate: "2025-03-01",
    checkinDate: "2025-03-02",
    status: "complete",
    departingGuestRef: "Guest A",
    arrivingGuestRef: "Guest B",
    createdBy: "user-1",
    completedAt: null,
    retentionExtended: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const fakePhotos = [
  {
    id: "ph-1",
    turnoverId: "t-1",
    photoSet: "post_checkout",
    r2KeyOriginal: "orgs/org-1/photos/ph-1.jpg",
    originalFilename: "photo1.jpg",
    mimeType: "image/jpeg",
    areaId: "area-1",
    areaName: "Kitchen",
  },
];

function makeReq(searchParams?: Record<string, string>) {
  const url = new URL("http://localhost:3000/api/export/property/p-1");
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      url.searchParams.set(k, v);
    }
  }
  return new NextRequest(url, { method: "GET" });
}

function makeParams(id = "p-1") {
  return { params: Promise.resolve({ id }) };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("GET /api/export/property/[id] (bulk export)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
    mockIsAuthError.mockReturnValue(false);
    mockIsOwner.mockReturnValue(true);

    // Set up PassThrough mock to emit end immediately
    MockPassThroughInstance.on.mockImplementation((event: string, cb: () => void) => {
      if (event === "end") {
        setTimeout(() => cb(), 0);
      }
      return MockPassThroughInstance;
    });
  });

  it("returns 401 when unauthenticated", async () => {
    const unauthResp = new Response(JSON.stringify({ error: "Unauthorised" }), {
      status: 401,
    });
    mockGetApiSession.mockResolvedValue(unauthResp);
    mockIsAuthError.mockReturnValue(true);

    const res = await GET(
      makeReq({ from: "2025-01-01", to: "2025-12-31" }),
      makeParams()
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not owner", async () => {
    mockGetApiSession.mockResolvedValue(cleanerSession);
    mockIsOwner.mockReturnValue(false);

    const res = await GET(
      makeReq({ from: "2025-01-01", to: "2025-12-31" }),
      makeParams()
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Forbidden");
  });

  it("returns 400 when from/to params missing", async () => {
    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("from and to");
  });

  it("returns 404 when property not in org", async () => {
    // Property query returns empty
    mockDb.select.mockReturnValue(chainable([]));

    const res = await GET(
      makeReq({ from: "2025-01-01", to: "2025-12-31" }),
      makeParams()
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Not found");
  });

  it("returns 400 when no turnovers in date range", async () => {
    // Property found
    mockDb.select
      .mockReturnValueOnce(chainable([fakeProperty]))
      // Turnovers query returns empty
      .mockReturnValueOnce(chainable([]));

    const res = await GET(
      makeReq({ from: "2025-06-01", to: "2025-06-30" }),
      makeParams()
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("No turnovers in date range");
  });

  it("returns 400 when turnovers exist but no photos", async () => {
    mockDb.select
      .mockReturnValueOnce(chainable([fakeProperty]))
      .mockReturnValueOnce(chainable(fakeTurnovers))
      // Photos query returns empty
      .mockReturnValueOnce(chainable([]));

    const res = await GET(
      makeReq({ from: "2025-01-01", to: "2025-12-31" }),
      makeParams()
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("No photos to export");
  });

  it("returns ZIP with correct filename for valid request", async () => {
    mockDb.select
      .mockReturnValueOnce(chainable([fakeProperty]))
      .mockReturnValueOnce(chainable(fakeTurnovers))
      .mockReturnValueOnce(chainable(fakePhotos));

    mockGetObject.mockResolvedValue(Buffer.from("fake-image-data"));

    const res = await GET(
      makeReq({ from: "2025-01-01", to: "2025-12-31" }),
      makeParams()
    );
    expect(res.headers.get("Content-Type")).toBe("application/zip");

    const disposition = res.headers.get("Content-Disposition");
    expect(disposition).toContain("beach-house_2025-01-01_to_2025-12-31.zip");
  });
});
