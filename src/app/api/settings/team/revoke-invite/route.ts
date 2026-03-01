import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getApiSession, isAuthError, isOwner } from "@/lib/auth-helpers";

export async function DELETE(request: NextRequest) {
  try {
    const session = await getApiSession();
    if (isAuthError(session)) return session;

    if (!isOwner(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { inviteId } = await request.json();

    if (!inviteId) {
      return NextResponse.json(
        { error: "Invite ID is required" },
        { status: 400 }
      );
    }

    await db
      .delete(schema.invites)
      .where(
        and(
          eq(schema.invites.id, inviteId),
          eq(schema.invites.orgId, session.orgId)
        )
      );

    return NextResponse.json({ message: "Invite revoked" });
  } catch (error) {
    console.error("Revoke invite error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
