import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockDb } = vi.hoisted(() => {
  return {
    mockDb: {
      select: vi.fn(),
    },
  };
});

// Build a chainable mock for drizzle query builder
function chainable(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "select",
    "from",
    "where",
    "innerJoin",
    "leftJoin",
    "orderBy",
    "limit",
    "groupBy",
    "returning",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(resolvedValue);
  (chain as Record<string, unknown>)[Symbol.toStringTag] = "Promise";
  return chain;
}

vi.mock("@/db", () => ({
  db: mockDb,
}));

vi.mock("@/db/schema", () => {
  const t = (name: string) => ({ name });
  return {
    turnovers: {
      id: t("id"),
      propertyId: t("property_id"),
      checkoutDate: t("checkout_date"),
      checkinDate: t("checkin_date"),
      departingGuestRef: t("departing_guest_ref"),
      arrivingGuestRef: t("arriving_guest_ref"),
      status: t("status"),
    },
    properties: {
      id: t("id"),
      orgId: t("org_id"),
      name: t("name"),
      address: t("address"),
    },
    propertyAssignments: {
      propertyId: t("property_id"),
      userId: t("user_id"),
    },
    photos: {
      id: t("id"),
      turnoverId: t("turnover_id"),
      areaId: t("area_id"),
      photoSet: t("photo_set"),
      r2KeyOriginal: t("r2_key_original"),
      r2KeyThumbnail: t("r2_key_thumbnail"),
      originalFilename: t("original_filename"),
      mimeType: t("mime_type"),
      uploadTimestamp: t("upload_timestamp"),
      captureTimestamp: t("capture_timestamp"),
      gpsLatitude: t("gps_latitude"),
      gpsLongitude: t("gps_longitude"),
      deviceMake: t("device_make"),
      deviceModel: t("device_model"),
      isDamageFlagged: t("is_damage_flagged"),
      damageNote: t("damage_note"),
      uploadedBy: t("uploaded_by"),
    },
    areas: {
      id: t("id"),
      name: t("name"),
    },
    users: {
      id: t("id"),
      name: t("name"),
    },
  };
});

// ── Imports (after mocks) ──────────────────────────────────────────────────

import {
  sanitiseFilename,
  getTurnoverWithAccess,
  getTurnoverPhotos,
} from "../export-helpers";

// ── Helpers ────────────────────────────────────────────────────────────────

const ownerSession = {
  userId: "user-1",
  orgId: "org-1",
  role: "owner" as const,
  email: "owner@test.com",
  name: "Test Owner",
};

const cleanerSession = {
  userId: "user-2",
  orgId: "org-1",
  role: "cleaner" as const,
  email: "cleaner@test.com",
  name: "Test Cleaner",
};

const fakeTurnover = {
  id: "t-1",
  propertyId: "p-1",
  checkoutDate: "2025-03-01",
  checkinDate: "2025-03-02",
  departingGuestRef: "Guest A",
  arrivingGuestRef: "Guest B",
  status: "open",
  propertyName: "Beach House",
  propertyAddress: "123 Beach Rd",
  propertyOrgId: "org-1",
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("sanitiseFilename", () => {
  it("converts a normal string to a safe filename", () => {
    expect(sanitiseFilename("Beach House 123!")).toBe("beach-house-123");
  });

  it("strips leading and trailing special characters", () => {
    expect(sanitiseFilename("--test--")).toBe("test");
  });

  it("handles unicode and multiple spaces", () => {
    expect(sanitiseFilename("Café   Côte")).toBe("caf-c-te");
  });
});

describe("getTurnoverWithAccess", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns turnover for owner in same org", async () => {
    const selectChain = chainable([fakeTurnover]);
    mockDb.select.mockReturnValue(selectChain);

    const result = await getTurnoverWithAccess("t-1", ownerSession);
    expect(result).toEqual(fakeTurnover);
  });

  it("returns null when turnover not found", async () => {
    const selectChain = chainable([]);
    mockDb.select.mockReturnValue(selectChain);

    const result = await getTurnoverWithAccess("nonexistent", ownerSession);
    expect(result).toBeNull();
  });

  it("returns null when turnover belongs to different org", async () => {
    const wrongOrgTurnover = { ...fakeTurnover, propertyOrgId: "org-other" };
    const selectChain = chainable([wrongOrgTurnover]);
    mockDb.select.mockReturnValue(selectChain);

    const result = await getTurnoverWithAccess("t-1", ownerSession);
    expect(result).toBeNull();
  });

  it("returns null for cleaner without property assignment", async () => {
    const selectChain = chainable([fakeTurnover]);
    const assignmentChain = chainable([]);
    mockDb.select
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(assignmentChain);

    const result = await getTurnoverWithAccess("t-1", cleanerSession);
    expect(result).toBeNull();
  });

  it("returns turnover for cleaner with property assignment", async () => {
    const selectChain = chainable([fakeTurnover]);
    const assignmentChain = chainable([{ id: "a-1", propertyId: "p-1", userId: "user-2" }]);
    mockDb.select
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(assignmentChain);

    const result = await getTurnoverWithAccess("t-1", cleanerSession);
    expect(result).toEqual(fakeTurnover);
  });
});

describe("getTurnoverPhotos", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns all photos for a turnover", async () => {
    const fakePhotos = [
      { id: "ph-1", photoSet: "post_checkout", isDamageFlagged: false },
      { id: "ph-2", photoSet: "pre_checkin", isDamageFlagged: true },
    ];
    const selectChain = chainable(fakePhotos);
    mockDb.select.mockReturnValue(selectChain);

    const result = await getTurnoverPhotos("t-1", false);
    expect(result).toEqual(fakePhotos);
    expect(result).toHaveLength(2);
  });

  it("calls with flaggedOnly filter", async () => {
    const flaggedPhotos = [
      { id: "ph-2", photoSet: "pre_checkin", isDamageFlagged: true },
    ];
    const selectChain = chainable(flaggedPhotos);
    mockDb.select.mockReturnValue(selectChain);

    const result = await getTurnoverPhotos("t-1", true);
    expect(result).toEqual(flaggedPhotos);
    expect(result).toHaveLength(1);
  });
});
