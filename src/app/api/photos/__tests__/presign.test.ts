import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockGetApiSession, mockIsAuthError, mockDb, mockGetPresignedUploadUrl, mockRandomUUID } =
  vi.hoisted(() => {
    return {
      mockGetApiSession: vi.fn(),
      mockIsAuthError: vi.fn().mockReturnValue(false),
      mockDb: {
        select: vi.fn(),
      },
      mockGetPresignedUploadUrl: vi.fn().mockResolvedValue("https://r2.example.com/presigned"),
      mockRandomUUID: vi.fn().mockReturnValue("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
    };
  });

vi.mock("@/lib/auth-helpers", () => ({
  getApiSession: mockGetApiSession,
  isAuthError: mockIsAuthError,
}));

vi.mock("@/lib/r2", () => ({
  getPresignedUploadUrl: mockGetPresignedUploadUrl,
}));

vi.mock("crypto", () => ({
  randomUUID: mockRandomUUID,
}));

// Chainable mock
function chainable(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "from", "where", "innerJoin", "orderBy", "limit"];
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
    },
    properties: {
      id: t("id"),
      orgId: t("org_id"),
    },
    propertyAssignments: {
      propertyId: t("property_id"),
      userId: t("user_id"),
    },
  };
});

// ── Imports ────────────────────────────────────────────────────────────────

import { POST } from "../presign/route";
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
  return new NextRequest("http://localhost:3000/api/photos/presign", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("POST /api/photos/presign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
  });

  it("returns 400 when required fields missing", async () => {
    const res = await POST(makeReq({ turnover_id: "t-1" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("required");
  });

  it("returns 400 for invalid content type", async () => {
    const res = await POST(
      makeReq({
        turnover_id: "t-1",
        filename: "doc.pdf",
        content_type: "application/pdf",
        file_size: 1000,
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("JPEG");
  });

  it("returns 400 when file too large (>20MB)", async () => {
    const res = await POST(
      makeReq({
        turnover_id: "t-1",
        filename: "big.jpg",
        content_type: "image/jpeg",
        file_size: 25 * 1024 * 1024,
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("20MB");
  });

  it("returns 404 when turnover not found", async () => {
    mockDb.select.mockReturnValue(chainable([]));

    const res = await POST(
      makeReq({
        turnover_id: "nonexistent",
        filename: "photo.jpg",
        content_type: "image/jpeg",
        file_size: 5000,
      })
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when turnover belongs to different org", async () => {
    mockDb.select.mockReturnValue(
      chainable([{ id: "t-1", propertyId: "p-1", propertyOrgId: "other-org" }])
    );

    const res = await POST(
      makeReq({
        turnover_id: "t-1",
        filename: "photo.jpg",
        content_type: "image/jpeg",
        file_size: 5000,
      })
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when cleaner not assigned to property", async () => {
    mockGetApiSession.mockResolvedValue(cleanerSession);

    // Turnover exists in same org
    mockDb.select
      .mockReturnValueOnce(
        chainable([{ id: "t-1", propertyId: "p-1", propertyOrgId: "org-1" }])
      )
      // Assignment check returns empty
      .mockReturnValueOnce(chainable([]));

    const res = await POST(
      makeReq({
        turnover_id: "t-1",
        filename: "photo.jpg",
        content_type: "image/jpeg",
        file_size: 5000,
      })
    );
    expect(res.status).toBe(403);
  });

  it("returns presigned URL on success", async () => {
    mockDb.select.mockReturnValue(
      chainable([{ id: "t-1", propertyId: "p-1", propertyOrgId: "org-1" }])
    );

    const res = await POST(
      makeReq({
        turnover_id: "t-1",
        filename: "photo.jpg",
        content_type: "image/jpeg",
        file_size: 5000,
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.presignedUrl).toBe("https://r2.example.com/presigned");
    expect(json.r2Key).toContain("org-1/p-1/t-1/");
    expect(json.r2Key).toContain(".jpg");
    expect(json.expiresAt).toBeDefined();
  });

  it("accepts HEIC content type", async () => {
    mockDb.select.mockReturnValue(
      chainable([{ id: "t-1", propertyId: "p-1", propertyOrgId: "org-1" }])
    );

    const res = await POST(
      makeReq({
        turnover_id: "t-1",
        filename: "photo.heic",
        content_type: "image/heic",
        file_size: 5000,
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.r2Key).toContain(".heic");
  });
});
