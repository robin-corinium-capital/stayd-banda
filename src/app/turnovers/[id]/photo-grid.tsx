"use client";

import { useState, useEffect } from "react";

type Photo = {
  id: string;
  turnoverId: string;
  areaId: string | null;
  photoSet: string;
  r2KeyThumbnail: string | null;
  originalFilename: string | null;
  isDamageFlagged: boolean | null;
  damageNote: string | null;
  uploadTimestamp: Date | null;
  captureTimestamp: Date | null;
  deviceMake: string | null;
  deviceModel: string | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
};

type Area = {
  id: string;
  name: string;
};

export function PhotoGrid({
  photos,
  areas,
  turnoverId,
}: {
  photos: Photo[];
  areas: Area[];
  turnoverId: string;
}) {
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>(
    {}
  );
  const [loadingUrls, setLoadingUrls] = useState(true);

  const areaMap = new Map(areas.map((a) => [a.id, a.name]));

  useEffect(() => {
    async function loadThumbnails() {
      try {
        const res = await fetch(`/api/turnovers/${turnoverId}/photos`);
        if (res.ok) {
          const data = await res.json();
          const urls: Record<string, string> = {};
          for (const photo of data.photos) {
            if (photo.thumbnailUrl) {
              urls[photo.id] = photo.thumbnailUrl;
            }
          }
          setThumbnailUrls(urls);
        }
      } catch {
        // Non-fatal
      }
      setLoadingUrls(false);
    }
    loadThumbnails();
  }, [turnoverId]);

  // Group by area
  const grouped = new Map<string, Photo[]>();
  grouped.set("general", []);
  for (const area of areas) {
    grouped.set(area.id, []);
  }
  for (const photo of photos) {
    const key = photo.areaId || "general";
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(photo);
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([areaKey, areaPhotos]) => {
        if (areaPhotos.length === 0) return null;
        const areaName =
          areaKey === "general" ? "General" : areaMap.get(areaKey) || "Unknown";

        return (
          <div key={areaKey}>
            <h3 className="mb-2 text-sm font-medium text-gray-700">
              {areaName} ({areaPhotos.length})
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {areaPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100 ring-1 ring-surface-border"
                >
                  {thumbnailUrls[photo.id] ? (
                    <img
                      src={thumbnailUrls[photo.id]}
                      alt={photo.originalFilename || "Photo"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      {loadingUrls ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand" />
                      ) : (
                        <svg
                          className="h-8 w-8 text-gray-300"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                          />
                        </svg>
                      )}
                    </div>
                  )}

                  {/* Damage flag indicator */}
                  {photo.isDamageFlagged && (
                    <div className="absolute top-1 right-1 rounded-full bg-red-500 p-1">
                      <svg
                        className="h-3 w-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M3 6l3 1 2-2 5 3 4-2v8H3V6z" />
                        <path d="M3 6V4h1v2H3z" />
                      </svg>
                    </div>
                  )}

                  {/* Hover overlay with filename */}
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="w-full p-2">
                      <p className="truncate text-xs text-white">
                        {photo.originalFilename || "Photo"}
                      </p>
                      {photo.damageNote && (
                        <p className="mt-0.5 truncate text-xs text-red-300">
                          {photo.damageNote}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
