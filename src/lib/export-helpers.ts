import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { AuthSession } from "@/lib/auth-helpers";

/**
 * Fetch a turnover and verify the user has access.
 * Returns the turnover with property details, or null if not found / no access.
 */
export async function getTurnoverWithAccess(
  turnoverId: string,
  session: AuthSession
) {
  const [turnover] = await db
    .select({
      id: schema.turnovers.id,
      propertyId: schema.turnovers.propertyId,
      checkoutDate: schema.turnovers.checkoutDate,
      checkinDate: schema.turnovers.checkinDate,
      departingGuestRef: schema.turnovers.departingGuestRef,
      arrivingGuestRef: schema.turnovers.arrivingGuestRef,
      status: schema.turnovers.status,
      propertyName: schema.properties.name,
      propertyAddress: schema.properties.address,
      propertyOrgId: schema.properties.orgId,
    })
    .from(schema.turnovers)
    .innerJoin(
      schema.properties,
      eq(schema.turnovers.propertyId, schema.properties.id)
    )
    .where(eq(schema.turnovers.id, turnoverId))
    .limit(1);

  if (!turnover || turnover.propertyOrgId !== session.orgId) return null;

  // Cleaner access check
  if (session.role === "cleaner") {
    const [assignment] = await db
      .select()
      .from(schema.propertyAssignments)
      .where(
        and(
          eq(schema.propertyAssignments.propertyId, turnover.propertyId),
          eq(schema.propertyAssignments.userId, session.userId)
        )
      )
      .limit(1);
    if (!assignment) return null;
  }

  return turnover;
}

/**
 * Fetch photos for a turnover, optionally filtered to flagged only.
 * Includes uploader name and area name.
 */
export async function getTurnoverPhotos(
  turnoverId: string,
  flaggedOnly: boolean
) {
  const conditions = [eq(schema.photos.turnoverId, turnoverId)];
  if (flaggedOnly) {
    conditions.push(eq(schema.photos.isDamageFlagged, true));
  }

  return db
    .select({
      id: schema.photos.id,
      photoSet: schema.photos.photoSet,
      r2KeyOriginal: schema.photos.r2KeyOriginal,
      r2KeyThumbnail: schema.photos.r2KeyThumbnail,
      originalFilename: schema.photos.originalFilename,
      mimeType: schema.photos.mimeType,
      uploadTimestamp: schema.photos.uploadTimestamp,
      captureTimestamp: schema.photos.captureTimestamp,
      gpsLatitude: schema.photos.gpsLatitude,
      gpsLongitude: schema.photos.gpsLongitude,
      deviceMake: schema.photos.deviceMake,
      deviceModel: schema.photos.deviceModel,
      isDamageFlagged: schema.photos.isDamageFlagged,
      damageNote: schema.photos.damageNote,
      areaId: schema.photos.areaId,
      areaName: schema.areas.name,
      uploaderName: schema.users.name,
    })
    .from(schema.photos)
    .leftJoin(schema.areas, eq(schema.photos.areaId, schema.areas.id))
    .leftJoin(schema.users, eq(schema.photos.uploadedBy, schema.users.id))
    .where(and(...conditions))
    .orderBy(schema.photos.uploadTimestamp);
}

/** Sanitise a string for use in filenames. */
export function sanitiseFilename(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
