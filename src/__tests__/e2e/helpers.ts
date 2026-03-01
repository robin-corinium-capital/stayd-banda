import { vi } from "vitest";
import { NextRequest } from "next/server";

// ── Chainable drizzle query builder mock ──────────────────────────────────

export function chainable(resolvedValue: unknown) {
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
    "values",
    "set",
    "offset",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(resolvedValue);
  (chain as Record<string, unknown>)[Symbol.toStringTag] = "Promise";
  return chain;
}

// ── DB mutation chain helpers ─────────────────────────────────────────────

export function insertChain(returnValue: unknown) {
  const chain: Record<string, unknown> = {};
  chain.values = vi.fn().mockReturnValue(chain);
  chain.returning = vi.fn().mockResolvedValue(
    Array.isArray(returnValue) ? returnValue : [returnValue]
  );
  return chain;
}

export function updateChain(returnValue?: unknown) {
  const chain: Record<string, unknown> = {};
  chain.set = vi.fn().mockReturnValue(chain);
  if (returnValue !== undefined) {
    chain.where = vi.fn().mockReturnValue(chain);
    chain.returning = vi.fn().mockResolvedValue(
      Array.isArray(returnValue) ? returnValue : [returnValue]
    );
  } else {
    chain.where = vi.fn().mockResolvedValue(undefined);
  }
  return chain;
}

export function deleteChain() {
  const chain: Record<string, unknown> = {};
  chain.where = vi.fn().mockResolvedValue(undefined);
  return chain;
}

// ── Session presets ───────────────────────────────────────────────────────

export const ownerSession = {
  userId: "user-owner",
  orgId: "org-1",
  role: "owner",
  email: "owner@test.com",
  name: "Test Owner",
};

export const assignedCleanerSession = {
  userId: "user-cleaner-assigned",
  orgId: "org-1",
  role: "cleaner",
  email: "assigned-cleaner@test.com",
  name: "Assigned Cleaner",
};

export const unassignedCleanerSession = {
  userId: "user-cleaner-unassigned",
  orgId: "org-1",
  role: "cleaner",
  email: "unassigned-cleaner@test.com",
  name: "Unassigned Cleaner",
};

export const viewerSession = {
  userId: "user-viewer",
  orgId: "org-1",
  role: "viewer",
  email: "viewer@test.com",
  name: "Test Viewer",
};

export const crossOrgSession = {
  userId: "user-cross",
  orgId: "org-other",
  role: "owner",
  email: "cross@other.com",
  name: "Cross Org Owner",
};

// ── Request builder ───────────────────────────────────────────────────────

export function makeReq(
  url: string,
  method: string,
  body?: Record<string, unknown>,
  searchParams?: Record<string, string>
) {
  const u = new URL(url);
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      u.searchParams.set(k, v);
    }
  }
  return new NextRequest(u, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

// ── Fake data factories ───────────────────────────────────────────────────

export function fakeProperty(overrides?: Record<string, unknown>) {
  return {
    id: "p-1",
    orgId: "org-1",
    name: "Beach House",
    address: "123 Beach Rd",
    propertyType: "house",
    bedrooms: 3,
    notes: null,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function fakeTurnover(overrides?: Record<string, unknown>) {
  return {
    id: "t-1",
    propertyId: "p-1",
    checkoutDate: "2025-03-01",
    checkinDate: "2025-03-02",
    departingGuestRef: null,
    arrivingGuestRef: null,
    status: "open",
    retentionExtended: false,
    createdBy: "user-owner",
    createdAt: new Date().toISOString(),
    completedAt: null,
    propertyName: "Beach House",
    propertyOrgId: "org-1",
    ...overrides,
  };
}

export function fakePhoto(overrides?: Record<string, unknown>) {
  return {
    id: "ph-1",
    turnoverId: "t-1",
    areaId: "a-1",
    photoSet: "post_checkout",
    r2KeyOriginal: "org-1/p-1/t-1/photo1.jpg",
    r2KeyThumbnail: "org-1/p-1/t-1/photo1_thumb.jpg",
    originalFilename: "IMG_001.jpg",
    fileSizeBytes: 5000,
    mimeType: "image/jpeg",
    uploadTimestamp: new Date().toISOString(),
    captureTimestamp: null,
    gpsLatitude: null,
    gpsLongitude: null,
    deviceMake: null,
    deviceModel: null,
    isDamageFlagged: false,
    damageNote: null,
    uploadedBy: "user-owner",
    ...overrides,
  };
}

// ── Schema mock factory ───────────────────────────────────────────────────

export function createSchemaMock() {
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
      retentionExtended: t("retention_extended"),
      createdBy: t("created_by"),
      createdAt: t("created_at"),
      completedAt: t("completed_at"),
    },
    properties: {
      id: t("id"),
      orgId: t("org_id"),
      name: t("name"),
      address: t("address"),
      propertyType: t("property_type"),
      bedrooms: t("bedrooms"),
      notes: t("notes"),
      isActive: t("is_active"),
      createdAt: t("created_at"),
      updatedAt: t("updated_at"),
    },
    propertyAssignments: {
      id: t("id"),
      propertyId: t("property_id"),
      userId: t("user_id"),
      createdAt: t("created_at"),
    },
    areas: {
      id: t("id"),
      propertyId: t("property_id"),
      name: t("name"),
      description: t("description"),
      sortOrder: t("sort_order"),
      createdAt: t("created_at"),
    },
    photos: {
      id: t("id"),
      turnoverId: t("turnover_id"),
      areaId: t("area_id"),
      photoSet: t("photo_set"),
      r2KeyOriginal: t("r2_key_original"),
      r2KeyThumbnail: t("r2_key_thumbnail"),
      originalFilename: t("original_filename"),
      fileSizeBytes: t("file_size_bytes"),
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
      createdAt: t("created_at"),
    },
    users: {
      id: t("id"),
      email: t("email"),
      name: t("name"),
      passwordHash: t("password_hash"),
      emailVerified: t("email_verified"),
      createdAt: t("created_at"),
    },
    organisations: {
      id: t("id"),
      name: t("name"),
      createdAt: t("created_at"),
      updatedAt: t("updated_at"),
    },
    orgMembers: {
      id: t("id"),
      orgId: t("org_id"),
      userId: t("user_id"),
      role: t("role"),
      createdAt: t("created_at"),
    },
    invites: {
      id: t("id"),
      orgId: t("org_id"),
      role: t("role"),
      token: t("token"),
      expiresAt: t("expires_at"),
      usedBy: t("used_by"),
      usedAt: t("used_at"),
      createdBy: t("created_by"),
      createdAt: t("created_at"),
    },
  };
}
