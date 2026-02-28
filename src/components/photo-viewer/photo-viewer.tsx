"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PhotoMetadata } from "./photo-metadata";
import { PhotoActions } from "./photo-actions";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type PhotoData = {
  id: string;
  turnoverId: string;
  areaId: string | null;
  photoSet: string;
  originalFilename: string | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  isDamageFlagged: boolean | null;
  damageNote: string | null;
  uploadTimestamp: Date | string | null;
  captureTimestamp: Date | string | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  deviceMake: string | null;
  deviceModel: string | null;
  uploadedBy: string | null;
  uploaderName: string | null;
  thumbnailUrl?: string | null;
};

export type AreaData = {
  id: string;
  name: string;
};

type PhotoViewerProps = {
  photos: PhotoData[];
  initialIndex: number;
  areas: AreaData[];
  turnoverId: string;
  role: string;
  onClose: () => void;
  onPhotoUpdate: (photoId: string, updates: Partial<PhotoData>) => void;
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PhotoViewer({
  photos,
  initialIndex,
  areas,
  turnoverId,
  role,
  onClose,
  onPhotoUpdate,
}: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [fullSizeUrl, setFullSizeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMetadata, setShowMetadata] = useState(false);

  const urlCache = useRef<Map<string, string>>(new Map());
  const touchStartX = useRef<number | null>(null);

  const photo = photos[currentIndex];
  const areaName =
    areas.find((a) => a.id === photo.areaId)?.name ?? null;

  /* ---- Fetch presigned URL ---- */

  const fetchUrl = useCallback(
    async (photoId: string): Promise<string | null> => {
      const cached = urlCache.current.get(photoId);
      if (cached) return cached;

      try {
        const res = await fetch(`/api/photos/${photoId}/original`);
        if (!res.ok) return null;
        const data: { url: string } = await res.json();
        urlCache.current.set(photoId, data.url);
        return data.url;
      } catch {
        return null;
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const url = await fetchUrl(photo.id);
      if (!cancelled) {
        setFullSizeUrl(url);
        setLoading(false);
      }

      // Prefetch neighbours
      const prev = photos[currentIndex - 1];
      const next = photos[currentIndex + 1];
      if (prev) fetchUrl(prev.id);
      if (next) fetchUrl(next.id);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [currentIndex, photo.id, photos, fetchUrl]);

  /* ---- Navigation helpers ---- */

  const goTo = useCallback(
    (idx: number) => {
      if (idx >= 0 && idx < photos.length) {
        setCurrentIndex(idx);
      }
    },
    [photos.length],
  );

  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);
  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);

  /* ---- Keyboard ---- */

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext, onClose]);

  /* ---- Touch / swipe ---- */

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      if (delta > 0) goPrev();
      else goNext();
    }
    touchStartX.current = null;
  }

  /* ---- Propagate photo updates ---- */

  function handlePhotoUpdate(updates: Partial<PhotoData>) {
    onPhotoUpdate(photo.id, updates);
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="fixed inset-0 z-50 flex bg-black">
      {/* ---- Image area ---- */}
      <div
        className="relative flex flex-1 flex-col items-center justify-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
          aria-label="Close viewer"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Counter */}
        <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm font-medium text-white">
          {currentIndex + 1} / {photos.length}
        </div>

        {/* Previous arrow (desktop) */}
        {currentIndex > 0 && (
          <button
            onClick={goPrev}
            className="absolute left-3 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 lg:flex"
            aria-label="Previous photo"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Next arrow (desktop) */}
        {currentIndex < photos.length - 1 && (
          <button
            onClick={goNext}
            className="absolute right-3 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 lg:flex"
            aria-label="Next photo"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
            <svg
              className="h-10 w-10 animate-spin text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
        )}

        {/* Image */}
        {fullSizeUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={fullSizeUrl}
            alt={photo.originalFilename ?? "Photo"}
            className={`object-contain max-h-full ${showMetadata ? "lg:max-w-[calc(100%-320px)]" : "max-w-full"}`}
            draggable={false}
          />
        )}
      </div>

      {/* ---- Desktop metadata sidebar ---- */}
      <div className="hidden w-80 flex-col overflow-y-auto bg-gray-900/95 p-4 text-white lg:flex">
        <PhotoMetadata
          photo={photo}
          areaName={areaName}
          visible={true}
          onToggle={() => {}}
        />
        <div className="mt-4 border-t border-white/10 pt-4">
          <PhotoActions
            photo={photo}
            areas={areas}
            role={role}
            onUpdate={handlePhotoUpdate}
          />
        </div>
      </div>

      {/* ---- Mobile metadata bottom-sheet ---- */}
      <div className="lg:hidden">
        <PhotoMetadata
          photo={photo}
          areaName={areaName}
          visible={showMetadata}
          onToggle={() => setShowMetadata((v) => !v)}
        />
        {showMetadata && (
          <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-gray-900/95 px-4 pb-4">
            <PhotoActions
              photo={photo}
              areas={areas}
              role={role}
              onUpdate={handlePhotoUpdate}
            />
          </div>
        )}
      </div>
    </div>
  );
}
