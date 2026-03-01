import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Find invite
    const [invite] = await db
      .select({
        id: schema.invites.id,
        orgId: schema.invites.orgId,
        role: schema.invites.role,
        expiresAt: schema.invites.expiresAt,
        usedAt: schema.invites.usedAt,
      })
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

    // Get org name
    const [org] = await db
      .select({ name: schema.organisations.name })
      .from(schema.organisations)
      .where(eq(schema.organisations.id, invite.orgId))
      .limit(1);

    return NextResponse.json({
      role: invite.role,
      orgName: org?.name || "Unknown organisation",
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    console.error("Invite validate error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
