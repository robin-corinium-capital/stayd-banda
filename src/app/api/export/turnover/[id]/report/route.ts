import { NextResponse } from "next/server";
import { getApiSession, isAuthError } from "@/lib/auth-helpers";
import {
  getTurnoverWithAccess,
  getTurnoverPhotos,
  sanitiseFilename,
} from "@/lib/export-helpers";
import { getObject } from "@/lib/r2";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getApiSession();
  if (isAuthError(session)) return session;

  const { id } = await params;

  // Verify access
  const turnover = await getTurnoverWithAccess(id, session);
  if (!turnover) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch areas for this property
  const areas = await db
    .select()
    .from(schema.areas)
    .where(eq(schema.areas.propertyId, turnover.propertyId))
    .orderBy(schema.areas.sortOrder, schema.areas.name);

  // Fetch all photos with metadata
  const photos = await getTurnoverPhotos(id, false);

  if (photos.length === 0) {
    return NextResponse.json(
      { error: "No photos to export" },
      { status: 400 }
    );
  }

  // Load thumbnails as base64 for embedding in the PDF
  const photosWithImages = await Promise.all(
    photos.map(async (photo) => {
      let imageDataUrl = "";
      try {
        // Use thumbnail if available, otherwise original
        const key = photo.r2KeyThumbnail || photo.r2KeyOriginal;
        const buffer = await getObject(key);
        const base64 = buffer.toString("base64");
        const mime = photo.r2KeyThumbnail ? "image/jpeg" : (photo.mimeType || "image/jpeg");
        imageDataUrl = `data:${mime};base64,${base64}`;
      } catch {
        // Skip photos that fail to download
      }
      return { ...photo, imageDataUrl };
    })
  );

  // Dynamically import @react-pdf/renderer (ESM module)
  const { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } =
    await import("@react-pdf/renderer");
  const React = (await import("react")).default;

  const flaggedPhotos = photosWithImages.filter((p) => p.isDamageFlagged);

  // Build area sections: group photos by area
  const areaMap = new Map<string, { name: string; photos: typeof photosWithImages }>();

  // Add known areas
  for (const area of areas) {
    areaMap.set(area.id, { name: area.name, photos: [] });
  }
  // Add "General" for unassigned photos
  areaMap.set("general", { name: "General", photos: [] });

  for (const photo of photosWithImages) {
    const key = photo.areaId || "general";
    const entry = areaMap.get(key);
    if (entry) {
      entry.photos.push(photo);
    } else {
      // Area was deleted but photo still references it
      const gen = areaMap.get("general")!;
      gen.photos.push(photo);
    }
  }

  // Remove empty areas
  for (const [key, value] of areaMap) {
    if (value.photos.length === 0) areaMap.delete(key);
  }

  // Styles
  const styles = StyleSheet.create({
    page: {
      padding: 40,
      fontSize: 9,
      fontFamily: "Helvetica",
    },
    coverPage: {
      padding: 40,
      fontSize: 9,
      fontFamily: "Helvetica",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    },
    title: {
      fontSize: 24,
      fontFamily: "Helvetica-Bold",
      marginBottom: 20,
      color: "#1a3a2a",
    },
    subtitle: {
      fontSize: 14,
      fontFamily: "Helvetica-Bold",
      marginBottom: 8,
      color: "#333",
    },
    coverField: {
      fontSize: 11,
      marginBottom: 4,
      color: "#555",
    },
    coverFieldBold: {
      fontFamily: "Helvetica-Bold",
      color: "#333",
    },
    areaHeader: {
      fontSize: 16,
      fontFamily: "Helvetica-Bold",
      marginBottom: 12,
      paddingBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: "#ccc",
      color: "#1a3a2a",
    },
    columns: {
      flexDirection: "row",
      gap: 16,
    },
    column: {
      flex: 1,
    },
    columnHeader: {
      fontSize: 10,
      fontFamily: "Helvetica-Bold",
      marginBottom: 8,
      color: "#666",
      textTransform: "uppercase",
    },
    photoContainer: {
      marginBottom: 12,
    },
    photoContainerFlagged: {
      marginBottom: 12,
      borderWidth: 2,
      borderColor: "#dc2626",
      padding: 4,
    },
    photo: {
      width: "100%",
      maxHeight: 200,
      objectFit: "contain",
    },
    flagLabel: {
      backgroundColor: "#dc2626",
      color: "#fff",
      fontSize: 8,
      fontFamily: "Helvetica-Bold",
      padding: "2 6",
      marginBottom: 4,
      alignSelf: "flex-start",
    },
    damageNote: {
      fontSize: 8,
      color: "#dc2626",
      fontStyle: "italic",
      marginTop: 2,
    },
    metadata: {
      fontSize: 7,
      color: "#888",
      marginTop: 2,
    },
    noPhotos: {
      fontSize: 9,
      color: "#999",
      fontStyle: "italic",
      marginTop: 20,
    },
    footer: {
      position: "absolute",
      bottom: 20,
      left: 40,
      right: 40,
      fontSize: 6,
      color: "#999",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    footerText: {
      maxWidth: "80%",
    },
    summaryTitle: {
      fontSize: 18,
      fontFamily: "Helvetica-Bold",
      marginBottom: 16,
      color: "#dc2626",
    },
    summaryItem: {
      flexDirection: "row",
      marginBottom: 12,
      gap: 10,
    },
    summaryThumb: {
      width: 80,
      height: 60,
      objectFit: "contain",
    },
    summaryDetails: {
      flex: 1,
    },
    summaryArea: {
      fontSize: 10,
      fontFamily: "Helvetica-Bold",
    },
    summaryMeta: {
      fontSize: 8,
      color: "#666",
      marginTop: 2,
    },
    summaryNote: {
      fontSize: 9,
      color: "#dc2626",
      marginTop: 4,
    },
    divider: {
      borderBottomWidth: 1,
      borderBottomColor: "#eee",
      marginBottom: 12,
    },
  });

  const formatTimestamp = (ts: Date | null): string => {
    if (!ts) return "Not available";
    return new Date(ts).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  };

  const formatGps = (lat: number | null, lon: number | null): string => {
    if (lat === null || lon === null) return "Not available";
    return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  };

  const generatedAt = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const formatDateShort = (dateStr: string): string => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const footerText =
    "Generated by banda (banda.stayd-tools.com). All photographs are original, unmodified uploads with server-verified timestamps. No AI generated or AI enhanced content.";

  const PageFooter = ({ pageNum }: { pageNum?: string }) =>
    React.createElement(
      View,
      { style: styles.footer, fixed: true },
      React.createElement(Text, { style: styles.footerText }, footerText),
      React.createElement(
        Text,
        null,
        pageNum ||
          ""
      )
    );

  // Render photo metadata block
  const PhotoMeta = ({ photo }: { photo: (typeof photosWithImages)[0] }) =>
    React.createElement(
      View,
      null,
      React.createElement(
        Text,
        { style: styles.metadata },
        `Captured: ${formatTimestamp(photo.captureTimestamp)}`
      ),
      React.createElement(
        Text,
        { style: styles.metadata },
        `Uploaded: ${formatTimestamp(photo.uploadTimestamp)}`
      ),
      React.createElement(
        Text,
        { style: styles.metadata },
        `Device: ${photo.deviceMake && photo.deviceModel ? `${photo.deviceMake} ${photo.deviceModel}` : "Not available"}`
      ),
      React.createElement(
        Text,
        { style: styles.metadata },
        `GPS: ${formatGps(photo.gpsLatitude, photo.gpsLongitude)}`
      ),
      React.createElement(
        Text,
        { style: styles.metadata },
        `Uploaded by: ${photo.uploaderName || "Unknown"}`
      )
    );

  // Render a single photo card
  const PhotoCard = ({ photo }: { photo: (typeof photosWithImages)[0] }) => {
    if (!photo.imageDataUrl) return null;

    return React.createElement(
      View,
      {
        style: photo.isDamageFlagged
          ? styles.photoContainerFlagged
          : styles.photoContainer,
      },
      photo.isDamageFlagged &&
        React.createElement(Text, { style: styles.flagLabel }, "DAMAGE FLAGGED"),
      React.createElement(Image, { style: styles.photo, src: photo.imageDataUrl }),
      React.createElement(PhotoMeta, { photo }),
      photo.isDamageFlagged &&
        photo.damageNote &&
        React.createElement(Text, { style: styles.damageNote }, photo.damageNote)
    );
  };

  // Build the PDF document
  const areaEntries = Array.from(areaMap.entries());

  const doc = React.createElement(
    Document,
    null,
    // Cover page
    React.createElement(
      Page,
      { size: "A4", style: styles.coverPage },
      React.createElement(Text, { style: styles.title }, "Property Condition Report"),
      React.createElement(View, { style: { marginBottom: 20 } },
        React.createElement(
          Text,
          { style: { ...styles.coverField, fontSize: 16, fontFamily: "Helvetica-Bold", color: "#1a3a2a" } },
          turnover.propertyName
        ),
        turnover.propertyAddress &&
          React.createElement(Text, { style: { ...styles.coverField, fontSize: 12 } }, turnover.propertyAddress)
      ),
      React.createElement(View, { style: { marginBottom: 20 } },
        React.createElement(
          Text,
          { style: styles.coverField },
          `Checkout: ${formatDateShort(turnover.checkoutDate)}`
        ),
        React.createElement(
          Text,
          { style: styles.coverField },
          `Check-in: ${formatDateShort(turnover.checkinDate)}`
        ),
        turnover.departingGuestRef &&
          React.createElement(
            Text,
            { style: styles.coverField },
            `Departing guest reference: ${turnover.departingGuestRef}`
          ),
        turnover.arrivingGuestRef &&
          React.createElement(
            Text,
            { style: styles.coverField },
            `Arriving guest reference: ${turnover.arrivingGuestRef}`
          )
      ),
      React.createElement(View, { style: { marginBottom: 20 } },
        React.createElement(
          Text,
          { style: styles.coverField },
          `Total photos: ${photos.length}`
        ),
        React.createElement(
          Text,
          { style: styles.coverField },
          `Flagged items: ${flaggedPhotos.length}`
        ),
        React.createElement(
          Text,
          { style: styles.coverField },
          `Generated at: ${generatedAt}`
        )
      ),
      React.createElement(
        Text,
        { style: { ...styles.coverField, marginTop: 40, fontSize: 10, color: "#999" } },
        "Generated by banda by stayd"
      ),
      React.createElement(PageFooter, {})
    ),

    // Area pages
    ...areaEntries.map(([areaId, { name, photos: areaPhotos }]) => {
      const postCheckout = areaPhotos.filter((p) => p.photoSet === "post_checkout");
      const preCheckin = areaPhotos.filter((p) => p.photoSet === "pre_checkin");

      return React.createElement(
        Page,
        { key: areaId, size: "A4", style: styles.page, wrap: true },
        React.createElement(Text, { style: styles.areaHeader }, name),
        React.createElement(
          View,
          { style: styles.columns },
          // Left column: post-checkout
          React.createElement(
            View,
            { style: styles.column },
            React.createElement(Text, { style: styles.columnHeader }, "After guest left"),
            postCheckout.length > 0
              ? postCheckout.map((photo) =>
                  React.createElement(PhotoCard, { key: photo.id, photo })
                )
              : React.createElement(
                  Text,
                  { style: styles.noPhotos },
                  "No photos for this set."
                )
          ),
          // Right column: pre-checkin
          React.createElement(
            View,
            { style: styles.column },
            React.createElement(Text, { style: styles.columnHeader }, "Before next guest"),
            preCheckin.length > 0
              ? preCheckin.map((photo) =>
                  React.createElement(PhotoCard, { key: photo.id, photo })
                )
              : React.createElement(
                  Text,
                  { style: styles.noPhotos },
                  "No photos for this set."
                )
          )
        ),
        React.createElement(PageFooter, {})
      );
    }),

    // Damage summary page (if any flagged photos)
    ...(flaggedPhotos.length > 0
      ? [
          React.createElement(
            Page,
            { key: "damage-summary", size: "A4", style: styles.page, wrap: true },
            React.createElement(Text, { style: styles.summaryTitle }, "Damage Summary"),
            React.createElement(
              Text,
              { style: { ...styles.coverField, marginBottom: 16 } },
              `${flaggedPhotos.length} item${flaggedPhotos.length !== 1 ? "s" : ""} flagged for damage`
            ),
            ...flaggedPhotos.map((photo) =>
              React.createElement(
                View,
                { key: photo.id, wrap: false },
                React.createElement(
                  View,
                  { style: styles.summaryItem },
                  photo.imageDataUrl &&
                    React.createElement(Image, {
                      style: styles.summaryThumb,
                      src: photo.imageDataUrl,
                    }),
                  React.createElement(
                    View,
                    { style: styles.summaryDetails },
                    React.createElement(
                      Text,
                      { style: styles.summaryArea },
                      photo.areaName || "General"
                    ),
                    React.createElement(
                      Text,
                      { style: styles.summaryMeta },
                      `${photo.photoSet === "post_checkout" ? "After guest left" : "Before next guest"} · ${formatTimestamp(photo.captureTimestamp)}`
                    ),
                    photo.damageNote &&
                      React.createElement(
                        Text,
                        { style: styles.summaryNote },
                        photo.damageNote
                      )
                  )
                ),
                React.createElement(View, { style: styles.divider })
              )
            ),
            React.createElement(PageFooter, {})
          ),
        ]
      : [])
  );

  const buffer = await renderToBuffer(doc);
  const uint8 = new Uint8Array(buffer);

  const propSlug = sanitiseFilename(turnover.propertyName);
  const pdfFilename = `evidence_report_${propSlug}_${turnover.checkoutDate}.pdf`;

  return new Response(uint8, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdfFilename}"`,
    },
  });
}
