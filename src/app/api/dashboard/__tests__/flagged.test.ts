import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chainable,
  ownerSession,
  assignedCleanerSession,
  createSchemaMock,
} from "@/__tests__/e2e/helpers";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockGetApiSession, mockIsAuthError, mockDb, mockGetPresignedDownloadUrl } =
  vi.hoisted(() => ({
    mockGetApiSession: vi.fn(),
    mockIsAuthError: vi.fn().mockReturnValue(false),
    mockDb: { select: vi.fn() },
    mockGetPresignedDownloadUrl: vi.fn(),
  }));

vi.mock("@/lib/auth-helpers", () => ({
  getApiSession: mockGetApiSession,
  isAuthError: mockIsAuthError,
}));

vi.mock("@/db", () => ({ db: mockDb }));
vi.mock("@/db/schema", () => createSchemaMock());
vi.mock("@/lib/r2", () => ({
  getPresignedDownloadUrl: mockGetPresignedDownloadUrl,
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  inArray: vi.fn(),
  desc: vi.fn(),
}));

// ── Imports ────────────────────────────────────────────────────────────────

import { GET } from "../flagged/route";

// ── Tests ──────────────────────────────────────────────────────────────────

describe("GET /api/dashboard/flagged", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
    mockGetPresignedDownloadUrl.mockResolvedValue("https://r2.example.com/thumb.jpg");
  });

  it("returns 401 when unauthenticated", async () => {
    const unauthResp = new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 });
    mockGetApiSession.mockResolvedValue(unauthResp);
    mockIsAuthError.mockReturnValue(true);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns empty array when no properties", async () => {
    mockDb.select.mockReturnValue(chainable([]));

    const res = await GET();
    const json = await res.json();
    expect(json.flaggedPhotos).toEqual([]);
  });

  it("returns flagged photos for owner", async () => {
    const props = [{ id: "p-1" }];
    const flagged = [
      {
        photoId: "ph-1",
        turnoverId: "t-1",
        r2KeyThumbnail: "thumb.jpg",
        damageNote: "Scratch on wall",
        uploadTimestamp: "2025-03-01",
        propertyName: "Beach House",
        areaName: "Living Room",
        checkoutDate: "2025-03-01",
        checkinDate: "2025-03-02",
      },
    ];

    mockDb.select
      .mockReturnValueOnce(chainable(props))     // properties
      .mockReturnValueOnce(chainable(flagged));   // flagged photos

    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.flaggedPhotos).toHaveLength(1);
    expect(json.flaggedPhotos[0].thumbnailUrl).toBe("https://r2.example.com/thumb.jpg");
  });

  it("returns empty array for cleaner with no assignments", async () => {
    mockGetApiSession.mockResolvedValue(assignedCleanerSession);
    mockDb.select.mockReturnValue(chainable([]));

    const res = await GET();
    const json = await res.json();
    expect(json.flaggedPhotos).toEqual([]);
  });
});
