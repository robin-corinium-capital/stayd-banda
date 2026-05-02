import { test as base, type Page } from "@playwright/test";

// ── Mock session data ────────────────────────────────────────────────────────

export const ownerSession = {
  user: {
    id: "user-owner",
    email: "owner@test.com",
    name: "Test Owner",
    role: "owner",
    orgId: "org-1",
    orgName: "Beach Corp",
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

export const cleanerSession = {
  user: {
    id: "user-cleaner",
    email: "cleaner@test.com",
    name: "Test Cleaner",
    role: "cleaner",
    orgId: "org-1",
    orgName: "Beach Corp",
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

// ── Mock API data ────────────────────────────────────────────────────────────

export const mockProperties = [
  {
    id: "p-1",
    name: "Beach House",
    address: "123 Beach Rd",
    propertyType: "house",
    bedrooms: 3,
    active: true,
    orgId: "org-1",
    areaCount: 5,
  },
  {
    id: "p-2",
    name: "Mountain Cabin",
    address: "456 Mountain Ln",
    propertyType: "cabin",
    bedrooms: 2,
    active: true,
    orgId: "org-1",
    areaCount: 3,
  },
];

export const mockTurnovers = {
  turnovers: [
    {
      id: "t-1",
      propertyName: "Beach House",
      propertyId: "p-1",
      checkoutDate: "2025-03-01",
      checkinDate: "2025-03-02",
      status: "open",
      postCheckoutCount: 0,
      preCheckinCount: 0,
      flaggedCount: 0,
    },
    {
      id: "t-2",
      propertyName: "Beach House",
      propertyId: "p-1",
      checkoutDate: "2025-02-20",
      checkinDate: "2025-02-21",
      status: "complete",
      postCheckoutCount: 5,
      preCheckinCount: 3,
      flaggedCount: 1,
    },
  ],
  total: 2,
  page: 1,
  limit: 20,
};

export const mockDashboard = {
  orgName: "Beach Corp",
  propertyCount: 2,
  turnoverCount: 5,
  flaggedCount: 1,
};

export const mockTeam = {
  members: [
    {
      id: "om-1",
      userId: "user-owner",
      name: "Test Owner",
      email: "owner@test.com",
      role: "owner",
      assignments: [],
    },
    {
      id: "om-2",
      userId: "user-cleaner",
      name: "Test Cleaner",
      email: "cleaner@test.com",
      role: "cleaner",
      assignments: [{ propertyId: "p-1", propertyName: "Beach House" }],
    },
  ],
  invites: [
    {
      id: "inv-1",
      role: "cleaner",
      token: "abc123",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

export const mockFlagged = [
  {
    id: "photo-1",
    turnoverId: "t-2",
    propertyName: "Beach House",
    areaName: "Living Room",
    damageNotes: "Scratch on table",
    thumbnailUrl: "https://placehold.co/150",
    uploadedAt: "2025-02-20T12:00:00Z",
  },
];

// ── Route interceptor helpers ────────────────────────────────────────────────

type MockSession = typeof ownerSession | typeof cleanerSession;

/** Intercept the NextAuth session endpoint to return a mock session. */
async function mockAuth(page: Page, session: MockSession) {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: session })
  );
  // Also intercept the CSRF token endpoint
  await page.route("**/api/auth/csrf", (route) =>
    route.fulfill({ json: { csrfToken: "mock-csrf-token" } })
  );
  // Intercept providers endpoint
  await page.route("**/api/auth/providers", (route) =>
    route.fulfill({ json: {} })
  );
}

/** Intercept common API routes with mock data. */
async function mockApi(page: Page) {
  await page.route("**/api/properties", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: mockProperties });
    }
    return route.continue();
  });

  await page.route("**/api/turnovers?*", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: mockTurnovers });
    }
    return route.continue();
  });

  await page.route("**/api/turnovers", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: mockTurnovers });
    }
    return route.continue();
  });

  await page.route("**/api/dashboard/flagged", (route) =>
    route.fulfill({ json: mockFlagged })
  );

  await page.route("**/api/settings/team", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: mockTeam });
    }
    return route.continue();
  });

  await page.route("**/api/retention/notify", (route) =>
    route.fulfill({ json: { sent: 0 } })
  );
}

// ── Custom test fixture ──────────────────────────────────────────────────────

type Fixtures = {
  /** Page pre-configured with owner session and common API mocks. */
  ownerPage: Page;
  /** Page pre-configured with cleaner session and common API mocks. */
  cleanerPage: Page;
  /** Set up auth mock only (no API mocks). */
  loginAs: (session: MockSession) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  ownerPage: async ({ page }, use) => {
    await mockAuth(page, ownerSession);
    await mockApi(page);
    await use(page);
  },
  cleanerPage: async ({ page }, use) => {
    await mockAuth(page, cleanerSession);
    await mockApi(page);
    await use(page);
  },
  loginAs: async ({ page }, use) => {
    await use(async (session: MockSession) => {
      await mockAuth(page, session);
      await mockApi(page);
    });
  },
});

export { expect } from "@playwright/test";
