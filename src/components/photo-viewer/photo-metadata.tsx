"use client";

import type { PhotoData } from "./photo-viewer";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type PhotoMetadataProps = {
  photo: PhotoData;
  areaName: string | null;
  visible: boolean;
  onToggle: () => void;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "Unknown";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "Unknown";
  return d.toLocaleString();
}

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null) return "Unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatPhotoSet(photoSet: string): string {
  switch (photoSet) {
    case "post_checkout":
      return "Post-checkout";
    case "pre_checkin":
      return "Pre-checkin";
    default:
      return photoSet
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

/* ------------------------------------------------------------------ */
/*  Field row                                                          */
/* ------------------------------------------------------------------ */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
        {label}
      </span>
      <span className="text-sm text-gray-100">{children}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PhotoMetadata({
  photo,
  areaName,
  visible,
  onToggle,
}: PhotoMetadataProps) {
  const hasGps =
    photo.gpsLatitude != null && photo.gpsLongitude != null;

  const device =
    photo.deviceMake || photo.deviceModel
      ? [photo.deviceMake, photo.deviceModel].filter(Boolean).join(" ")
      : "Unknown";

  const content = (
    <div className="flex flex-col gap-3">
      <Field label="Upload time">{formatDateTime(photo.uploadTimestamp)}</Field>
      <Field label="Capture time">{formatDateTime(photo.captureTimestamp)}</Field>

      <Field label="GPS">
        {hasGps ? (
          <span className="flex items-center gap-1.5">
            <span>
              {photo.gpsLatitude!.toFixed(6)}, {photo.gpsLongitude!.toFixed(6)}
            </span>
            <a
              href={`https://maps.google.com/?q=${photo.gpsLatitude},${photo.gpsLongitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2 hover:text-accent/80"
            >
              Open in Maps
            </a>
          </span>
        ) : (
          "No location data"
        )}
      </Field>

      <Field label="Device">{device}</Field>
      <Field label="Uploader">{photo.uploaderName ?? "Unknown"}</Field>
      <Field label="Area">{areaName ?? "General"}</Field>
      <Field label="Photo set">{formatPhotoSet(photo.photoSet)}</Field>
      <Field label="File size">{formatFileSize(photo.fileSizeBytes)}</Field>
      <Field label="Original filename">
        <span className="break-all">{photo.originalFilename ?? "Unknown"}</span>
      </Field>
    </div>
  );

  return (
    <>
      {/* ---- Desktop: inline content (always visible) ---- */}
      <div className="hidden lg:block">{content}</div>

      {/* ---- Mobile: toggle button + bottom sheet ---- */}
      <div className="lg:hidden">
        {/* Floating info button */}
        <button
          onClick={onToggle}
          className="fixed bottom-20 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white shadow-lg transition-colors hover:bg-black/80"
          aria-label={visible ? "Hide photo info" : "Show photo info"}
        >
          {visible ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
              />
            </svg>
          )}
        </button>

        {/* Bottom sheet */}
        {visible && (
          <div className="fixed bottom-0 left-0 right-0 z-40 max-h-[60vh] overflow-y-auto rounded-t-2xl bg-gray-900/95 p-4 text-white">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-600" />
            {content}
          </div>
        )}
      </div>
    </>
  );
}
