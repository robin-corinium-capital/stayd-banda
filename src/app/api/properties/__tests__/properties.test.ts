import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chainable,
  insertChain,
  ownerSession,
  assignedCleanerSession,
  viewerSession,
  fakeProperty,
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
  inArray: vi.fn(),
}));

// ── Imports ────────────────────────────────────────────────────────────────

import { GET, POST } from "../route";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeReq(
  method: string,
  body?: Record<string, unknown>
) {
  const url = new URL("http://localhost:3000/api/properties");
  return new NextRequest(url, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("GET /api/properties", () => {
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

  it("returns all properties for owner", async () => {
    const props = [fakeProperty(), fakeProperty({ id: "p-2", name: "Lake House" })];
    mockDb.select.mockReturnValue(chainable(props));

    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toHaveLength(2);
  });

  it("returns all properties for viewer", async () => {
    mockGetApiSession.mockResolvedValue(viewerSession);
    const props = [fakeProperty()];
    mockDb.select.mockReturnValue(chainable(props));

    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toHaveLength(1);
  });

  it("returns only assigned properties for cleaner", async () => {
    mockGetApiSession.mockResolvedValue(assignedCleanerSession);

    // First call: assignments
    const assignmentChain = chainable([{ propertyId: "p-1" }]);
    // Second call: properties
    const propsChain = chainable([fakeProperty()]);
    mockDb.select
      .mockReturnValueOnce(assignmentChain)
      .mockReturnValueOnce(propsChain);

    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toHaveLength(1);
  });

  it("returns empty array for cleaner with no assignments", async () => {
    mockGetApiSession.mockResolvedValue(assignedCleanerSession);
    mockDb.select.mockReturnValue(chainable([]));

    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual([]);
  });
});

describe("POST /api/properties", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
  });

  it("returns 401 when unauthenticated", async () => {
    const unauthResp = new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 });
    mockGetApiSession.mockResolvedValue(unauthResp);
    mockIsAuthError.mockReturnValue(true);

    const res = await POST(makeReq("POST", { name: "Test" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when cleaner tries to create", async () => {
    mockGetApiSession.mockResolvedValue(assignedCleanerSession);

    const res = await POST(makeReq("POST", { name: "Test" }));
    expect(res.status).toBe(403);
  });

  it("returns 403 when viewer tries to create", async () => {
    mockGetApiSession.mockResolvedValue(viewerSession);

    const res = await POST(makeReq("POST", { name: "Test" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(makeReq("POST", {}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("name");
  });

  it("returns 400 when name is empty string", async () => {
    const res = await POST(makeReq("POST", { name: "   " }));
    expect(res.status).toBe(400);
  });

  it("returns 201 on success", async () => {
    const created = fakeProperty({ name: "Beach House" });
    mockDb.insert.mockReturnValue(insertChain(created));

    const res = await POST(makeReq("POST", { name: "Beach House", address: "123 Beach Rd" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.name).toBe("Beach House");
  });
});
