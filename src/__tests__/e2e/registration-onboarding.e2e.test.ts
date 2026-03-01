import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chainable,
  insertChain,
  makeReq,
  createSchemaMock,
} from "./helpers";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const {
  mockGetApiSession,
  mockIsAuthError,
  mockIsOwner,
  mockDb,
  mockBcryptHash,
} = vi.hoisted(() => {
  return {
    mockGetApiSession: vi.fn(),
    mockIsAuthError: vi.fn().mockReturnValue(false),
    mockIsOwner: vi.fn().mockReturnValue(true),
    mockDb: {
      select: vi.fn(),
      insert: vi.fn(),
    },
    mockBcryptHash: vi
      .fn()
      .mockResolvedValue("$2a$12$hashedpasswordhere"),
  };
});

vi.mock("@/lib/auth-helpers", () => ({
  getApiSession: mockGetApiSession,
  isAuthError: mockIsAuthError,
  isOwner: mockIsOwner,
}));

vi.mock("@/db", () => ({ db: mockDb }));
vi.mock("@/db/schema", () => createSchemaMock());

vi.mock("bcryptjs", () => ({
  default: { hash: mockBcryptHash },
  hash: mockBcryptHash,
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: () => ({ check: () => ({ success: true, remaining: 99 }) }),
}));

// ── Imports (after mocks) ──────────────────────────────────────────────────

import { POST as RegisterPOST } from "@/app/api/auth/register/route";
import { POST as PropertiesPOST } from "@/app/api/properties/route";
import { POST as TurnoversPOST } from "@/app/api/turnovers/route";

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Registration & Onboarding E2E", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthError.mockReturnValue(false);
  });

  describe("Full onboarding flow", () => {
    it("register -> create property -> create turnover", async () => {
      // ── Phase 1: Registration ────────────────────────────────────────

      // Check existing user: none found
      mockDb.select.mockReturnValue(chainable([]));

      // Three sequential inserts: user, org, orgMember
      const fakeUser = {
        id: "new-user",
        email: "new@test.com",
        name: "New User",
      };
      const fakeOrg = {
        id: "new-org",
        name: "New User's Organisation",
      };
      const fakeOrgMember = {
        orgId: "new-org",
        userId: "new-user",
        role: "owner",
      };

      mockDb.insert
        .mockReturnValueOnce(insertChain(fakeUser))
        .mockReturnValueOnce(insertChain(fakeOrg))
        .mockReturnValueOnce(insertChain(fakeOrgMember));

      const registerRes = await RegisterPOST(
        makeReq("http://localhost:3000/api/auth/register", "POST", {
          email: "new@test.com",
          password: "securepassword123",
          name: "New User",
        })
      );
      expect(registerRes.status).toBe(201);
      const registerJson = await registerRes.json();
      expect(registerJson.message).toBe("Account created successfully");

      // Verify bcrypt was called
      expect(mockBcryptHash).toHaveBeenCalledWith(
        "securepassword123",
        12
      );

      // ── Phase 2: Create property as the new owner ──────────────────

      const newOwnerSession = {
        userId: "new-user",
        orgId: "new-org",
        role: "owner",
        email: "new@test.com",
        name: "New User",
      };
      mockGetApiSession.mockResolvedValue(newOwnerSession);
      mockIsOwner.mockReturnValue(true);

      const fakeProperty = {
        id: "p-new",
        orgId: "new-org",
        name: "My First Property",
      };
      mockDb.insert.mockReturnValue(insertChain(fakeProperty));

      const propRes = await PropertiesPOST(
        makeReq("http://localhost:3000/api/properties", "POST", {
          name: "My First Property",
          address: "456 New St",
        })
      );
      expect(propRes.status).toBe(201);
      const propJson = await propRes.json();
      expect(propJson.orgId).toBe("new-org");

      // ── Phase 3: Create turnover ───────────────────────────────────

      mockDb.select.mockReturnValue(
        chainable([
          { id: "p-new", orgId: "new-org", name: "My First Property" },
        ])
      );

      const fakeTurnover = {
        id: "t-new",
        propertyId: "p-new",
        status: "open",
        checkoutDate: "2025-04-01",
        checkinDate: "2025-04-02",
      };
      mockDb.insert.mockReturnValue(insertChain(fakeTurnover));

      const turnoverRes = await TurnoversPOST(
        makeReq("http://localhost:3000/api/turnovers", "POST", {
          property_id: "p-new",
          checkout_date: "2025-04-01",
          checkin_date: "2025-04-02",
        })
      );
      expect(turnoverRes.status).toBe(201);
      const turnoverJson = await turnoverRes.json();
      expect(turnoverJson.propertyId).toBe("p-new");
      expect(turnoverJson.status).toBe("open");
    });
  });

  describe("Registration validation", () => {
    it("rejects duplicate email", async () => {
      // Existing user found
      mockDb.select.mockReturnValue(
        chainable([{ id: "existing-user", email: "taken@test.com" }])
      );

      const res = await RegisterPOST(
        makeReq("http://localhost:3000/api/auth/register", "POST", {
          email: "taken@test.com",
          password: "securepassword123",
          name: "Duplicate",
        })
      );
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("already exists");
    });

    it("rejects weak password (< 8 chars)", async () => {
      const res = await RegisterPOST(
        makeReq("http://localhost:3000/api/auth/register", "POST", {
          email: "new@test.com",
          password: "short",
          name: "New User",
        })
      );
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("8 characters");
    });

    it("rejects invalid email format", async () => {
      const res = await RegisterPOST(
        makeReq("http://localhost:3000/api/auth/register", "POST", {
          email: "not-an-email",
          password: "securepassword123",
          name: "Bad Email",
        })
      );
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("email");
    });

    it("rejects missing email and password", async () => {
      const res = await RegisterPOST(
        makeReq("http://localhost:3000/api/auth/register", "POST", {
          name: "No Credentials",
        })
      );
      expect(res.status).toBe(400);
    });
  });

  describe("Org isolation from registration", () => {
    it("two independently registered users have separate orgs", async () => {
      // Register user A
      mockDb.select.mockReturnValue(chainable([]));
      mockDb.insert
        .mockReturnValueOnce(
          insertChain({ id: "user-a", email: "a@test.com" })
        )
        .mockReturnValueOnce(insertChain({ id: "org-a", name: "A's Org" }))
        .mockReturnValueOnce(
          insertChain({ orgId: "org-a", userId: "user-a", role: "owner" })
        );

      const resA = await RegisterPOST(
        makeReq("http://localhost:3000/api/auth/register", "POST", {
          email: "a@test.com",
          password: "securepass123",
          name: "User A",
        })
      );
      expect(resA.status).toBe(201);

      // Register user B
      mockDb.select.mockReturnValue(chainable([]));
      mockDb.insert
        .mockReturnValueOnce(
          insertChain({ id: "user-b", email: "b@test.com" })
        )
        .mockReturnValueOnce(insertChain({ id: "org-b", name: "B's Org" }))
        .mockReturnValueOnce(
          insertChain({ orgId: "org-b", userId: "user-b", role: "owner" })
        );

      const resB = await RegisterPOST(
        makeReq("http://localhost:3000/api/auth/register", "POST", {
          email: "b@test.com",
          password: "securepass456",
          name: "User B",
        })
      );
      expect(resB.status).toBe(201);

      // Verify user A creates property in org-a
      mockGetApiSession.mockResolvedValue({
        userId: "user-a",
        orgId: "org-a",
        role: "owner",
        email: "a@test.com",
      });
      mockIsOwner.mockReturnValue(true);

      mockDb.insert.mockReturnValue(
        insertChain({ id: "p-a", orgId: "org-a", name: "Villa A" })
      );

      const propA = await PropertiesPOST(
        makeReq("http://localhost:3000/api/properties", "POST", {
          name: "Villa A",
        })
      );
      expect(propA.status).toBe(201);
      const propAJson = await propA.json();
      expect(propAJson.orgId).toBe("org-a");

      // Verify user B creates property in org-b (separate org)
      mockGetApiSession.mockResolvedValue({
        userId: "user-b",
        orgId: "org-b",
        role: "owner",
        email: "b@test.com",
      });

      mockDb.insert.mockReturnValue(
        insertChain({ id: "p-b", orgId: "org-b", name: "Villa B" })
      );

      const propB = await PropertiesPOST(
        makeReq("http://localhost:3000/api/properties", "POST", {
          name: "Villa B",
        })
      );
      expect(propB.status).toBe(201);
      const propBJson = await propB.json();
      expect(propBJson.orgId).toBe("org-b");

      // Orgs are different
      expect(propAJson.orgId).not.toBe(propBJson.orgId);
    });
  });
});
