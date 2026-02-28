import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getApiSession, isAuthError } from "@/lib/auth-helpers";
import { getObject, putObject } from "@/lib/r2";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  const session = await getApiSession();
  if (isAuthError(session)) return session;

  const body = await req.json();
  const {
    r2_key,
    turnover_id,
    area_id,
    photo_set,
    original_filename,
    file_size_bytes,
    mime_type,
    is_damage_flagged,
    damage_note,
  } = body;

  if (!r2_key || !turnover_id || !photo_set) {
    return NextResponse.json(
      { error: "r2_key, turnover_id, and photo_set are required" },
      { status: 400 }
    );
  }

  if (!["post_checkout", "pre_checkin"].includes(photo_set)) {
    return NextResponse.json(
      { error: "photo_set must be post_checkout or pre_checkin" },
      { status: 400 }
    );
  }

  // Validate turnover exists and user has access
  const [turnover] = await db
    .select({
      id: schema.turnovers.id,
      propertyId: schema.turnovers.propertyId,
      status: schema.turnovers.status,
      propertyOrgId: schema.properties.orgId,
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

  // Validate area belongs to the property (if provided)
  if (area_id) {
    const [area] = await db
      .select()
      .from(schema.areas)
      .where(
        and(
          eq(schema.areas.id, area_id),
          eq(schema.areas.propertyId, turnover.propertyId)
        )
      )
      .limit(1);

    if (!area) {
      return NextResponse.json(
        { error: "Area not found for this property" },
        { status: 400 }
      );
    }
  }

  // Download original image from R2 for EXIF extraction and thumbnail
  let imageBuffer: Buffer;
  try {
    imageBuffer = await getObject(r2_key);
  } catch {
    return NextResponse.json(
      { error: "Failed to retrieve uploaded image from storage" },
      { status: 500 }
    );
  }

  // Extract EXIF metadata
  let captureTimestamp: Date | null = null;
  let gpsLatitude: number | null = null;
  let gpsLongitude: number | null = null;
  let deviceMake: string | null = null;
  let deviceModel: string | null = null;

  let finalR2Key = r2_key;
  let processBuffer = imageBuffer;

  try {
    const metadata = await sharp(imageBuffer).metadata();

    // Handle HEIC: convert to JPEG
    const isHeic =
      mime_type?.toLowerCase() === "image/heic" ||
      mime_type?.toLowerCase() === "image/heif" ||
      metadata.format === "heif";

    if (isHeic) {
      processBuffer = await sharp(imageBuffer).jpeg({ quality: 95 }).toBuffer();
      // Upload converted JPEG as the primary image
      const jpegKey = r2_key.replace(/\.(heic|heif)$/i, ".jpg");
      await putObject(jpegKey, processBuffer, "image/jpeg");
      finalR2Key = jpegKey;
    }

    // Extract EXIF data
    const exif = metadata.exif;
    if (exif) {
      try {
        const exifData = parseExifBuffer(exif);
        captureTimestamp = exifData.dateTimeOriginal || null;
        gpsLatitude = exifData.gpsLatitude ?? null;
        gpsLongitude = exifData.gpsLongitude ?? null;
        deviceMake = exifData.make || null;
        deviceModel = exifData.model || null;
      } catch {
        // EXIF parsing failure is non-fatal
      }
    }
  } catch {
    // Image processing failure — still save the photo record
  }

  // Generate thumbnail (400px wide, JPEG, no EXIF metadata)
  let r2KeyThumbnail: string | null = null;
  try {
    const thumbBuffer = await sharp(processBuffer)
      .resize(400, undefined, { withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Thumbnail key: same path with _thumb suffix
    const keyParts = finalR2Key.split(".");
    const ext = keyParts.pop();
    r2KeyThumbnail = `${keyParts.join(".")}_thumb.jpg`;

    await putObject(r2KeyThumbnail, thumbBuffer, "image/jpeg");
  } catch {
    // Thumbnail generation failure is non-fatal
  }

  // Insert photo record
  const [photo] = await db
    .insert(schema.photos)
    .values({
      turnoverId: turnover_id,
      areaId: area_id || null,
      photoSet: photo_set,
      r2KeyOriginal: finalR2Key,
      r2KeyThumbnail,
      originalFilename: original_filename || null,
      fileSizeBytes: file_size_bytes || null,
      mimeType: mime_type || null,
      captureTimestamp,
      gpsLatitude,
      gpsLongitude,
      deviceMake,
      deviceModel,
      isDamageFlagged: is_damage_flagged || false,
      damageNote: damage_note?.trim() || null,
      uploadedBy: session.userId,
    })
    .returning();

  // Auto-update turnover status from "open" to "in_progress"
  if (turnover.status === "open") {
    await db
      .update(schema.turnovers)
      .set({ status: "in_progress" })
      .where(eq(schema.turnovers.id, turnover_id));
  }

  return NextResponse.json(photo, { status: 201 });
}

// Simple EXIF buffer parser for common fields
function parseExifBuffer(exifBuffer: Buffer): {
  dateTimeOriginal?: Date;
  gpsLatitude?: number;
  gpsLongitude?: number;
  make?: string;
  model?: string;
} {
  const result: {
    dateTimeOriginal?: Date;
    gpsLatitude?: number;
    gpsLongitude?: number;
    make?: string;
    model?: string;
  } = {};

  try {
    const str = exifBuffer.toString("binary");

    // DateTimeOriginal (tag 0x9003)
    const dateMatch = str.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
    if (dateMatch) {
      const [, year, month, day, hour, minute, second] = dateMatch;
      result.dateTimeOriginal = new Date(
        `${year}-${month}-${day}T${hour}:${minute}:${second}`
      );
      if (isNaN(result.dateTimeOriginal.getTime())) {
        result.dateTimeOriginal = undefined;
      }
    }

    // Make and model (ASCII strings in EXIF — rough extraction)
    // These are best-effort; Sharp's metadata sometimes provides them
    const makeMatch = str.match(/(?:Apple|Samsung|Google|Huawei|Xiaomi|OnePlus|Sony|LG|Motorola|Nokia|OPPO|vivo|realme|Canon|Nikon|Fujifilm)/i);
    if (makeMatch) {
      result.make = makeMatch[0];
    }
  } catch {
    // Parsing failure is non-fatal
  }

  return result;
}
