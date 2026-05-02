import { test, expect, ownerSession } from "./fixtures";

test.describe("Settings page", () => {
  test("renders settings heading", async ({ ownerPage: page }) => {
    await page.goto("/settings");

    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  test("shows profile form with name", async ({ ownerPage: page }) => {
    await page.goto("/settings");

    await expect(page.locator("#name")).toBeVisible();
    await expect(page.getByRole("button", { name: /save name/i })).toBeVisible();
  });

  test("shows change password section", async ({ ownerPage: page }) => {
    await page.goto("/settings");

    await expect(page.locator("#current-password")).toBeVisible();
    await expect(page.locator("#new-password")).toBeVisible();
    await expect(page.locator("#confirm-password")).toBeVisible();
    await expect(page.getByRole("button", { name: /change password/i })).toBeVisible();
  });

  test("password fields have minimum length", async ({ ownerPage: page }) => {
    await page.goto("/settings");

    await expect(page.locator("#new-password")).toHaveAttribute("minLength", "8");
    await expect(page.locator("#confirm-password")).toHaveAttribute("minLength", "8");
  });

  test("shows manage team link for owner", async ({ ownerPage: page }) => {
    await page.goto("/settings");

    await expect(page.getByRole("link", { name: /manage team/i })).toBeVisible();
  });

  test("shows data export button", async ({ ownerPage: page }) => {
    await page.goto("/settings");

    await expect(page.getByRole("button", { name: /export my data/i })).toBeVisible();
  });

  test("shows delete account button", async ({ ownerPage: page }) => {
    await page.goto("/settings");

    await expect(page.getByRole("button", { name: /delete my account/i })).toBeVisible();
  });

  test("delete account shows confirmation modal", async ({ ownerPage: page }) => {
    await page.goto("/settings");

    await page.getByRole("button", { name: /delete my account/i }).click();

    // Modal should appear with email confirmation input
    await expect(page.getByText(/permanently delete/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /cancel/i })).toBeVisible();
  });

  test("shows delete expired data button for owner", async ({ ownerPage: page }) => {
    await page.goto("/settings");

    await expect(page.getByRole("button", { name: /delete expired data/i })).toBeVisible();
  });

  test("name field updates on save", async ({ ownerPage: page }) => {
    // Mock the profile update endpoint
    await page.route("**/api/settings/profile", (route) => {
      if (route.request().method() === "PATCH") {
        return route.fulfill({ json: { message: "Updated" } });
      }
      return route.continue();
    });

    await page.goto("/settings");

    await page.locator("#name").clear();
    await page.locator("#name").fill("New Name");
    await page.getByRole("button", { name: /save name/i }).click();

    // Should show success feedback
    await expect(page.getByText(/updated/i).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Team settings", () => {
  test("renders team heading", async ({ ownerPage: page }) => {
    await page.goto("/settings/team");

    await expect(page.getByRole("heading", { name: "Team" })).toBeVisible();
  });

  test("shows create invite button", async ({ ownerPage: page }) => {
    await page.goto("/settings/team");

    await expect(page.getByRole("link", { name: /create invite/i })).toBeVisible();
  });

  test("displays team members from API", async ({ ownerPage: page }) => {
    await page.goto("/settings/team");

    await expect(page.getByText("Test Owner")).toBeVisible();
    await expect(page.getByText("Test Cleaner")).toBeVisible();
  });

  test("shows role badges", async ({ ownerPage: page }) => {
    await page.goto("/settings/team");

    await expect(page.getByText("owner").first()).toBeVisible();
    await expect(page.getByText("cleaner").first()).toBeVisible();
  });

  test("shows pending invites", async ({ ownerPage: page }) => {
    await page.goto("/settings/team");

    await expect(page.getByText(/pending invites/i)).toBeVisible();
  });

  test("has back link to settings", async ({ ownerPage: page }) => {
    await page.goto("/settings/team");

    await expect(page.getByRole("link", { name: /settings/i }).first()).toBeVisible();
  });
});
