import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chainable,
  ownerSession,
  createSchemaMock,
} from "@/__tests__/e2e/helpers";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockGetApiSession, mockIsAuthError, mockDb } = vi.hoisted(() => ({
  mockGetApiSession: vi.fn(),
  mockIsAuthError: vi.fn().mockReturnValue(false),
  mockDb: { select: vi.fn() },
}));

vi.mock("@/lib/auth-helpers", () => ({
  getApiSession: mockGetApiSession,
  isAuthError: mockIsAuthError,
}));

vi.mock("@/db", () => ({ db: mockDb }));
vi.mock("@/db/schema", () => createSchemaMock());
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));

// ── Imports ────────────────────────────────────────────────────────────────

import { GET } from "../export-data/route";

// ── Tests ──────────────────────────────────────────────────────────────────

describe("GET /api/settings/export-data", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
  });

  it("returns 401 when unauthenticated", async () => {
    const unauthResp = new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 });
    mockGetApiSession.mockResolvedValue(unauthResp);
    mockIsAuthError.mockReturnValue(true);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns JSON export with Content-Disposition header", async () => {
    const user = { email: "owner@test.com", name: "Owner", createdAt: "2025-01-01" };
    const org = { name: "Beach Corp" };
    const properties = [{ name: "Beach House", address: "123 Beach Rd" }];
    const turnovers: unknown[] = [];
    const photos: unknown[] = [];

    mockDb.select
      .mockReturnValueOnce(chainable([user]))
      .mockReturnValueOnce(chainable([org]))
      .mockReturnValueOnce(chainable(properties))
      .mockReturnValueOnce(chainable(turnovers))
      .mockReturnValueOnce(chainable(photos));

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("banda-data-export.json");
    expect(res.headers.get("Content-Type")).toContain("application/json");

    const json = JSON.parse(await res.text());
    expect(json.user.email).toBe("owner@test.com");
    expect(json.organisation).toBe("Beach Corp");
    expect(json.properties).toHaveLength(1);
  });
});
