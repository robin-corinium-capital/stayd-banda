import { test, expect, mockTurnovers } from "./fixtures";

test.describe("Turnovers list", () => {
  test("renders turnovers heading and subtitle", async ({ ownerPage: page }) => {
    await page.goto("/turnovers");

    await expect(page.getByRole("heading", { name: "Turnovers" })).toBeVisible();
    await expect(
      page.getByText("Manage turnover inspections and photo documentation.")
    ).toBeVisible();
  });

  test("shows new turnover button", async ({ ownerPage: page }) => {
    await page.goto("/turnovers");

    await expect(page.getByRole("link", { name: /new turnover/i })).toBeVisible();
  });

  test("renders turnovers from API", async ({ ownerPage: page }) => {
    await page.goto("/turnovers");

    // Wait for the turnovers to load (client-side fetch)
    await expect(page.getByText("Beach House").first()).toBeVisible();
  });

  test("shows status badges", async ({ ownerPage: page }) => {
    await page.goto("/turnovers");

    await expect(page.getByText("open").first()).toBeVisible();
    await expect(page.getByText("complete").first()).toBeVisible();
  });

  test("shows empty state when no turnovers", async ({ ownerPage: page }) => {
    await page.route("**/api/turnovers**", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          json: { turnovers: [], total: 0, page: 1, limit: 20 },
        });
      }
      return route.continue();
    });

    await page.goto("/turnovers");

    await expect(page.getByText(/no turnovers found/i)).toBeVisible();
  });

  test("property filter dropdown is present", async ({ ownerPage: page }) => {
    await page.goto("/turnovers");

    // The property filter select should be visible
    await expect(page.locator("select").first()).toBeVisible();
  });

  test("status filter buttons are clickable", async ({ ownerPage: page }) => {
    await page.goto("/turnovers");

    // Wait for list to load first
    await expect(page.getByText("Beach House").first()).toBeVisible();

    // Status filter buttons
    const openButton = page.getByRole("button", { name: /^Open$/i });
    if (await openButton.isVisible()) {
      await openButton.click();
      // URL should update with status param
      await expect(page).toHaveURL(/status=open/);
    }
  });

  test("shows pagination when enough results", async ({ ownerPage: page }) => {
    // Mock many turnovers to trigger pagination
    const manyTurnovers = Array.from({ length: 20 }, (_, i) => ({
      ...mockTurnovers.turnovers[0],
      id: `t-${i}`,
    }));

    await page.route("**/api/turnovers**", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          json: { turnovers: manyTurnovers, total: 40, page: 1, limit: 20 },
        });
      }
      return route.continue();
    });

    await page.goto("/turnovers");

    await expect(page.getByText(/showing/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /next/i })).toBeVisible();
  });
});

test.describe("Turnover detail", () => {
  test("shows turnover information", async ({ ownerPage: page }) => {
    await page.route("**/api/turnovers/t-1", (route) =>
      route.fulfill({
        json: {
          id: "t-1",
          propertyId: "p-1",
          propertyName: "Beach House",
          checkoutDate: "2025-03-01",
          checkinDate: "2025-03-02",
          status: "open",
          guestRefDeparting: "REF001",
          completedAt: null,
          postCheckoutCount: 0,
          preCheckinCount: 0,
          flaggedCount: 0,
          areas: [],
          photos: [],
        },
      })
    );

    await page.goto("/turnovers/t-1");

    await expect(page.getByText("Beach House")).toBeVisible();
    await expect(page.getByText("open")).toBeVisible();
  });

  test("has back link to turnovers list", async ({ ownerPage: page }) => {
    await page.route("**/api/turnovers/t-1", (route) =>
      route.fulfill({
        json: {
          id: "t-1",
          propertyId: "p-1",
          propertyName: "Beach House",
          checkoutDate: "2025-03-01",
          checkinDate: "2025-03-02",
          status: "open",
          completedAt: null,
          postCheckoutCount: 0,
          preCheckinCount: 0,
          flaggedCount: 0,
          areas: [],
          photos: [],
        },
      })
    );

    await page.goto("/turnovers/t-1");

    await expect(page.getByRole("link", { name: /turnovers/i }).first()).toBeVisible();
  });

  test("shows upload photos button", async ({ ownerPage: page }) => {
    await page.route("**/api/turnovers/t-1", (route) =>
      route.fulfill({
        json: {
          id: "t-1",
          propertyId: "p-1",
          propertyName: "Beach House",
          checkoutDate: "2025-03-01",
          checkinDate: "2025-03-02",
          status: "open",
          completedAt: null,
          postCheckoutCount: 0,
          preCheckinCount: 0,
          flaggedCount: 0,
          areas: [],
          photos: [],
        },
      })
    );

    await page.goto("/turnovers/t-1");

    await expect(page.getByRole("link", { name: /upload photos/i })).toBeVisible();
  });
});
