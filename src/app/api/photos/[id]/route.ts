import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { getApiSession, isAuthError, isOwner } from "@/lib/auth-helpers";
import { deleteObject } from "@/lib/r2";

async function getPhotoWithAccess(
  photoId: string,
  session: { userId: string; orgId: string; role: string }
) {
  const [photo] = await db
    .select({
      id: schema.photos.id,
      turnoverId: schema.photos.turnoverId,
      areaId: schema.photos.areaId,
      photoSet: schema.photos.photoSet,
      r2KeyOriginal: schema.photos.r2KeyOriginal,
      r2KeyThumbnail: schema.photos.r2KeyThumbnail,
      originalFilename: schema.photos.originalFilename,
      fileSizeBytes: schema.photos.fileSizeBytes,
      mimeType: schema.photos.mimeType,
      uploadTimestamp: schema.photos.uploadTimestamp,
      captureTimestamp: schema.photos.captureTimestamp,
      gpsLatitude: schema.photos.gpsLatitude,
      gpsLongitude: schema.photos.gpsLongitude,
      deviceMake: schema.photos.deviceMake,
      deviceModel: schema.photos.deviceModel,
      isDamageFlagged: schema.photos.isDamageFlagged,
      damageNote: schema.photos.damageNote,
      uploadedBy: schema.photos.uploadedBy,
      propertyOrgId: schema.properties.orgId,
    })
    .from(schema.photos)
    .innerJoin(
      schema.turnovers,
      eq(schema.photos.turnoverId, schema.turnovers.id)
    )
    .innerJoin(
      schema.properties,
      eq(schema.turnovers.propertyId, schema.properties.id)
    )
    .where(eq(schema.photos.id, photoId))
    .limit(1);

  if (!photo || photo.propertyOrgId !== session.orgId) {
    return null;
  }

  return photo;
}

// PATCH /api/photos/[id] — update damage flag, note, area
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession();
    if (isAuthError(session)) return session;

    const { id } = await params;
    const photo = await getPhotoWithAccess(id, session);

    if (!photo) {
      return NextResponse.json(
        { error: "Photo not found" },
        { status: 404 }
      );
    }

    // Owner or uploader can update
    if (!isOwner(session) && photo.uploadedBy !== session.userId) {
      return NextResponse.json(
        { error: "Only the owner or uploader can update this photo" },
        { status: 403 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};

    if (body.is_damage_flagged !== undefined) {
      updates.isDamageFlagged = Boolean(body.is_damage_flagged);
    }

    if (body.damage_note !== undefined) {
      updates.damageNote = (body.damage_note as string)?.trim() || null;
    }

    if (body.area_id !== undefined) {
      updates.areaId = body.area_id || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(schema.photos)
      .set(updates)
      .where(eq(schema.photos.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update photo error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

// DELETE /api/photos/[id] — owner only
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession();
    if (isAuthError(session)) return session;

    if (!isOwner(session)) {
      return NextResponse.json(
        { error: "Only owners can delete photos" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const photo = await getPhotoWithAccess(id, session);

    if (!photo) {
      return NextResponse.json(
        { error: "Photo not found" },
        { status: 404 }
      );
    }

    // Delete R2 objects
    const deletePromises: Promise<void>[] = [
      deleteObject(photo.r2KeyOriginal),
    ];
    if (photo.r2KeyThumbnail) {
      deletePromises.push(deleteObject(photo.r2KeyThumbnail));
    }
    await Promise.allSettled(deletePromises);

    // Delete database record
    await db.delete(schema.photos).where(eq(schema.photos.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete photo error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
