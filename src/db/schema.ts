import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  doublePrecision,
  bigint,
  date,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Organisations ──────────────────────────────────────────────────────────

export const organisations = pgTable("organisations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const organisationsRelations = relations(organisations, ({ many }) => ({
  members: many(orgMembers),
  properties: many(properties),
  invites: many(invites),
}));

// ── Users ──────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").unique().notNull(),
  name: text("name"),
  passwordHash: text("password_hash"),
  emailVerified: boolean("email_verified").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(orgMembers),
  propertyAssignments: many(propertyAssignments),
}));

// ── Organisation Members ───────────────────────────────────────────────────

export const orgMembers = pgTable(
  "org_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organisations.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    role: text("role", { enum: ["owner", "cleaner", "viewer"] }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("org_members_org_user_unique").on(table.orgId, table.userId),
    index("idx_org_members_user").on(table.userId),
  ]
);

export const orgMembersRelations = relations(orgMembers, ({ one }) => ({
  organisation: one(organisations, {
    fields: [orgMembers.orgId],
    references: [organisations.id],
  }),
  user: one(users, {
    fields: [orgMembers.userId],
    references: [users.id],
  }),
}));

// ── Properties ─────────────────────────────────────────────────────────────

export const properties = pgTable(
  "properties",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organisations.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    address: text("address"),
    propertyType: text("property_type"),
    bedrooms: integer("bedrooms"),
    notes: text("notes"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_properties_org").on(table.orgId)]
);

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  organisation: one(organisations, {
    fields: [properties.orgId],
    references: [organisations.id],
  }),
  areas: many(areas),
  turnovers: many(turnovers),
  assignments: many(propertyAssignments),
}));

// ── Property Assignments ───────────────────────────────────────────────────

export const propertyAssignments = pgTable(
  "property_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .references(() => properties.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("property_assignments_property_user_unique").on(
      table.propertyId,
      table.userId
    ),
    index("idx_property_assignments_user").on(table.userId),
  ]
);

export const propertyAssignmentsRelations = relations(
  propertyAssignments,
  ({ one }) => ({
    property: one(properties, {
      fields: [propertyAssignments.propertyId],
      references: [properties.id],
    }),
    user: one(users, {
      fields: [propertyAssignments.userId],
      references: [users.id],
    }),
  })
);

// ── Areas ──────────────────────────────────────────────────────────────────

export const areas = pgTable("areas", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .references(() => properties.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const areasRelations = relations(areas, ({ one, many }) => ({
  property: one(properties, {
    fields: [areas.propertyId],
    references: [properties.id],
  }),
  photos: many(photos),
}));

// ── Turnovers ──────────────────────────────────────────────────────────────

export const turnovers = pgTable(
  "turnovers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .references(() => properties.id, { onDelete: "cascade" })
      .notNull(),
    checkoutDate: date("checkout_date").notNull(),
    checkinDate: date("checkin_date").notNull(),
    departingGuestRef: text("departing_guest_ref"),
    arrivingGuestRef: text("arriving_guest_ref"),
    status: text("status", {
      enum: ["open", "in_progress", "complete"],
    }).default("open"),
    retentionExtended: boolean("retention_extended").default(false),
    retentionNotifiedAt: timestamp("retention_notified_at", {
      withTimezone: true,
    }),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_turnovers_property").on(table.propertyId),
    index("idx_turnovers_dates").on(table.checkoutDate, table.checkinDate),
  ]
);

export const turnoversRelations = relations(turnovers, ({ one, many }) => ({
  property: one(properties, {
    fields: [turnovers.propertyId],
    references: [properties.id],
  }),
  createdByUser: one(users, {
    fields: [turnovers.createdBy],
    references: [users.id],
  }),
  photos: many(photos),
}));

// ── Photos ─────────────────────────────────────────────────────────────────

export const photos = pgTable(
  "photos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    turnoverId: uuid("turnover_id")
      .references(() => turnovers.id, { onDelete: "cascade" })
      .notNull(),
    areaId: uuid("area_id").references(() => areas.id, {
      onDelete: "set null",
    }),
    photoSet: text("photo_set", {
      enum: ["post_checkout", "pre_checkin"],
    }).notNull(),
    r2KeyOriginal: text("r2_key_original").notNull(),
    r2KeyThumbnail: text("r2_key_thumbnail"),
    originalFilename: text("original_filename"),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
    mimeType: text("mime_type"),
    uploadTimestamp: timestamp("upload_timestamp", {
      withTimezone: true,
    }).defaultNow(),
    captureTimestamp: timestamp("capture_timestamp", { withTimezone: true }),
    gpsLatitude: doublePrecision("gps_latitude"),
    gpsLongitude: doublePrecision("gps_longitude"),
    deviceMake: text("device_make"),
    deviceModel: text("device_model"),
    isDamageFlagged: boolean("is_damage_flagged").default(false),
    damageNote: text("damage_note"),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_photos_turnover").on(table.turnoverId),
    index("idx_photos_area").on(table.areaId),
  ]
);

export const photosRelations = relations(photos, ({ one }) => ({
  turnover: one(turnovers, {
    fields: [photos.turnoverId],
    references: [turnovers.id],
  }),
  area: one(areas, {
    fields: [photos.areaId],
    references: [areas.id],
  }),
  uploader: one(users, {
    fields: [photos.uploadedBy],
    references: [users.id],
  }),
}));

// ── Invites ────────────────────────────────────────────────────────────────

export const invites = pgTable("invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .references(() => organisations.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role", { enum: ["cleaner", "viewer"] }).notNull(),
  propertyIds: text("property_ids"),
  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedBy: uuid("used_by").references(() => users.id),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const invitesRelations = relations(invites, ({ one }) => ({
  organisation: one(organisations, {
    fields: [invites.orgId],
    references: [organisations.id],
  }),
  usedByUser: one(users, {
    fields: [invites.usedBy],
    references: [users.id],
  }),
}));
