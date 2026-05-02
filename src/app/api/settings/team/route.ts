import { NextRequest, NextResponse } from "next/server";
import { eq, and, inArray, isNull, gt } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getApiSession, isAuthError, isOwner } from "@/lib/auth-helpers";

// GET /api/settings/team - list members and pending invites
export async function GET() {
  try {
    const session = await getApiSession();
    if (isAuthError(session)) return session;

    if (!isOwner(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get members with user info
    const members = await db
      .select({
        id: schema.orgMembers.id,
        role: schema.orgMembers.role,
        createdAt: schema.orgMembers.createdAt,
        userId: schema.users.id,
        userName: schema.users.name,
        userEmail: schema.users.email,
      })
      .from(schema.orgMembers)
      .innerJoin(schema.users, eq(schema.orgMembers.userId, schema.users.id))
      .where(eq(schema.orgMembers.orgId, session.orgId));

    // Get property assignments for cleaners
    const cleanerIds = members
      .filter((m) => m.role === "cleaner")
      .map((m) => m.userId);

    let assignments: { userId: string; propertyName: string }[] = [];
    if (cleanerIds.length > 0) {
      assignments = await db
        .select({
          userId: schema.propertyAssignments.userId,
          propertyName: schema.properties.name,
        })
        .from(schema.propertyAssignments)
        .innerJoin(
          schema.properties,
          eq(schema.propertyAssignments.propertyId, schema.properties.id)
        )
        .where(
          and(
            eq(schema.properties.orgId, session.orgId),
            inArray(schema.propertyAssignments.userId, cleanerIds)
          )
        );
    }

    // Get pending invites (unused and not expired)
    const pending = await db
      .select()
      .from(schema.invites)
      .where(
        and(
          eq(schema.invites.orgId, session.orgId),
          isNull(schema.invites.usedAt),
          gt(schema.invites.expiresAt, new Date())
        )
      );

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.userName,
        email: m.userEmail,
        role: m.role,
        createdAt: m.createdAt,
        assignedProperties:
          m.role === "cleaner"
            ? assignments
                .filter((a) => a.userId === m.userId)
                .map((a) => a.propertyName)
            : undefined,
      })),
      invites: pending.map((inv) => ({
        id: inv.id,
        token: inv.token.slice(0, 8) + "...",
        role: inv.role,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
      })),
    });
  } catch (error) {
    console.error("Team list error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/team - remove a member
export async function DELETE(request: NextRequest) {
  try {
    const session = await getApiSession();
    if (isAuthError(session)) return session;

    if (!isOwner(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { memberId } = await request.json();

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 }
      );
    }

    // Prevent removing yourself
    const [member] = await db
      .select()
      .from(schema.orgMembers)
      .where(
        and(
          eq(schema.orgMembers.id, memberId),
          eq(schema.orgMembers.orgId, session.orgId)
        )
      )
      .limit(1);

    if (!member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    if (member.userId === session.userId) {
      return NextResponse.json(
        { error: "You cannot remove yourself" },
        { status: 400 }
      );
    }

    // Delete property assignments
    await db
      .delete(schema.propertyAssignments)
      .where(eq(schema.propertyAssignments.userId, member.userId));

    // Delete org membership
    await db
      .delete(schema.orgMembers)
      .where(eq(schema.orgMembers.id, memberId));

    return NextResponse.json({ message: "Member removed" });
  } catch (error) {
    console.error("Remove member error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
