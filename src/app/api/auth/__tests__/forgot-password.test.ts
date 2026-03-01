import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

const mockSendEmail = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock("@/db", () => ({ db: mockDb }));
vi.mock("@/db/schema", () => {
  const t = (name: string) => ({ name });
  return {
    users: { id: t("id"), email: t("email"), passwordHash: t("password_hash") },
    passwordResetTokens: {
      userId: t("user_id"),
      token: t("token"),
      expiresAt: t("expires_at"),
    },
  };
});
vi.mock("@/lib/email", () => ({
  sendEmail: mockSendEmail,
  passwordResetEmailHtml: (url: string) => `<a href="${url}">Reset</a>`,
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: () => ({ check: () => ({ success: true, remaining: 99 }) }),
}));

import { POST } from "../forgot-password/route";
import { NextRequest } from "next/server";

function makeReq(body: Record<string, unknown>) {
  return new NextRequest(
    new URL("http://localhost:3000/api/auth/forgot-password"),
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

function chainable(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "from", "where", "limit"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(resolvedValue);
  (chain as Record<string, unknown>)[Symbol.toStringTag] = "Promise";
  return chain;
}

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 400 when email missing", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("returns 200 when email not found (no enumeration)", async () => {
    mockDb.select.mockReturnValue(chainable([]));

    const res = await POST(makeReq({ email: "nobody@test.com" }));
    expect(res.status).toBe(200);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 200 when Google-only account (no password hash)", async () => {
    mockDb.select.mockReturnValue(
      chainable([{ id: "u1", passwordHash: null }])
    );

    const res = await POST(makeReq({ email: "google@test.com" }));
    expect(res.status).toBe(200);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("sends email and returns 200 for valid user", async () => {
    mockDb.select.mockReturnValue(
      chainable([{ id: "u1", passwordHash: "$2a$12$hash" }])
    );

    const insertChain: Record<string, unknown> = {};
    insertChain.values = vi.fn().mockResolvedValue(undefined);
    mockDb.insert.mockReturnValue(insertChain);

    const res = await POST(makeReq({ email: "user@test.com" }));
    expect(res.status).toBe(200);
    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendEmail.mock.calls[0][0].to).toBe("user@test.com");
  });
});
