import { test, expect } from "./fixtures";

test.describe("Upload page", () => {
  test("upload page loads for cleaner", async ({ cleanerPage: page }) => {
    // Mock the upload page data
    await page.route("**/api/properties/p-1", (route) =>
      route.fulfill({
        json: {
          id: "p-1",
          name: "Beach House",
          areas: [
            { id: "a-1", name: "Living Room" },
            { id: "a-2", name: "Kitchen" },
          ],
        },
      })
    );
    await page.route("**/api/turnovers/t-1", (route) =>
      route.fulfill({
        json: {
          id: "t-1",
          propertyId: "p-1",
          propertyName: "Beach House",
          status: "open",
          checkoutDate: "2025-03-01",
          checkinDate: "2025-03-02",
          completedAt: null,
        },
      })
    );

    await page.goto("/upload/p-1/t-1");

    await expect(page.getByText("Beach House")).toBeVisible();
  });

  test("completed turnover blocks upload", async ({ cleanerPage: page }) => {
    await page.route("**/api/properties/p-1", (route) =>
      route.fulfill({
        json: {
          id: "p-1",
          name: "Beach House",
          areas: [],
        },
      })
    );
    await page.route("**/api/turnovers/t-1", (route) =>
      route.fulfill({
        json: {
          id: "t-1",
          propertyId: "p-1",
          propertyName: "Beach House",
          status: "complete",
          checkoutDate: "2025-03-01",
          checkinDate: "2025-03-02",
          completedAt: "2025-03-02T10:00:00Z",
        },
      })
    );

    await page.goto("/upload/p-1/t-1");

    // Should indicate the turnover is complete and uploads are blocked
    await expect(page.getByText(/complete/i).first()).toBeVisible();
  });

  test("upload link appears in nav for cleaners", async ({ cleanerPage: page }) => {
    await page.goto("/dashboard");

    // Cleaner should see Upload link in nav
    await expect(page.getByRole("link", { name: "Upload" })).toBeVisible();
  });

  test("upload link not in nav for owners", async ({ ownerPage: page }) => {
    await page.goto("/dashboard");

    // Owner should not see Upload link in nav
    await expect(page.getByRole("link", { name: "Upload" })).not.toBeVisible();
  });
});
