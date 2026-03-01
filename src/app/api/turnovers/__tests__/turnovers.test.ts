import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockGetApiSession, mockIsAuthError, mockDb } = vi.hoisted(() => {
  return {
    mockGetApiSession: vi.fn(),
    mockIsAuthError: vi.fn().mockReturnValue(false),
    mockDb: {
      select: vi.fn(),
      insert: vi.fn(),
    },
  };
});

vi.mock("@/lib/auth-helpers", () => ({
  getApiSession: mockGetApiSession,
  isAuthError: mockIsAuthError,
  isOwner: (s: { role: string }) => s.role === "owner",
}));

// Build a chainable mock for drizzle query builder
function chainable(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "select",
    "from",
    "where",
    "innerJoin",
    "orderBy",
    "limit",
    "groupBy",
    "returning",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // The terminal call resolves
  chain.then = (resolve: (v: unknown) => void) => resolve(resolvedValue);
  // Make it thenable so await works
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
      checkoutDate: t("checkout_date"),
      checkinDate: t("checkin_date"),
      departingGuestRef: t("departing_guest_ref"),
      arrivingGuestRef: t("arriving_guest_ref"),
      status: t("status"),
      createdAt: t("created_at"),
      completedAt: t("completed_at"),
    },
    properties: {
      id: t("id"),
      orgId: t("org_id"),
      name: t("name"),
    },
    propertyAssignments: {
      propertyId: t("property_id"),
      userId: t("user_id"),
    },
    photos: {
      turnoverId: t("turnover_id"),
      photoSet: t("photo_set"),
      isDamageFlagged: t("is_damage_flagged"),
    },
  };
});

// ── Imports (after mocks) ──────────────────────────────────────────────────

import { GET, POST } from "../route";
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

function makeReq(
  method: string,
  body?: Record<string, unknown>,
  searchParams?: Record<string, string>
) {
  const url = new URL("http://localhost:3000/api/turnovers");
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

// ── Tests ──────────────────────────────────────────────────────────────────

describe("POST /api/turnovers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
  });

  it("returns 401 when unauthenticated", async () => {
    const unauthResp = new Response(JSON.stringify({ error: "Unauthorised" }), {
      status: 401,
    });
    mockGetApiSession.mockResolvedValue(unauthResp);
    mockIsAuthError.mockReturnValue(true);

    const res = await POST(makeReq("POST", { property_id: "p1", checkout_date: "2025-03-01", checkin_date: "2025-03-02" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields missing", async () => {
    const res = await POST(makeReq("POST", { property_id: "p1" }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain("required");
  });

  it("returns 400 when checkin_date < checkout_date", async () => {
    const res = await POST(
      makeReq("POST", {
        property_id: "p1",
        checkout_date: "2025-03-05",
        checkin_date: "2025-03-01",
      })
    );
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain("Check-in");
  });

  it("returns 404 when property not found", async () => {
    // db.select().from().where().limit() returns []
    const selectChain = chainable([]);
    mockDb.select.mockReturnValue(selectChain);

    const res = await POST(
      makeReq("POST", {
        property_id: "nonexistent",
        checkout_date: "2025-03-01",
        checkin_date: "2025-03-02",
      })
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when cleaner not assigned to property", async () => {
    mockGetApiSession.mockResolvedValue(cleanerSession);

    // Property exists
    const propertyChain = chainable([{ id: "p1", orgId: "org-1", name: "Beach House" }]);
    // Assignment check returns empty
    const assignmentChain = chainable([]);

    mockDb.select
      .mockReturnValueOnce(propertyChain) // property lookup
      .mockReturnValueOnce(assignmentChain); // assignment check

    const res = await POST(
      makeReq("POST", {
        property_id: "p1",
        checkout_date: "2025-03-01",
        checkin_date: "2025-03-02",
      })
    );
    expect(res.status).toBe(403);
  });

  it("returns 201 on success", async () => {
    const fakeTurnover = {
      id: "t-1",
      propertyId: "p1",
      checkoutDate: "2025-03-01",
      checkinDate: "2025-03-02",
      status: "open",
    };

    // Property exists
    const propertyChain = chainable([{ id: "p1", orgId: "org-1", name: "Beach House" }]);
    mockDb.select.mockReturnValue(propertyChain);

    // Insert returns turnover
    const insertChain: Record<string, unknown> = {};
    insertChain.values = vi.fn().mockReturnValue(insertChain);
    insertChain.returning = vi.fn().mockResolvedValue([fakeTurnover]);
    mockDb.insert.mockReturnValue(insertChain);

    const res = await POST(
      makeReq("POST", {
        property_id: "p1",
        checkout_date: "2025-03-01",
        checkin_date: "2025-03-02",
        departing_guest_ref: "Guest A",
      })
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("t-1");
  });
});

describe("GET /api/turnovers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
  });

  it("returns 401 when unauthenticated", async () => {
    const unauthResp = new Response(JSON.stringify({ error: "Unauthorised" }), {
      status: 401,
    });
    mockGetApiSession.mockResolvedValue(unauthResp);
    mockIsAuthError.mockReturnValue(true);

    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(401);
  });

  it("returns empty array when no properties", async () => {
    // Owner: select properties returns empty
    const propsChain = chainable([]);
    mockDb.select.mockReturnValue(propsChain);

    const res = await GET(makeReq("GET"));
    const json = await res.json();
    expect(json).toEqual({ turnovers: [], totalCount: 0, page: 1, limit: 20, totalPages: 0 });
  });
});
