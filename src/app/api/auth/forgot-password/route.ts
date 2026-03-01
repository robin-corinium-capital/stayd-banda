import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendEmail, passwordResetEmailHtml } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 15 * 60 * 1000, maxRequests: 3 });

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { success } = limiter.check(ip);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Always return 200 to prevent email enumeration
    const successResponse = NextResponse.json({
      message: "If that email is registered, you'll receive a reset link.",
    });

    // Look up user
    const [user] = await db
      .select({ id: schema.users.id, passwordHash: schema.users.passwordHash })
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase().trim()))
      .limit(1);

    // No user found, or Google-only account (no password)
    if (!user || !user.passwordHash) {
      return successResponse;
    }

    // Generate token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(schema.passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt,
    });

    // Send email
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://banda.stayd-tools.com";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    await sendEmail({
      to: email,
      subject: "Reset your password — banda",
      html: passwordResetEmailHtml(resetUrl),
    });

    return successResponse;
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
