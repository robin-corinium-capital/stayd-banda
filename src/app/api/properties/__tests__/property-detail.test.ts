import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chainable,
  updateChain,
  deleteChain,
  ownerSession,
  assignedCleanerSession,
  viewerSession,
  crossOrgSession,
  fakeProperty,
  fakeArea,
  createSchemaMock,
} from "@/__tests__/e2e/helpers";
import { NextRequest } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockGetApiSession, mockIsAuthError, mockDb } = vi.hoisted(() => ({
  mockGetApiSession: vi.fn(),
  mockIsAuthError: vi.fn().mockReturnValue(false),
  mockDb: {
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  getApiSession: mockGetApiSession,
  isAuthError: mockIsAuthError,
  isOwner: (s: { role: string }) => s.role === "owner",
}));

vi.mock("@/db", () => ({ db: mockDb }));
vi.mock("@/db/schema", () => createSchemaMock());
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
}));

// ── Imports ────────────────────────────────────────────────────────────────

import { GET, PATCH, DELETE } from "../[id]/route";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeReq(method: string, body?: Record<string, unknown>) {
  return new NextRequest(new URL("http://localhost:3000/api/properties/p-1"), {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

const ctx = { params: Promise.resolve({ id: "p-1" }) };

// ── GET tests ──────────────────────────────────────────────────────────────

describe("GET /api/properties/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
  });

  it("returns 401 when unauthenticated", async () => {
    const unauthResp = new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 });
    mockGetApiSession.mockResolvedValue(unauthResp);
    mockIsAuthError.mockReturnValue(true);

    const res = await GET(makeReq("GET"), ctx);
    expect(res.status).toBe(401);
  });

  it("returns 404 when property not in org", async () => {
    mockDb.select.mockReturnValue(chainable([]));

    const res = await GET(makeReq("GET"), ctx);
    expect(res.status).toBe(404);
  });

  it("returns property with areas for owner", async () => {
    const prop = fakeProperty();
    const areas = [fakeArea()];
    mockDb.select
      .mockReturnValueOnce(chainable([prop]))   // property lookup
      .mockReturnValueOnce(chainable(areas));     // areas lookup

    const res = await GET(makeReq("GET"), ctx);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.id).toBe("p-1");
    expect(json.areas).toHaveLength(1);
  });

  it("returns 404 for unassigned cleaner", async () => {
    mockGetApiSession.mockResolvedValue(assignedCleanerSession);
    const prop = fakeProperty();
    mockDb.select
      .mockReturnValueOnce(chainable([prop]))  // property exists
      .mockReturnValueOnce(chainable([]));     // no assignment

    const res = await GET(makeReq("GET"), ctx);
    expect(res.status).toBe(404);
  });

  it("returns property for assigned cleaner", async () => {
    mockGetApiSession.mockResolvedValue(assignedCleanerSession);
    const prop = fakeProperty();
    const areas = [fakeArea()];
    mockDb.select
      .mockReturnValueOnce(chainable([prop]))                          // property exists
      .mockReturnValueOnce(chainable([{ id: "pa-1" }]))               // assignment exists
      .mockReturnValueOnce(chainable(areas));                          // areas

    const res = await GET(makeReq("GET"), ctx);
    expect(res.status).toBe(200);
  });
});

// ── PATCH tests ────────────────────────────────────────────────────────────

describe("PATCH /api/properties/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
  });

  it("returns 403 for non-owner", async () => {
    mockGetApiSession.mockResolvedValue(viewerSession);
    const res = await PATCH(makeReq("PATCH", { name: "New" }), ctx);
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-existent property", async () => {
    mockDb.select.mockReturnValue(chainable([]));
    const res = await PATCH(makeReq("PATCH", { name: "New" }), ctx);
    expect(res.status).toBe(404);
  });

  it("returns 400 for empty name", async () => {
    mockDb.select.mockReturnValue(chainable([fakeProperty()]));
    const res = await PATCH(makeReq("PATCH", { name: "" }), ctx);
    expect(res.status).toBe(400);
  });

  it("updates property successfully", async () => {
    const updated = fakeProperty({ name: "Updated Name" });
    mockDb.select.mockReturnValue(chainable([fakeProperty()]));
    mockDb.update.mockReturnValue(updateChain(updated));

    const res = await PATCH(makeReq("PATCH", { name: "Updated Name" }), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.name).toBe("Updated Name");
  });
});

// ── DELETE tests ───────────────────────────────────────────────────────────

describe("DELETE /api/properties/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
  });

  it("returns 403 for non-owner", async () => {
    mockGetApiSession.mockResolvedValue(assignedCleanerSession);
    const res = await DELETE(makeReq("DELETE"), ctx);
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-existent property", async () => {
    mockDb.select.mockReturnValue(chainable([]));
    const res = await DELETE(makeReq("DELETE"), ctx);
    expect(res.status).toBe(404);
  });

  it("deletes property successfully", async () => {
    mockDb.select.mockReturnValue(chainable([fakeProperty()]));
    mockDb.delete.mockReturnValue(deleteChain());

    const res = await DELETE(makeReq("DELETE"), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
