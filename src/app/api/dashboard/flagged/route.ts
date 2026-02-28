import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { getApiSession, isAuthError } from "@/lib/auth-helpers";
import { getPresignedDownloadUrl } from "@/lib/r2";

// GET /api/dashboard/flagged — recent flagged photos across all properties
export async function GET() {
  const session = await getApiSession();
  if (isAuthError(session)) return session;

  // Get accessible property IDs
  let accessiblePropertyIds: string[];

  if (session.role === "cleaner") {
    const assignments = await db
      .select({ propertyId: schema.propertyAssignments.propertyId })
      .from(schema.propertyAssignments)
      .where(eq(schema.propertyAssignments.userId, session.userId));

    if (assignments.length === 0) {
      return NextResponse.json({ flaggedPhotos: [] });
    }
    accessiblePropertyIds = assignments.map((a) => a.propertyId);
  } else {
    const props = await db
      .select({ id: schema.properties.id })
      .from(schema.properties)
      .where(eq(schema.properties.orgId, session.orgId));
    accessiblePropertyIds = props.map((p) => p.id);
  }

  if (accessiblePropertyIds.length === 0) {
    return NextResponse.json({ flaggedPhotos: [] });
  }

  // Fetch flagged photos with turnover/property/area info
  const flagged = await db
    .select({
      photoId: schema.photos.id,
      turnoverId: schema.photos.turnoverId,
      r2KeyThumbnail: schema.photos.r2KeyThumbnail,
      damageNote: schema.photos.damageNote,
      uploadTimestamp: schema.photos.uploadTimestamp,
      propertyName: schema.properties.name,
      areaName: schema.areas.name,
      checkoutDate: schema.turnovers.checkoutDate,
      checkinDate: schema.turnovers.checkinDate,
    })
    .from(schema.photos)
    .innerJoin(schema.turnovers, eq(schema.photos.turnoverId, schema.turnovers.id))
    .innerJoin(schema.properties, eq(schema.turnovers.propertyId, schema.properties.id))
    .leftJoin(schema.areas, eq(schema.photos.areaId, schema.areas.id))
    .where(
      and(
        eq(schema.photos.isDamageFlagged, true),
        inArray(schema.turnovers.propertyId, accessiblePropertyIds)
      )
    )
    .orderBy(desc(schema.photos.uploadTimestamp))
    .limit(10);

  // Generate thumbnail URLs
  const flaggedPhotos = await Promise.all(
    flagged.map(async (item) => {
      let thumbnailUrl: string | null = null;
      if (item.r2KeyThumbnail) {
        try {
          thumbnailUrl = await getPresignedDownloadUrl(item.r2KeyThumbnail);
        } catch {
          // Non-fatal
        }
      }
      return {
        photoId: item.photoId,
        turnoverId: item.turnoverId,
        thumbnailUrl,
        propertyName: item.propertyName,
        areaName: item.areaName,
        checkoutDate: item.checkoutDate,
        checkinDate: item.checkinDate,
        damageNote: item.damageNote,
        uploadTimestamp: item.uploadTimestamp,
      };
    })
  );

  return NextResponse.json({ flaggedPhotos });
}
