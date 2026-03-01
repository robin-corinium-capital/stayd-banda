import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getApiSession, isAuthError } from "@/lib/auth-helpers";

export async function PATCH(request: NextRequest) {
  try {
    const session = await getApiSession();
    if (isAuthError(session)) return session;

    const body = await request.json();
    const { name, currentPassword, newPassword } = body;

    // Update name
    if (name !== undefined) {
      await db
        .update(schema.users)
        .set({ name })
        .where(eq(schema.users.id, session.userId));
    }

    // Change password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required" },
          { status: 400 }
        );
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "New password must be at least 8 characters" },
          { status: 400 }
        );
      }

      // Verify current password
      const [user] = await db
        .select({ passwordHash: schema.users.passwordHash })
        .from(schema.users)
        .where(eq(schema.users.id, session.userId))
        .limit(1);

      if (!user?.passwordHash) {
        return NextResponse.json(
          { error: "Password change not available for social login accounts" },
          { status: 400 }
        );
      }

      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }

      const hash = await bcrypt.hash(newPassword, 12);
      await db
        .update(schema.users)
        .set({ passwordHash: hash })
        .where(eq(schema.users.id, session.userId));
    }

    return NextResponse.json({ message: "Profile updated" });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
