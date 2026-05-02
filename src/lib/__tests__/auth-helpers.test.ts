import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mockAuth = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

import {
  getSessionOrNull,
  getApiSession,
  isAuthError,
  isOwner,
} from "../auth-helpers";

describe("isOwner", () => {
  it("returns true for owner role", () => {
    expect(isOwner({ userId: "1", orgId: "o", role: "owner", email: "a@b.com" })).toBe(true);
  });

  it("returns false for cleaner role", () => {
    expect(isOwner({ userId: "1", orgId: "o", role: "cleaner", email: "a@b.com" })).toBe(false);
  });

  it("returns false for viewer role", () => {
    expect(isOwner({ userId: "1", orgId: "o", role: "viewer", email: "a@b.com" })).toBe(false);
  });
});

describe("isAuthError", () => {
  it("returns true for NextResponse", () => {
    const resp = NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    expect(isAuthError(resp)).toBe(true);
  });

  it("returns false for session object", () => {
    const session = { userId: "1", orgId: "o", role: "owner", email: "a@b.com" };
    expect(isAuthError(session)).toBe(false);
  });
});

describe("getSessionOrNull", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns null when auth() returns null", async () => {
    mockAuth.mockResolvedValue(null);
    expect(await getSessionOrNull()).toBeNull();
  });

  it("returns null when user is missing", async () => {
    mockAuth.mockResolvedValue({ user: null });
    expect(await getSessionOrNull()).toBeNull();
  });

  it("returns null when user.id is missing", async () => {
    mockAuth.mockResolvedValue({ user: { orgId: "o", role: "owner", email: "a@b.com" } });
    expect(await getSessionOrNull()).toBeNull();
  });

  it("returns null when orgId is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "1", role: "owner", email: "a@b.com" } });
    expect(await getSessionOrNull()).toBeNull();
  });

  it("returns AuthSession for valid session", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        orgId: "org-1",
        role: "owner",
        email: "owner@test.com",
        name: "Test Owner",
      },
    });

    const result = await getSessionOrNull();
    expect(result).toEqual({
      userId: "user-1",
      orgId: "org-1",
      role: "owner",
      email: "owner@test.com",
      name: "Test Owner",
    });
  });
});

describe("getApiSession", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 NextResponse for unauthenticated user", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await getApiSession();
    expect(result).toBeInstanceOf(NextResponse);
    const resp = result as NextResponse;
    expect(resp.status).toBe(401);
  });

  it("returns session for authenticated user", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        orgId: "org-1",
        role: "owner",
        email: "owner@test.com",
        name: "Test Owner",
      },
    });

    const result = await getApiSession();
    expect(result).toEqual({
      userId: "user-1",
      orgId: "org-1",
      role: "owner",
      email: "owner@test.com",
      name: "Test Owner",
    });
  });
});
