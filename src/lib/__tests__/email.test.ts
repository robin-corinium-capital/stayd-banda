import { describe, it, expect, vi } from "vitest";

const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn().mockResolvedValue({ id: "email-1" }),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

import {
  sendEmail,
  inviteEmailHtml,
  verificationEmailHtml,
  retentionWarningEmailHtml,
  passwordResetEmailHtml,
} from "../email";

describe("sendEmail", () => {
  it("calls Resend with correct params", async () => {
    await sendEmail({
      to: "user@test.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
    });

    expect(mockSend).toHaveBeenCalledWith({
      from: expect.stringContaining("noreply@stayd-tools.com"),
      to: "user@test.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
    });
  });
});

describe("inviteEmailHtml", () => {
  it("contains the org name, role, and invite URL", () => {
    const html = inviteEmailHtml(
      "https://app.test/invite?token=abc",
      "Beach Corp",
      "cleaner"
    );
    expect(html).toContain("Beach Corp");
    expect(html).toContain("cleaner");
    expect(html).toContain("https://app.test/invite?token=abc");
  });

  it("contains expiry text", () => {
    const html = inviteEmailHtml("https://app.test", "Org", "viewer");
    expect(html).toContain("expire");
  });
});

describe("verificationEmailHtml", () => {
  it("contains the verify URL", () => {
    const html = verificationEmailHtml("https://app.test/verify?token=xyz");
    expect(html).toContain("https://app.test/verify?token=xyz");
  });

  it("contains verify-related text", () => {
    const html = verificationEmailHtml("https://app.test/verify");
    expect(html).toContain("Verify");
  });
});

describe("retentionWarningEmailHtml", () => {
  it("contains property name, dates, and photo count", () => {
    const html = retentionWarningEmailHtml({
      propertyName: "Beach House",
      checkoutDate: "2025-03-01",
      checkinDate: "2025-03-02",
      photoCount: 5,
      downloadUrl: "https://app.test/download",
      extendUrl: "https://app.test/extend",
    });
    expect(html).toContain("Beach House");
    expect(html).toContain("2025-03-01");
    expect(html).toContain("2025-03-02");
    expect(html).toContain("5 photos");
    expect(html).toContain("https://app.test/download");
    expect(html).toContain("https://app.test/extend");
  });

  it("uses singular 'photo' for count of 1", () => {
    const html = retentionWarningEmailHtml({
      propertyName: "X",
      checkoutDate: "2025-01-01",
      checkinDate: "2025-01-02",
      photoCount: 1,
      downloadUrl: "https://d",
      extendUrl: "https://e",
    });
    expect(html).toContain("1 photo");
    expect(html).not.toContain("1 photos");
  });
});

describe("passwordResetEmailHtml", () => {
  it("contains the reset URL", () => {
    const html = passwordResetEmailHtml("https://app.test/reset?token=xyz");
    expect(html).toContain("https://app.test/reset?token=xyz");
  });

  it("contains expiry text", () => {
    const html = passwordResetEmailHtml("https://app.test/reset");
    expect(html).toContain("expire");
  });
});
