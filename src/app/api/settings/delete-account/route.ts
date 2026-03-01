import { NextRequest, NextResponse } from "next/server";
import { eq, and, ne } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getApiSession, isAuthError, isOwner } from "@/lib/auth-helpers";
import { deleteObject } from "@/lib/r2";

export async function DELETE(request: NextRequest) {
  try {
    const session = await getApiSession();
    if (isAuthError(session)) return session;

    const { confirmEmail } = await request.json();

    if (!confirmEmail || confirmEmail !== session.email) {
      return NextResponse.json(
        { error: "Please enter your email address to confirm deletion" },
        { status: 400 }
      );
    }

    // If owner, check for other members
    if (isOwner(session)) {
      const otherMembers = await db
        .select()
        .from(schema.orgMembers)
        .where(
          and(
            eq(schema.orgMembers.orgId, session.orgId),
            ne(schema.orgMembers.userId, session.userId)
          )
        );

      if (otherMembers.length > 0) {
        return NextResponse.json(
          {
            error:
              "Remove all team members before deleting your account. Go to Settings > Manage team.",
          },
          { status: 400 }
        );
      }
    }

    // Delete photos from R2
    const photos = await db
      .select({
        r2KeyOriginal: schema.photos.r2KeyOriginal,
        r2KeyThumbnail: schema.photos.r2KeyThumbnail,
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
      .where(eq(schema.properties.orgId, session.orgId));

    for (const photo of photos) {
      try {
        await deleteObject(photo.r2KeyOriginal);
        if (photo.r2KeyThumbnail) {
          await deleteObject(photo.r2KeyThumbnail);
        }
      } catch {
        // Continue deleting even if individual R2 deletion fails
      }
    }

    // If owner with no other members, delete the org (cascades to properties, turnovers, photos in DB)
    if (isOwner(session)) {
      await db
        .delete(schema.organisations)
        .where(eq(schema.organisations.id, session.orgId));
    }

    // Delete user record
    await db
      .delete(schema.users)
      .where(eq(schema.users.id, session.userId));

    return NextResponse.json({ message: "Account deleted" });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
