import { NextRequest, NextResponse } from "next/server";
import { getApiSession, isAuthError, isOwner } from "@/lib/auth-helpers";
import { sanitiseFilename } from "@/lib/export-helpers";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { getObject } from "@/lib/r2";
import archiver from "archiver";
import { PassThrough } from "stream";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getApiSession();
  if (isAuthError(session)) return session;

  // Only owners can bulk export
  if (!isOwner(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: propertyId } = await params;
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "from and to date params required" },
      { status: 400 }
    );
  }

  if (isNaN(Date.parse(from)) || isNaN(Date.parse(to))) {
    return NextResponse.json(
      { error: "from and to must be valid dates (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  if (from > to) {
    return NextResponse.json(
      { error: "from date must not be after to date" },
      { status: 400 }
    );
  }

  // Verify property belongs to org
  const [property] = await db
    .select()
    .from(schema.properties)
    .where(
      and(
        eq(schema.properties.id, propertyId),
        eq(schema.properties.orgId, session.orgId)
      )
    )
    .limit(1);

  if (!property) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch turnovers in date range
  const turnovers = await db
    .select()
    .from(schema.turnovers)
    .where(
      and(
        eq(schema.turnovers.propertyId, propertyId),
        gte(schema.turnovers.checkoutDate, from),
        lte(schema.turnovers.checkoutDate, to)
      )
    )
    .orderBy(schema.turnovers.checkoutDate);

  if (turnovers.length === 0) {
    return NextResponse.json(
      { error: "No turnovers in date range" },
      { status: 400 }
    );
  }

  // Fetch all photos for these turnovers
  const turnoverIds = turnovers.map((t) => t.id);

  const allPhotos = await db
    .select({
      id: schema.photos.id,
      turnoverId: schema.photos.turnoverId,
      photoSet: schema.photos.photoSet,
      r2KeyOriginal: schema.photos.r2KeyOriginal,
      originalFilename: schema.photos.originalFilename,
      mimeType: schema.photos.mimeType,
      areaId: schema.photos.areaId,
      areaName: schema.areas.name,
    })
    .from(schema.photos)
    .leftJoin(schema.areas, eq(schema.photos.areaId, schema.areas.id))
    .where(inArray(schema.photos.turnoverId, turnoverIds))
    .orderBy(schema.photos.uploadTimestamp);

  if (allPhotos.length === 0) {
    return NextResponse.json(
      { error: "No photos to export" },
      { status: 400 }
    );
  }

  // Build turnover lookup
  const turnoverMap = new Map(turnovers.map((t) => [t.id, t]));

  // Build ZIP
  const passthrough = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 5 } });

  archive.on("error", (err) => {
    passthrough.destroy(err);
  });

  archive.pipe(passthrough);

  const counters: Record<string, number> = {};

  for (const photo of allPhotos) {
    const turnover = turnoverMap.get(photo.turnoverId);
    if (!turnover) continue;

    const turnoverDir = `turnover_${turnover.checkoutDate}_to_${turnover.checkinDate}`;
    const set =
      photo.photoSet === "post_checkout" ? "post-checkout" : "pre-checkin";
    const area = photo.areaName
      ? sanitiseFilename(photo.areaName)
      : "general";
    const dir = `${turnoverDir}/${set}/${area}`;

    counters[dir] = (counters[dir] || 0) + 1;
    const ext = getExtension(photo.originalFilename, photo.mimeType);
    const filename = `photo_${String(counters[dir]).padStart(3, "0")}${ext}`;

    try {
      const buffer = await getObject(photo.r2KeyOriginal);
      archive.append(buffer, { name: `${dir}/${filename}` });
    } catch {
      // Skip photos that fail to download
    }
  }

  await archive.finalize();

  const propSlug = sanitiseFilename(property.name);
  const zipFilename = `${propSlug}_${from}_to_${to}.zip`;

  const readableStream = new ReadableStream({
    start(controller) {
      passthrough.on("data", (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });
      passthrough.on("end", () => {
        controller.close();
      });
      passthrough.on("error", (err) => {
        controller.error(err);
      });
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipFilename}"`,
    },
  });
}

function getExtension(
  filename: string | null,
  mimeType: string | null
): string {
  if (filename) {
    const dotIndex = filename.lastIndexOf(".");
    if (dotIndex !== -1) return filename.substring(dotIndex);
  }
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  return ".jpg";
}
