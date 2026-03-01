import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getApiSession, isAuthError } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const session = await getApiSession();
    if (isAuthError(session)) return session;

    // Get user profile
    const [user] = await db
      .select({
        email: schema.users.email,
        name: schema.users.name,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, session.userId))
      .limit(1);

    // Get org info
    const [org] = await db
      .select({ name: schema.organisations.name })
      .from(schema.organisations)
      .where(eq(schema.organisations.id, session.orgId))
      .limit(1);

    // Get properties
    const properties = await db
      .select({
        name: schema.properties.name,
        address: schema.properties.address,
        propertyType: schema.properties.propertyType,
        bedrooms: schema.properties.bedrooms,
        createdAt: schema.properties.createdAt,
      })
      .from(schema.properties)
      .where(eq(schema.properties.orgId, session.orgId));

    // Get turnovers
    const turnovers = await db
      .select({
        checkoutDate: schema.turnovers.checkoutDate,
        checkinDate: schema.turnovers.checkinDate,
        departingGuestRef: schema.turnovers.departingGuestRef,
        arrivingGuestRef: schema.turnovers.arrivingGuestRef,
        status: schema.turnovers.status,
        createdAt: schema.turnovers.createdAt,
        completedAt: schema.turnovers.completedAt,
        propertyName: schema.properties.name,
      })
      .from(schema.turnovers)
      .innerJoin(
        schema.properties,
        eq(schema.turnovers.propertyId, schema.properties.id)
      )
      .where(eq(schema.properties.orgId, session.orgId));

    // Get photos metadata (not binary data)
    const photos = await db
      .select({
        originalFilename: schema.photos.originalFilename,
        mimeType: schema.photos.mimeType,
        fileSizeBytes: schema.photos.fileSizeBytes,
        captureTimestamp: schema.photos.captureTimestamp,
        gpsLatitude: schema.photos.gpsLatitude,
        gpsLongitude: schema.photos.gpsLongitude,
        deviceMake: schema.photos.deviceMake,
        deviceModel: schema.photos.deviceModel,
        isDamageFlagged: schema.photos.isDamageFlagged,
        damageNote: schema.photos.damageNote,
        photoSet: schema.photos.photoSet,
        uploadTimestamp: schema.photos.uploadTimestamp,
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

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: user || null,
      organisation: org?.name || null,
      properties,
      turnovers,
      photoMetadata: photos,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": "attachment; filename=banda-data-export.json",
      },
    });
  } catch (error) {
    console.error("Data export error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
