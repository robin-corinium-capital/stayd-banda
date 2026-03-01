import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const {
  mockGetApiSession,
  mockIsAuthError,
  mockGetTurnoverWithAccess,
  mockGetTurnoverPhotos,
  mockSanitiseFilename,
  mockGetObject,
  mockDb,
  mockRenderToBuffer,
} = vi.hoisted(() => {
  return {
    mockGetApiSession: vi.fn(),
    mockIsAuthError: vi.fn().mockReturnValue(false),
    mockGetTurnoverWithAccess: vi.fn(),
    mockGetTurnoverPhotos: vi.fn(),
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
    mockRenderToBuffer: vi.fn(),
  };
});

vi.mock("@/lib/auth-helpers", () => ({
  getApiSession: mockGetApiSession,
  isAuthError: mockIsAuthError,
}));

vi.mock("@/lib/export-helpers", () => ({
  getTurnoverWithAccess: mockGetTurnoverWithAccess,
  getTurnoverPhotos: mockGetTurnoverPhotos,
  sanitiseFilename: mockSanitiseFilename,
}));

vi.mock("@/lib/r2", () => ({
  getObject: mockGetObject,
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
    areas: {
      id: t("id"),
      propertyId: t("property_id"),
      name: t("name"),
      sortOrder: t("sort_order"),
    },
    photos: {
      id: t("id"),
      turnoverId: t("turnover_id"),
      areaId: t("area_id"),
      photoSet: t("photo_set"),
      isDamageFlagged: t("is_damage_flagged"),
    },
  };
});

// Mock @react-pdf/renderer — dynamic import
vi.mock("@react-pdf/renderer", () => ({
  Document: "Document",
  Page: "Page",
  View: "View",
  Text: "Text",
  Image: "Image",
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
  },
  renderToBuffer: mockRenderToBuffer,
}));

// ── Imports (after mocks) ──────────────────────────────────────────────────

import { GET } from "../route";

// ── Helpers ────────────────────────────────────────────────────────────────

const ownerSession = {
  userId: "user-1",
  orgId: "org-1",
  role: "owner",
  email: "owner@test.com",
};

const fakeTurnover = {
  id: "t-1",
  propertyId: "p-1",
  checkoutDate: "2025-03-01",
  checkinDate: "2025-03-02",
  propertyName: "Beach House",
  propertyAddress: "123 Beach Rd",
  propertyOrgId: "org-1",
  status: "open",
  departingGuestRef: "Guest A",
  arrivingGuestRef: "Guest B",
};

const fakePhotos = [
  {
    id: "ph-1",
    photoSet: "post_checkout",
    r2KeyOriginal: "orgs/org-1/photos/ph-1.jpg",
    r2KeyThumbnail: "orgs/org-1/thumbs/ph-1.jpg",
    originalFilename: "photo1.jpg",
    mimeType: "image/jpeg",
    areaName: "Kitchen",
    areaId: "area-1",
    uploaderName: "Test User",
    isDamageFlagged: false,
    damageNote: null,
    captureTimestamp: new Date("2025-03-01T10:00:00Z"),
    uploadTimestamp: new Date("2025-03-01T10:01:00Z"),
    gpsLatitude: 51.5074,
    gpsLongitude: -0.1278,
    deviceMake: "Apple",
    deviceModel: "iPhone 15",
  },
  {
    id: "ph-2",
    photoSet: "pre_checkin",
    r2KeyOriginal: "orgs/org-1/photos/ph-2.png",
    r2KeyThumbnail: null,
    originalFilename: "photo2.png",
    mimeType: "image/png",
    areaName: "Bedroom",
    areaId: "area-2",
    uploaderName: "Test User",
    isDamageFlagged: true,
    damageNote: "Scratch on wall",
    captureTimestamp: new Date("2025-03-01T11:00:00Z"),
    uploadTimestamp: new Date("2025-03-01T11:01:00Z"),
    gpsLatitude: null,
    gpsLongitude: null,
    deviceMake: null,
    deviceModel: null,
  },
];

function makeReq() {
  const url = new URL("http://localhost:3000/api/export/turnover/t-1/report");
  return new Request(url, { method: "GET" });
}

function makeParams(id = "t-1") {
  return { params: Promise.resolve({ id }) };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("GET /api/export/turnover/[id]/report (PDF report)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
    mockIsAuthError.mockReturnValue(false);
  });

  it("returns 401 when unauthenticated", async () => {
    const unauthResp = new Response(JSON.stringify({ error: "Unauthorised" }), {
      status: 401,
    });
    mockGetApiSession.mockResolvedValue(unauthResp);
    mockIsAuthError.mockReturnValue(true);

    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 404 when turnover not found", async () => {
    mockGetTurnoverWithAccess.mockResolvedValue(null);

    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Not found");
  });

  it("returns 400 when no photos to export", async () => {
    mockGetTurnoverWithAccess.mockResolvedValue(fakeTurnover);
    // Areas query
    mockDb.select.mockReturnValue(chainable([]));
    mockGetTurnoverPhotos.mockResolvedValue([]);

    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("No photos to export");
  });

  it("returns PDF with correct Content-Type and filename", async () => {
    mockGetTurnoverWithAccess.mockResolvedValue(fakeTurnover);
    // Areas query
    mockDb.select.mockReturnValue(
      chainable([
        { id: "area-1", name: "Kitchen", propertyId: "p-1", sortOrder: 0 },
        { id: "area-2", name: "Bedroom", propertyId: "p-1", sortOrder: 1 },
      ])
    );
    mockGetTurnoverPhotos.mockResolvedValue(fakePhotos);
    // R2 getObject for thumbnail/original
    mockGetObject.mockResolvedValue(Buffer.from("fake-image-data"));
    // renderToBuffer returns a PDF-like buffer
    mockRenderToBuffer.mockResolvedValue(Buffer.from("%PDF-1.4 fake pdf content"));

    const res = await GET(makeReq(), makeParams());
    expect(res.headers.get("Content-Type")).toBe("application/pdf");

    const disposition = res.headers.get("Content-Disposition");
    expect(disposition).toContain("evidence_report_beach-house_2025-03-01.pdf");
  });

  it("renders PDF with flagged photos when they exist", async () => {
    mockGetTurnoverWithAccess.mockResolvedValue(fakeTurnover);
    mockDb.select.mockReturnValue(
      chainable([
        { id: "area-1", name: "Kitchen", propertyId: "p-1", sortOrder: 0 },
      ])
    );
    // Only flagged photo
    mockGetTurnoverPhotos.mockResolvedValue([fakePhotos[1]]);
    mockGetObject.mockResolvedValue(Buffer.from("fake-image-data"));
    mockRenderToBuffer.mockResolvedValue(Buffer.from("%PDF-1.4 with damage"));

    const res = await GET(makeReq(), makeParams());
    expect(res.headers.get("Content-Type")).toBe("application/pdf");

    // Verify renderToBuffer was called (PDF was generated)
    expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
  });
});
