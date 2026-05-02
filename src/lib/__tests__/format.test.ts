import { describe, it, expect } from "vitest";
import { formatDate, STATUS_COLOUR, STATUS_LABEL } from "../format";

describe("formatDate", () => {
  it("formats a date string with year by default", () => {
    const result = formatDate("2025-03-01");
    expect(result).toBe("1 Mar 2025");
  });

  it("formats a date string without year when includeYear is false", () => {
    const result = formatDate("2025-12-25", { includeYear: false });
    expect(result).toBe("25 Dec");
  });

  it("formats a date string with year when includeYear is true", () => {
    const result = formatDate("2025-06-15", { includeYear: true });
    expect(result).toBe("15 Jun 2025");
  });

  it("handles single-digit days", () => {
    const result = formatDate("2025-01-05");
    expect(result).toBe("5 Jan 2025");
  });
});

describe("STATUS_COLOUR", () => {
  it("maps open to flag colours", () => {
    expect(STATUS_COLOUR.open).toContain("status-flag");
  });

  it("maps in_progress to brand colours", () => {
    expect(STATUS_COLOUR.in_progress).toContain("brand");
  });

  it("maps complete to pass colours", () => {
    expect(STATUS_COLOUR.complete).toContain("status-pass");
  });

  it("returns undefined for unknown status", () => {
    expect(STATUS_COLOUR.unknown).toBeUndefined();
  });
});

describe("STATUS_LABEL", () => {
  it("maps open to Open", () => {
    expect(STATUS_LABEL.open).toBe("Open");
  });

  it("maps in_progress to In progress", () => {
    expect(STATUS_LABEL.in_progress).toBe("In progress");
  });

  it("maps complete to Complete", () => {
    expect(STATUS_LABEL.complete).toBe("Complete");
  });

  it("returns undefined for unknown status", () => {
    expect(STATUS_LABEL.unknown).toBeUndefined();
  });
});
