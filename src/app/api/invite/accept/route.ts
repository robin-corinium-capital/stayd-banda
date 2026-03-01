import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getApiSession, isAuthError } from "@/lib/auth-helpers";

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession();
    if (isAuthError(session)) return session;

    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Find valid invite
    const [invite] = await db
      .select()
      .from(schema.invites)
      .where(eq(schema.invites.token, token))
      .limit(1);

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 }
      );
    }

    if (invite.usedAt) {
      return NextResponse.json(
        { error: "This invite has already been used" },
        { status: 400 }
      );
    }

    if (new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "This invite has expired" },
        { status: 400 }
      );
    }

    // Check if already a member
    const [existing] = await db
      .select()
      .from(schema.orgMembers)
      .where(
        and(
          eq(schema.orgMembers.orgId, invite.orgId),
          eq(schema.orgMembers.userId, session.userId)
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "You're already a member of this organisation" },
        { status: 400 }
      );
    }

    // Add member
    await db.insert(schema.orgMembers).values({
      orgId: invite.orgId,
      userId: session.userId,
      role: invite.role,
    });

    // Create property assignments if specified
    if (invite.propertyIds) {
      const propertyIds = invite.propertyIds.split(",").filter(Boolean);
      for (const propertyId of propertyIds) {
        await db.insert(schema.propertyAssignments).values({
          propertyId: propertyId.trim(),
          userId: session.userId,
        });
      }
    }

    // Mark invite as used
    await db
      .update(schema.invites)
      .set({
        usedBy: session.userId,
        usedAt: new Date(),
      })
      .where(eq(schema.invites.id, invite.id));

    return NextResponse.json({
      message: "You've joined the team.",
      orgId: invite.orgId,
    });
  } catch (error) {
    console.error("Invite accept error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
