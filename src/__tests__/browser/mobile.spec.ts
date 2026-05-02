import { test, expect } from "./fixtures";

// These tests run against the mobile-chrome project in playwright.config.ts
test.describe("Mobile navigation", () => {
  test("hamburger menu is visible on mobile", async ({ ownerPage: page }) => {
    await page.goto("/dashboard");

    // The hamburger button has aria-label "Open menu"
    await expect(page.getByLabel(/open menu/i)).toBeVisible();
  });

  test("mobile menu opens and shows nav links", async ({ ownerPage: page }) => {
    await page.goto("/dashboard");

    // Open the mobile menu
    await page.getByLabel(/open menu/i).click();

    // Nav links should be visible in mobile menu
    await expect(page.getByRole("link", { name: "Dashboard" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Properties" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Turnovers" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
  });

  test("mobile menu closes after clicking a link", async ({ ownerPage: page }) => {
    await page.goto("/dashboard");

    await page.getByLabel(/open menu/i).click();
    await page.getByRole("link", { name: "Properties" }).first().click();

    // Menu should close — hamburger should show "Open menu" again
    await expect(page.getByLabel(/open menu/i)).toBeVisible();
  });

  test("mobile menu has sign out button", async ({ ownerPage: page }) => {
    await page.goto("/dashboard");

    await page.getByLabel(/open menu/i).click();

    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
  });
});

test.describe("Mobile turnovers list", () => {
  test("renders turnovers on mobile", async ({ ownerPage: page }) => {
    await page.goto("/turnovers");

    await expect(page.getByRole("heading", { name: "Turnovers" })).toBeVisible();
    await expect(page.getByText("Beach House").first()).toBeVisible();
  });
});

test.describe("Mobile login", () => {
  test("login form works on mobile viewport", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Sign in to banda" })).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });
});
