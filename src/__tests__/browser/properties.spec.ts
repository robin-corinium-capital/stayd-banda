import { test, expect, mockProperties } from "./fixtures";

test.describe("Properties list", () => {
  test("renders properties heading", async ({ ownerPage: page }) => {
    await page.goto("/properties");

    await expect(page.getByRole("heading", { name: "Properties" })).toBeVisible();
  });

  test("shows add property button for owner", async ({ ownerPage: page }) => {
    await page.goto("/properties");

    await expect(page.getByRole("link", { name: /add property/i })).toBeVisible();
  });

  test("displays property cards from API", async ({ ownerPage: page }) => {
    await page.goto("/properties");

    await expect(page.getByText("Beach House")).toBeVisible();
    await expect(page.getByText("Mountain Cabin")).toBeVisible();
  });

  test("property cards link to detail pages", async ({ ownerPage: page }) => {
    await page.goto("/properties");

    const beachHouseLink = page.getByRole("link", { name: /Beach House/i });
    await expect(beachHouseLink).toBeVisible();
    await expect(beachHouseLink).toHaveAttribute("href", /\/properties\/p-1/);
  });

  test("shows empty state when no properties", async ({ ownerPage: page }) => {
    // Override properties to return empty
    await page.route("**/api/properties", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ json: [] });
      }
      return route.continue();
    });

    await page.goto("/properties");

    await expect(page.getByText(/no properties/i)).toBeVisible();
  });
});

test.describe("Property detail", () => {
  test("shows property information", async ({ ownerPage: page }) => {
    // Mock property detail endpoint
    await page.route("**/api/properties/p-1", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          json: {
            ...mockProperties[0],
            notes: "Great beachfront location",
            areas: [
              { id: "a-1", name: "Living Room", description: null, sortOrder: 0 },
              { id: "a-2", name: "Kitchen", description: "Open plan", sortOrder: 1 },
            ],
            turnoverCount: 5,
          },
        });
      }
      return route.continue();
    });

    await page.goto("/properties/p-1");

    await expect(page.getByText("Beach House")).toBeVisible();
    await expect(page.getByText("123 Beach Rd")).toBeVisible();
  });

  test("has back link to properties list", async ({ ownerPage: page }) => {
    await page.route("**/api/properties/p-1", (route) =>
      route.fulfill({
        json: {
          ...mockProperties[0],
          areas: [],
          turnoverCount: 0,
        },
      })
    );

    await page.goto("/properties/p-1");

    await expect(page.getByRole("link", { name: /properties/i }).first()).toBeVisible();
  });
});
