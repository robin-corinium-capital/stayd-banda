import { NextResponse } from "next/server";
import { eq, and, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getApiSession, isAuthError, isOwner } from "@/lib/auth-helpers";
import { deleteObject } from "@/lib/r2";

export async function POST() {
  try {
    const session = await getApiSession();
    if (isAuthError(session)) return session;

    if (!isOwner(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find expired turnovers: complete, older than 12 months, not retention-extended
    const expiredTurnovers = await db
      .select({
        id: schema.turnovers.id,
      })
      .from(schema.turnovers)
      .innerJoin(
        schema.properties,
        eq(schema.turnovers.propertyId, schema.properties.id)
      )
      .where(
        and(
          eq(schema.properties.orgId, session.orgId),
          eq(schema.turnovers.status, "complete"),
          eq(schema.turnovers.retentionExtended, false),
          lt(
            schema.turnovers.completedAt,
            sql`NOW() - INTERVAL '12 months'`
          )
        )
      );

    if (expiredTurnovers.length === 0) {
      return NextResponse.json({ count: 0, message: "No expired data found" });
    }

    let deletedCount = 0;

    for (const turnover of expiredTurnovers) {
      // Get all photos for this turnover
      const photos = await db
        .select({
          r2KeyOriginal: schema.photos.r2KeyOriginal,
          r2KeyThumbnail: schema.photos.r2KeyThumbnail,
        })
        .from(schema.photos)
        .where(eq(schema.photos.turnoverId, turnover.id));

      // Delete R2 objects
      const deletePromises: Promise<void>[] = [];
      for (const photo of photos) {
        deletePromises.push(deleteObject(photo.r2KeyOriginal));
        if (photo.r2KeyThumbnail) {
          deletePromises.push(deleteObject(photo.r2KeyThumbnail));
        }
      }
      await Promise.allSettled(deletePromises);

      // Delete turnover (cascades to photos)
      await db
        .delete(schema.turnovers)
        .where(eq(schema.turnovers.id, turnover.id));

      deletedCount++;
    }

    return NextResponse.json({
      count: deletedCount,
      message: `Deleted ${deletedCount} expired turnover(s)`,
    });
  } catch (error) {
    console.error("Delete expired error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
