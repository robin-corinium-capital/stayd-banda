import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const {
  mockGetApiSession,
  mockIsAuthError,
  mockGetTurnoverWithAccess,
  mockGetTurnoverPhotos,
  mockSanitiseFilename,
  mockGetObject,
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
    mockGetTurnoverWithAccess: vi.fn(),
    mockGetTurnoverPhotos: vi.fn(),
    mockSanitiseFilename: vi.fn((str: string) =>
      str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    ),
    mockGetObject: vi.fn(),
    mockArchiver: vi.fn(() => mockArch),
    // Regular function so it works with `new PassThrough()`
    MockPassThroughInstance: mockPT,
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

vi.mock("archiver", () => ({
  default: mockArchiver,
}));

vi.mock("stream", () => ({
  PassThrough: function () {
    return MockPassThroughInstance;
  },
}));

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

const fakeTurnover = {
  id: "t-1",
  propertyId: "p-1",
  checkoutDate: "2025-03-01",
  checkinDate: "2025-03-02",
  propertyName: "Beach House",
  propertyAddress: "123 Beach Rd",
  propertyOrgId: "org-1",
  status: "open",
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
    isDamageFlagged: false,
    damageNote: null,
  },
  {
    id: "ph-2",
    photoSet: "pre_checkin",
    r2KeyOriginal: "orgs/org-1/photos/ph-2.png",
    r2KeyThumbnail: null,
    originalFilename: "photo2.png",
    mimeType: "image/png",
    areaName: "Bedroom",
    isDamageFlagged: true,
    damageNote: "Scratch on wall",
  },
];

function makeReq(searchParams?: Record<string, string>) {
  const url = new URL("http://localhost:3000/api/export/turnover/t-1");
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      url.searchParams.set(k, v);
    }
  }
  return new NextRequest(url, { method: "GET" });
}

function makeParams(id = "t-1") {
  return { params: Promise.resolve({ id }) };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("GET /api/export/turnover/[id] (ZIP export)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
    mockIsAuthError.mockReturnValue(false);

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
    mockGetTurnoverPhotos.mockResolvedValue([]);

    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("No photos to export");
  });

  it("returns ZIP with correct Content-Disposition for all photos", async () => {
    mockGetTurnoverWithAccess.mockResolvedValue(fakeTurnover);
    mockGetTurnoverPhotos.mockResolvedValue(fakePhotos);
    mockGetObject.mockResolvedValue(Buffer.from("fake-image-data"));

    const res = await GET(makeReq(), makeParams());
    expect(res.headers.get("Content-Type")).toBe("application/zip");

    const disposition = res.headers.get("Content-Disposition");
    expect(disposition).toContain("turnover_2025-03-01_to_2025-03-02");
    expect(disposition).toContain("beach-house");
    expect(disposition).toContain(".zip");
    expect(disposition).not.toContain("_flagged");
  });

  it("returns ZIP with _flagged suffix when flagged_only=true", async () => {
    mockGetTurnoverWithAccess.mockResolvedValue(fakeTurnover);
    mockGetTurnoverPhotos.mockResolvedValue([fakePhotos[1]]);
    mockGetObject.mockResolvedValue(Buffer.from("fake-image-data"));

    const res = await GET(makeReq({ flagged_only: "true" }), makeParams());
    const disposition = res.headers.get("Content-Disposition");
    expect(disposition).toContain("_flagged");
  });

  it("does not crash when a photo fails to download from R2", async () => {
    mockGetTurnoverWithAccess.mockResolvedValue(fakeTurnover);
    mockGetTurnoverPhotos.mockResolvedValue(fakePhotos);
    // First photo succeeds, second fails
    mockGetObject
      .mockResolvedValueOnce(Buffer.from("ok"))
      .mockRejectedValueOnce(new Error("R2 error"));

    const res = await GET(makeReq(), makeParams());
    // Should still return a valid zip response (not throw)
    expect(res.headers.get("Content-Type")).toBe("application/zip");
  });
});
