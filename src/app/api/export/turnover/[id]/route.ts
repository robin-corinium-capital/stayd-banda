import { NextRequest, NextResponse } from "next/server";
import { getApiSession, isAuthError } from "@/lib/auth-helpers";
import {
  getTurnoverWithAccess,
  getTurnoverPhotos,
  sanitiseFilename,
} from "@/lib/export-helpers";
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

  const { id } = await params;
  const flaggedOnly =
    request.nextUrl.searchParams.get("flagged_only") === "true";

  // Verify access
  const turnover = await getTurnoverWithAccess(id, session);
  if (!turnover) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch photos
  const photos = await getTurnoverPhotos(id, flaggedOnly);

  if (photos.length === 0) {
    return NextResponse.json(
      { error: "No photos to export" },
      { status: 400 }
    );
  }

  // Build ZIP
  const passthrough = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 5 } });

  archive.on("error", (err) => {
    passthrough.destroy(err);
  });

  archive.pipe(passthrough);

  // Track filenames per directory to avoid collisions
  const counters: Record<string, number> = {};

  for (const photo of photos) {
    const set =
      photo.photoSet === "post_checkout" ? "post-checkout" : "pre-checkin";
    const area = photo.areaName
      ? sanitiseFilename(photo.areaName)
      : "general";
    const dir = `${set}/${area}`;

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

  const propSlug = sanitiseFilename(turnover.propertyName);
  const suffix = flaggedOnly ? "_flagged" : "";
  const zipFilename = `turnover_${turnover.checkoutDate}_to_${turnover.checkinDate}_${propSlug}${suffix}.zip`;

  // Convert PassThrough to ReadableStream for NextResponse
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
