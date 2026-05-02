import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chainable,
  ownerSession,
  assignedCleanerSession,
  fakePhoto,
  createSchemaMock,
} from "@/__tests__/e2e/helpers";
import { NextRequest } from "next/server";

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
}));

// ── Imports ────────────────────────────────────────────────────────────────

import { GET } from "../[id]/photos/route";

// ── Helpers ────────────────────────────────────────────────────────────────

const ctx = { params: Promise.resolve({ id: "t-1" }) };

function makeReq() {
  return new NextRequest(
    new URL("http://localhost:3000/api/turnovers/t-1/photos"),
    { method: "GET" }
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("GET /api/turnovers/[id]/photos", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
    mockGetPresignedDownloadUrl.mockResolvedValue("https://r2.example.com/thumb.jpg");
  });

  it("returns 404 for turnover in different org", async () => {
    mockDb.select.mockReturnValue(
      chainable([{ id: "t-1", propertyId: "p-1", propertyOrgId: "org-other" }])
    );

    const res = await GET(makeReq(), ctx);
    expect(res.status).toBe(404);
  });

  it("returns 404 when turnover not found", async () => {
    mockDb.select.mockReturnValue(chainable([]));

    const res = await GET(makeReq(), ctx);
    expect(res.status).toBe(404);
  });

  it("returns 404 for unassigned cleaner", async () => {
    mockGetApiSession.mockResolvedValue(assignedCleanerSession);
    mockDb.select
      .mockReturnValueOnce(
        chainable([{ id: "t-1", propertyId: "p-1", propertyOrgId: "org-1" }])
      )
      .mockReturnValueOnce(chainable([])); // no assignment

    const res = await GET(makeReq(), ctx);
    expect(res.status).toBe(404);
  });

  it("returns photos with grouped structure for owner", async () => {
    const turnover = { id: "t-1", propertyId: "p-1", propertyOrgId: "org-1" };
    const photos = [
      {
        ...fakePhoto(),
        r2KeyThumbnail: "thumb1.jpg",
        uploaderName: "Owner",
        photoSet: "post_checkout",
        areaId: "a-1",
      },
    ];

    mockDb.select
      .mockReturnValueOnce(chainable([turnover]))  // turnover lookup
      .mockReturnValueOnce(chainable(photos));       // photos

    const res = await GET(makeReq(), ctx);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.total).toBe(1);
    expect(json.photos).toHaveLength(1);
    expect(json.grouped).toBeDefined();
    expect(json.photos[0].thumbnailUrl).toBe("https://r2.example.com/thumb.jpg");
  });
});
