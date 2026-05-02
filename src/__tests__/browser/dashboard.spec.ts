import { test, expect } from "./fixtures";

test.describe("Dashboard", () => {
  test("renders dashboard heading", async ({ ownerPage: page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("shows stat cards with links", async ({ ownerPage: page }) => {
    await page.goto("/dashboard");

    await expect(page.getByText("Properties")).toBeVisible();
    await expect(page.getByText("Turnovers")).toBeVisible();
    await expect(page.getByText("Flagged Items")).toBeVisible();
  });

  test("stat cards link to correct pages", async ({ ownerPage: page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("link", { name: /properties/i }).first()).toHaveAttribute(
      "href",
      /\/properties/
    );
    await expect(page.getByRole("link", { name: /turnovers/i }).first()).toHaveAttribute(
      "href",
      /\/turnovers/
    );
  });

  test("shows flagged items section", async ({ ownerPage: page }) => {
    await page.goto("/dashboard");

    // Flagged items section should render from the API mock
    await expect(page.getByText(/flagged/i).first()).toBeVisible();
  });

  test("shows navigation links when authenticated", async ({ ownerPage: page }) => {
    await page.goto("/dashboard");

    // Desktop nav links
    await expect(page.getByRole("link", { name: "Dashboard" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Properties" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Turnovers" }).first()).toBeVisible();
  });
});
