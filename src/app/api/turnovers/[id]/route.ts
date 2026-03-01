import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getApiSession, isAuthError, isOwner } from "@/lib/auth-helpers";
import { deleteObject } from "@/lib/r2";

async function getTurnoverWithAccess(
  turnoverId: string,
  session: { userId: string; orgId: string; role: string }
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
      retentionExtended: schema.turnovers.retentionExtended,
      createdBy: schema.turnovers.createdBy,
      createdAt: schema.turnovers.createdAt,
      completedAt: schema.turnovers.completedAt,
      propertyName: schema.properties.name,
      propertyOrgId: schema.properties.orgId,
    })
    .from(schema.turnovers)
    .innerJoin(
      schema.properties,
      eq(schema.turnovers.propertyId, schema.properties.id)
    )
    .where(eq(schema.turnovers.id, turnoverId))
    .limit(1);

  if (!turnover || turnover.propertyOrgId !== session.orgId) {
    return null;
  }

  // Cleaner must be assigned to the property
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

// GET /api/turnovers/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession();
    if (isAuthError(session)) return session;

    const { id } = await params;
    const turnover = await getTurnoverWithAccess(id, session);

    if (!turnover) {
      return NextResponse.json(
        { error: "Turnover not found" },
        { status: 404 }
      );
    }

    // Fetch areas for the property
    const areas = await db
      .select()
      .from(schema.areas)
      .where(eq(schema.areas.propertyId, turnover.propertyId))
      .orderBy(schema.areas.sortOrder, schema.areas.name);

    // Fetch all photos grouped by set then area
    const photos = await db
      .select()
      .from(schema.photos)
      .where(eq(schema.photos.turnoverId, id))
      .orderBy(schema.photos.uploadTimestamp);

    // Group photos
    const photosBySet: Record<string, typeof photos> = {
      post_checkout: [],
      pre_checkin: [],
    };
    for (const photo of photos) {
      photosBySet[photo.photoSet]?.push(photo);
    }

    return NextResponse.json({
      ...turnover,
      areas,
      photos: photosBySet,
      totalPhotos: photos.length,
    });
  } catch (error) {
    console.error("Get turnover error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

// PATCH /api/turnovers/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession();
    if (isAuthError(session)) return session;

    const { id } = await params;
    const turnover = await getTurnoverWithAccess(id, session);

    if (!turnover) {
      return NextResponse.json(
        { error: "Turnover not found" },
        { status: 404 }
      );
    }

    // Only owner or creator can update
    if (!isOwner(session) && turnover.createdBy !== session.userId) {
      return NextResponse.json(
        { error: "Only the owner or creator can update this turnover" },
        { status: 403 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const updates: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!["open", "in_progress", "complete"].includes(body.status as string)) {
        return NextResponse.json(
          { error: "Invalid status" },
          { status: 400 }
        );
      }
      updates.status = body.status;
      if (body.status === "complete") {
        updates.completedAt = new Date();
      }
    }

    if (body.departing_guest_ref !== undefined) {
      updates.departingGuestRef = (body.departing_guest_ref as string)?.trim() || null;
    }

    if (body.arriving_guest_ref !== undefined) {
      updates.arrivingGuestRef = (body.arriving_guest_ref as string)?.trim() || null;
    }

    if (body.retention_extended !== undefined) {
      updates.retentionExtended = Boolean(body.retention_extended);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(schema.turnovers)
      .set(updates)
      .where(eq(schema.turnovers.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update turnover error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

// DELETE /api/turnovers/[id] — owner only
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession();
    if (isAuthError(session)) return session;

    if (!isOwner(session)) {
      return NextResponse.json(
        { error: "Only owners can delete turnovers" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const turnover = await getTurnoverWithAccess(id, session);

    if (!turnover) {
      return NextResponse.json(
        { error: "Turnover not found" },
        { status: 404 }
      );
    }

    // IMPORTANT: fetch all photo R2 keys BEFORE deleting the turnover record
    // The database CASCADE will delete photo rows, so we lose the R2 keys if we delete first
    const photos = await db
      .select({
        r2KeyOriginal: schema.photos.r2KeyOriginal,
        r2KeyThumbnail: schema.photos.r2KeyThumbnail,
      })
      .from(schema.photos)
      .where(eq(schema.photos.turnoverId, id));

    // Delete R2 objects
    const deletePromises: Promise<void>[] = [];
    for (const photo of photos) {
      deletePromises.push(deleteObject(photo.r2KeyOriginal));
      if (photo.r2KeyThumbnail) {
        deletePromises.push(deleteObject(photo.r2KeyThumbnail));
      }
    }

    await Promise.allSettled(deletePromises);

    // Delete turnover record (cascades to photo rows)
    await db
      .delete(schema.turnovers)
      .where(eq(schema.turnovers.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete turnover error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
