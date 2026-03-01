import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/db", () => ({ db: mockDb }));
vi.mock("@/db/schema", () => {
  const t = (name: string) => ({ name });
  return {
    users: { id: t("id"), passwordHash: t("password_hash") },
    passwordResetTokens: {
      id: t("id"),
      token: t("token"),
      usedAt: t("used_at"),
      expiresAt: t("expires_at"),
      userId: t("user_id"),
    },
  };
});

import { POST } from "../reset-password/route";
import { NextRequest } from "next/server";

function makeReq(body: Record<string, unknown>) {
  return new NextRequest(
    new URL("http://localhost:3000/api/auth/reset-password"),
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

function chainable(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "from", "where", "limit", "set"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(resolvedValue);
  (chain as Record<string, unknown>)[Symbol.toStringTag] = "Promise";
  return chain;
}

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 400 when fields missing", async () => {
    const res = await POST(makeReq({ token: "abc" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when password too short", async () => {
    const res = await POST(makeReq({ token: "abc", password: "short" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when token expired or invalid", async () => {
    mockDb.select.mockReturnValue(chainable([]));

    const res = await POST(
      makeReq({ token: "expired", password: "newpass123" })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("expired");
  });

  it("resets password for valid token", async () => {
    const validToken = {
      id: "rt-1",
      userId: "u-1",
      token: "valid-token",
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: null,
    };

    mockDb.select.mockReturnValue(chainable([validToken]));

    const updateChain = chainable(undefined);
    mockDb.update.mockReturnValue(updateChain);

    const res = await POST(
      makeReq({ token: "valid-token", password: "newpass123" })
    );
    expect(res.status).toBe(200);
    expect(mockDb.update).toHaveBeenCalledTimes(2); // user password + mark token used
  });
});
