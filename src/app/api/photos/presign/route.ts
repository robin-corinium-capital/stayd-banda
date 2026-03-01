import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getApiSession, isAuthError } from "@/lib/auth-helpers";
import { getPresignedUploadUrl } from "@/lib/r2";
import { randomUUID } from "crypto";
import { rateLimit } from "@/lib/rate-limit";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif"];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const limiter = rateLimit({ interval: 15 * 60 * 1000, maxRequests: 100 });

export async function POST(req: NextRequest) {
  try {
    const session = await getApiSession();
    if (isAuthError(session)) return session;

    const { success } = limiter.check(session.userId);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { turnover_id, filename, content_type, file_size } = body as {
      turnover_id?: string;
      filename?: string;
      content_type?: string;
      file_size?: number;
    };

    if (!turnover_id || !filename || !content_type || !file_size) {
      return NextResponse.json(
        { error: "turnover_id, filename, content_type, and file_size are required" },
        { status: 400 }
      );
    }

    // Validate content type
    if (!ALLOWED_TYPES.includes(content_type.toLowerCase())) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, and HEIC images are allowed" },
        { status: 400 }
      );
    }

    // Validate file size
    if (typeof file_size !== "number" || file_size <= 0 || file_size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size must be between 1 byte and 20MB" },
        { status: 400 }
      );
    }

    // Validate turnover exists and user has access
    const [turnover] = await db
      .select({
        id: schema.turnovers.id,
        propertyId: schema.turnovers.propertyId,
        propertyOrgId: schema.properties.orgId,
        status: schema.turnovers.status,
      })
      .from(schema.turnovers)
      .innerJoin(
        schema.properties,
        eq(schema.turnovers.propertyId, schema.properties.id)
      )
      .where(eq(schema.turnovers.id, turnover_id))
      .limit(1);

    if (!turnover || turnover.propertyOrgId !== session.orgId) {
      return NextResponse.json(
        { error: "Turnover not found" },
        { status: 404 }
      );
    }

    // Block uploads to completed turnovers
    if (turnover.status === "complete") {
      return NextResponse.json(
        { error: "This turnover is complete. Create a new turnover to upload photos." },
        { status: 400 }
      );
    }

    // Cleaner must be assigned
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

      if (!assignment) {
        return NextResponse.json(
          { error: "You are not assigned to this property" },
          { status: 403 }
        );
      }
    }

    // Generate R2 key: {org_id}/{property_id}/{turnover_id}/{uuid}.{extension}
    const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
    const r2Key = `${session.orgId}/${turnover.propertyId}/${turnover_id}/${randomUUID()}.${ext}`;

    const presignedUrl = await getPresignedUploadUrl(r2Key, content_type, file_size);

    return NextResponse.json({
      presignedUrl,
      r2Key,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error("Presign error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
