import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chainable,
  updateChain,
  createSchemaMock,
} from "@/__tests__/e2e/helpers";
import { NextRequest } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockDb, mockSendEmail } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn(),
    update: vi.fn(),
  },
  mockSendEmail: vi.fn().mockResolvedValue({ id: "email-1" }),
}));

vi.mock("@/db", () => ({ db: mockDb }));
vi.mock("@/db/schema", () => createSchemaMock());
vi.mock("@/lib/email", () => ({
  sendEmail: mockSendEmail,
  retentionWarningEmailHtml: vi.fn().mockReturnValue("<html>warning</html>"),
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  sql: vi.fn(),
  isNull: vi.fn(),
}));

// ── Imports ────────────────────────────────────────────────────────────────

import { POST } from "../notify/route";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeReq(body?: Record<string, unknown>) {
  return new NextRequest(new URL("http://localhost:3000/api/retention/notify"), {
    method: "POST",
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("POST /api/retention/notify", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 400 when orgId is missing", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("returns sent: 0 when no expiring turnovers", async () => {
    mockDb.select.mockReturnValue(chainable([]));
    const res = await POST(makeReq({ orgId: "org-1" }));
    const json = await res.json();
    expect(json.sent).toBe(0);
  });

  it("sends emails and marks notified", async () => {
    const expiring = [
      {
        id: "t-1",
        checkoutDate: "2024-03-01",
        checkinDate: "2024-03-02",
        completedAt: "2024-03-02",
        propertyName: "Beach House",
      },
    ];
    const owner = { email: "owner@test.com" };
    const photoCount = { count: 5 };

    mockDb.select
      .mockReturnValueOnce(chainable(expiring))   // expiring turnovers
      .mockReturnValueOnce(chainable([owner]))     // owner email
      .mockReturnValueOnce(chainable([photoCount])); // photo count

    mockDb.update.mockReturnValue(updateChain());

    const res = await POST(makeReq({ orgId: "org-1" }));
    const json = await res.json();
    expect(json.sent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockDb.update).toHaveBeenCalled();
  });
});
