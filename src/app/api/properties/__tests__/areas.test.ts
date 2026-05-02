import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chainable,
  insertChain,
  updateChain,
  deleteChain,
  ownerSession,
  assignedCleanerSession,
  viewerSession,
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
    insert: vi.fn(),
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

import { GET, POST, PATCH, DELETE } from "../[id]/areas/route";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeReq(
  method: string,
  body?: Record<string, unknown>,
  searchParams?: Record<string, string>
) {
  const url = new URL("http://localhost:3000/api/properties/p-1/areas");
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      url.searchParams.set(k, v);
    }
  }
  return new NextRequest(url, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

const ctx = { params: Promise.resolve({ id: "p-1" }) };

// ── GET tests ──────────────────────────────────────────────────────────────

describe("GET /api/properties/[id]/areas", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
  });

  it("returns 404 when property not found", async () => {
    mockDb.select.mockReturnValue(chainable([]));

    const res = await GET(makeReq("GET"), ctx);
    expect(res.status).toBe(404);
  });

  it("returns areas for owner", async () => {
    const areas = [fakeArea(), fakeArea({ id: "a-2", name: "Kitchen" })];
    mockDb.select
      .mockReturnValueOnce(chainable([fakeProperty()]))  // verifyPropertyAccess
      .mockReturnValueOnce(chainable(areas));              // areas list

    const res = await GET(makeReq("GET"), ctx);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toHaveLength(2);
  });

  it("returns 404 for unassigned cleaner", async () => {
    mockGetApiSession.mockResolvedValue(assignedCleanerSession);
    mockDb.select
      .mockReturnValueOnce(chainable([fakeProperty()]))  // property exists
      .mockReturnValueOnce(chainable([]));                // no assignment

    const res = await GET(makeReq("GET"), ctx);
    expect(res.status).toBe(404);
  });
});

// ── POST tests ─────────────────────────────────────────────────────────────

describe("POST /api/properties/[id]/areas", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
  });

  it("returns 403 for non-owner", async () => {
    mockGetApiSession.mockResolvedValue(viewerSession);
    const res = await POST(makeReq("POST", { name: "Bedroom" }), ctx);
    expect(res.status).toBe(403);
  });

  it("returns 404 when property not found", async () => {
    mockDb.select.mockReturnValue(chainable([]));
    const res = await POST(makeReq("POST", { name: "Bedroom" }), ctx);
    expect(res.status).toBe(404);
  });

  it("returns 400 when name is missing", async () => {
    mockDb.select.mockReturnValue(chainable([fakeProperty()]));
    const res = await POST(makeReq("POST", {}), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 201 on success", async () => {
    const area = fakeArea({ name: "Bedroom" });
    mockDb.select.mockReturnValue(chainable([fakeProperty()]));
    mockDb.insert.mockReturnValue(insertChain(area));

    const res = await POST(makeReq("POST", { name: "Bedroom" }), ctx);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.name).toBe("Bedroom");
  });
});

// ── PATCH tests ────────────────────────────────────────────────────────────

describe("PATCH /api/properties/[id]/areas", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
  });

  it("returns 403 for non-owner", async () => {
    mockGetApiSession.mockResolvedValue(assignedCleanerSession);
    const res = await PATCH(makeReq("PATCH", { areaId: "a-1", name: "New" }), ctx);
    expect(res.status).toBe(403);
  });

  it("returns 400 when areaId is missing", async () => {
    mockDb.select.mockReturnValue(chainable([fakeProperty()]));
    const res = await PATCH(makeReq("PATCH", { name: "New" }), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 404 when area not found for property", async () => {
    mockDb.select
      .mockReturnValueOnce(chainable([fakeProperty()]))  // property exists
      .mockReturnValueOnce(chainable([]));                // area not found

    const res = await PATCH(makeReq("PATCH", { areaId: "a-1", name: "New" }), ctx);
    expect(res.status).toBe(404);
  });

  it("returns 400 for empty name", async () => {
    mockDb.select
      .mockReturnValueOnce(chainable([fakeProperty()]))
      .mockReturnValueOnce(chainable([fakeArea()]));

    const res = await PATCH(makeReq("PATCH", { areaId: "a-1", name: "" }), ctx);
    expect(res.status).toBe(400);
  });

  it("updates area successfully", async () => {
    const updated = fakeArea({ name: "Updated Room" });
    mockDb.select
      .mockReturnValueOnce(chainable([fakeProperty()]))
      .mockReturnValueOnce(chainable([fakeArea()]));
    mockDb.update.mockReturnValue(updateChain(updated));

    const res = await PATCH(makeReq("PATCH", { areaId: "a-1", name: "Updated Room" }), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.name).toBe("Updated Room");
  });
});

// ── DELETE tests ───────────────────────────────────────────────────────────

describe("DELETE /api/properties/[id]/areas", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
  });

  it("returns 403 for non-owner", async () => {
    mockGetApiSession.mockResolvedValue(viewerSession);
    const res = await DELETE(makeReq("DELETE", undefined, { areaId: "a-1" }), ctx);
    expect(res.status).toBe(403);
  });

  it("returns 400 when areaId param missing", async () => {
    mockDb.select.mockReturnValue(chainable([fakeProperty()]));
    const res = await DELETE(makeReq("DELETE"), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 404 when area not found", async () => {
    mockDb.select
      .mockReturnValueOnce(chainable([fakeProperty()]))
      .mockReturnValueOnce(chainable([]));

    const res = await DELETE(makeReq("DELETE", undefined, { areaId: "a-1" }), ctx);
    expect(res.status).toBe(404);
  });

  it("deletes area successfully", async () => {
    mockDb.select
      .mockReturnValueOnce(chainable([fakeProperty()]))
      .mockReturnValueOnce(chainable([fakeArea()]));
    mockDb.delete.mockReturnValue(deleteChain());

    const res = await DELETE(makeReq("DELETE", undefined, { areaId: "a-1" }), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
