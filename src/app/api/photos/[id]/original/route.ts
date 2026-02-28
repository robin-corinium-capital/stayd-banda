import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { getApiSession, isAuthError } from "@/lib/auth-helpers";
import { getPresignedDownloadUrl } from "@/lib/r2";

// GET /api/photos/[id]/original — presigned download URL for original image
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getApiSession();
  if (isAuthError(session)) return session;

  const { id } = await params;

  const [photo] = await db
    .select({
      r2KeyOriginal: schema.photos.r2KeyOriginal,
      propertyOrgId: schema.properties.orgId,
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
    .where(eq(schema.photos.id, id))
    .limit(1);

  if (!photo || photo.propertyOrgId !== session.orgId) {
    return NextResponse.json(
      { error: "Photo not found" },
      { status: 404 }
    );
  }

  const url = await getPresignedDownloadUrl(photo.r2KeyOriginal);

  return NextResponse.json({ url });
}
