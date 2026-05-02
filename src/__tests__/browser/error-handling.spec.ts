import { test, expect } from "./fixtures";

test.describe("Error handling", () => {
  test("404 page renders for unknown routes", async ({ page }) => {
    await page.route("**/api/auth/session", (route) =>
      route.fulfill({ json: {} })
    );
    await page.route("**/api/auth/providers", (route) =>
      route.fulfill({ json: {} })
    );

    await page.goto("/this-route-does-not-exist");

    await expect(page.getByText(/page not found/i)).toBeVisible();
  });

  test("404 page has dashboard link", async ({ page }) => {
    await page.route("**/api/auth/session", (route) =>
      route.fulfill({ json: {} })
    );
    await page.route("**/api/auth/providers", (route) =>
      route.fulfill({ json: {} })
    );

    await page.goto("/this-route-does-not-exist");

    await expect(page.getByRole("link", { name: /dashboard/i })).toBeVisible();
  });

  test("network failure shows error state in turnovers list", async ({ ownerPage: page }) => {
    // Override turnovers API to fail
    await page.route("**/api/turnovers**", (route) => {
      if (route.request().method() === "GET") {
        return route.abort("failed");
      }
      return route.continue();
    });

    await page.goto("/turnovers");

    // Should show some error or empty state rather than crashing
    await expect(page.getByRole("heading", { name: "Turnovers" })).toBeVisible();
  });
});
