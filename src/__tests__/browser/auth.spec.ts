import { test, expect, ownerSession } from "./fixtures";

test.describe("Login page", () => {
  test("renders login form", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Sign in to banda" })).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("shows forgot password and register links", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/forgot-password");
    await expect(page.getByRole("link", { name: "Register" })).toHaveAttribute("href", "/register");
  });

  test("requires email and password fields", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator("#email")).toHaveAttribute("required", "");
    await expect(page.locator("#password")).toHaveAttribute("required", "");
  });

  test("shows error on invalid credentials", async ({ page }) => {
    // Mock sign-in to return error
    await page.route("**/api/auth/callback/credentials", (route) =>
      route.fulfill({ status: 200, json: { url: "", error: "CredentialsSignin" } })
    );
    await page.route("**/api/auth/session", (route) =>
      route.fulfill({ json: {} })
    );
    await page.route("**/api/auth/csrf", (route) =>
      route.fulfill({ json: { csrfToken: "mock-csrf" } })
    );
    await page.route("**/api/auth/providers", (route) =>
      route.fulfill({ json: {} })
    );

    await page.goto("/login");
    await page.locator("#email").fill("wrong@test.com");
    await page.locator("#password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Invalid email or password")).toBeVisible();
  });

  test("redirects to dashboard after successful login", async ({ page }) => {
    // Mock successful sign-in
    await page.route("**/api/auth/callback/credentials", (route) =>
      route.fulfill({ status: 200, json: { url: "/dashboard" } })
    );
    await page.route("**/api/auth/session", (route) =>
      route.fulfill({ json: ownerSession })
    );
    await page.route("**/api/auth/csrf", (route) =>
      route.fulfill({ json: { csrfToken: "mock-csrf" } })
    );
    await page.route("**/api/auth/providers", (route) =>
      route.fulfill({ json: {} })
    );

    await page.goto("/login");
    await page.locator("#email").fill("owner@test.com");
    await page.locator("#password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL("**/dashboard");
  });
});

test.describe("Register page", () => {
  test("renders registration form", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await expect(page.locator("#name")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#terms")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  });

  test("submit button is disabled until terms are accepted", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByRole("button", { name: "Create account" })).toBeDisabled();

    await page.locator("#terms").check();

    await expect(page.getByRole("button", { name: "Create account" })).toBeEnabled();
  });

  test("has minimum password length", async ({ page }) => {
    await page.goto("/register");

    await expect(page.locator("#password")).toHaveAttribute("minLength", "8");
    await expect(page.getByText("Minimum 8 characters")).toBeVisible();
  });

  test("has links to terms and privacy", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByRole("link", { name: "Terms of Use" })).toHaveAttribute("href", "/terms");
    await expect(page.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
  });

  test("has sign in link", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });
});

test.describe("Auth redirects", () => {
  test("unauthenticated user is redirected to login from protected page", async ({ page }) => {
    // No session mock — unauthenticated
    await page.route("**/api/auth/session", (route) =>
      route.fulfill({ json: {} })
    );

    await page.goto("/dashboard");

    // Middleware should redirect to login
    await page.waitForURL("**/login**");
  });

  test("public pages are accessible without auth", async ({ page }) => {
    await page.route("**/api/auth/session", (route) =>
      route.fulfill({ json: {} })
    );
    await page.route("**/api/auth/providers", (route) =>
      route.fulfill({ json: {} })
    );

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
