import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getApiSession, isAuthError } from "@/lib/auth-helpers";
import { getPresignedDownloadUrl } from "@/lib/r2";

// GET /api/turnovers/[id]/photos — list photos for turnover
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getApiSession();
  if (isAuthError(session)) return session;

  const { id } = await params;

  // Validate turnover access
  const [turnover] = await db
    .select({
      id: schema.turnovers.id,
      propertyId: schema.turnovers.propertyId,
      propertyOrgId: schema.properties.orgId,
    })
    .from(schema.turnovers)
    .innerJoin(
      schema.properties,
      eq(schema.turnovers.propertyId, schema.properties.id)
    )
    .where(eq(schema.turnovers.id, id))
    .limit(1);

  if (!turnover || turnover.propertyOrgId !== session.orgId) {
    return NextResponse.json(
      { error: "Turnover not found" },
      { status: 404 }
    );
  }

  // Cleaner must be assigned
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

    if (!assignment) {
      return NextResponse.json(
        { error: "Turnover not found" },
        { status: 404 }
      );
    }
  }

  // Fetch photos
  const photos = await db
    .select()
    .from(schema.photos)
    .where(eq(schema.photos.turnoverId, id))
    .orderBy(schema.photos.uploadTimestamp);

  // Generate thumbnail URLs
  const photosWithUrls = await Promise.all(
    photos.map(async (photo) => {
      let thumbnailUrl: string | null = null;
      if (photo.r2KeyThumbnail) {
        try {
          thumbnailUrl = await getPresignedDownloadUrl(photo.r2KeyThumbnail);
        } catch {
          // Failed to generate URL — non-fatal
        }
      }
      return { ...photo, thumbnailUrl };
    })
  );

  // Group by photo_set then area
  const grouped: Record<string, Record<string, typeof photosWithUrls>> = {
    post_checkout: {},
    pre_checkin: {},
  };

  for (const photo of photosWithUrls) {
    const set = photo.photoSet;
    const areaKey = photo.areaId || "general";
    if (!grouped[set][areaKey]) {
      grouped[set][areaKey] = [];
    }
    grouped[set][areaKey].push(photo);
  }

  return NextResponse.json({
    photos: photosWithUrls,
    grouped,
    total: photosWithUrls.length,
  });
}
