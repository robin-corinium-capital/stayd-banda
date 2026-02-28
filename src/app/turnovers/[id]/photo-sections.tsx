"use client";

import { useState, useEffect, useCallback } from "react";
import { PhotoViewer, type PhotoData } from "@/components/photo-viewer/photo-viewer";

type Photo = {
  id: string;
  turnoverId: string;
  areaId: string | null;
  photoSet: string;
  r2KeyThumbnail: string | null;
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
};

type Area = {
  id: string;
  name: string;
  sortOrder: number | null;
};

type PhotoSectionsProps = {
  turnoverId: string;
  areas: Area[];
  postCheckoutPhotos: Photo[];
  preCheckinPhotos: Photo[];
  role: string;
};

export function PhotoSections({
  turnoverId,
  areas,
  postCheckoutPhotos,
  preCheckinPhotos,
  role,
}: PhotoSectionsProps) {
  const [activeTab, setActiveTab] = useState<"post_checkout" | "pre_checkin">(
    "post_checkout"
  );
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>(
    {}
  );
  const [loadingUrls, setLoadingUrls] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerPhotos, setViewerPhotos] = useState<Photo[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [localPostCheckout, setLocalPostCheckout] =
    useState<Photo[]>(postCheckoutPhotos);
  const [localPreCheckin, setLocalPreCheckin] =
    useState<Photo[]>(preCheckinPhotos);

  // Fetch thumbnail URLs on mount
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

  const handlePhotoClick = useCallback(
    (photo: Photo, allPhotosInSet: Photo[]) => {
      const idx = allPhotosInSet.findIndex((p) => p.id === photo.id);
      setViewerPhotos(allPhotosInSet);
      setViewerIndex(idx >= 0 ? idx : 0);
      setViewerOpen(true);
    },
    []
  );

  const handlePhotoUpdate = useCallback(
    (photoId: string, updates: Partial<PhotoData>) => {
      const updateList = (photos: Photo[]) =>
        photos.map((p) =>
          p.id === photoId ? { ...p, ...updates } : p
        );
      setLocalPostCheckout((prev) => updateList(prev));
      setLocalPreCheckin((prev) => updateList(prev));
      setViewerPhotos((prev) => updateList(prev));
    },
    []
  );

  const handleViewerClose = useCallback(() => {
    setViewerOpen(false);
  }, []);

  return (
    <>
      {/* Desktop layout */}
      <div className="hidden lg:block">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h2 className="mb-4 text-lg font-semibold text-amber-800">
              After guest left ({localPostCheckout.length})
            </h2>
            <PhotoColumn
              photos={localPostCheckout}
              areas={areas}
              thumbnailUrls={thumbnailUrls}
              loadingUrls={loadingUrls}
              onPhotoClick={handlePhotoClick}
            />
          </div>
          <div>
            <h2 className="mb-4 text-lg font-semibold text-green-800">
              Before next guest ({localPreCheckin.length})
            </h2>
            <PhotoColumn
              photos={localPreCheckin}
              areas={areas}
              thumbnailUrls={thumbnailUrls}
              loadingUrls={loadingUrls}
              onPhotoClick={handlePhotoClick}
            />
          </div>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="lg:hidden">
        <div className="mb-4 flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setActiveTab("post_checkout")}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === "post_checkout"
                ? "bg-brand text-white"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100"
            }`}
          >
            After guest left ({localPostCheckout.length})
          </button>
          <button
            onClick={() => setActiveTab("pre_checkin")}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === "pre_checkin"
                ? "bg-brand text-white"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100"
            }`}
          >
            Before next guest ({localPreCheckin.length})
          </button>
        </div>
        <PhotoColumn
          photos={
            activeTab === "post_checkout" ? localPostCheckout : localPreCheckin
          }
          areas={areas}
          thumbnailUrls={thumbnailUrls}
          loadingUrls={loadingUrls}
          onPhotoClick={handlePhotoClick}
        />
      </div>

      {/* Photo Viewer */}
      {viewerOpen && (
        <PhotoViewer
          photos={viewerPhotos.map((p) => ({
            ...p,
            uploaderName: null,
            thumbnailUrl: thumbnailUrls[p.id] ?? null,
          }))}
          initialIndex={viewerIndex}
          areas={areas}
          turnoverId={turnoverId}
          role={role}
          onClose={handleViewerClose}
          onPhotoUpdate={handlePhotoUpdate}
        />
      )}
    </>
  );
}

function PhotoColumn({
  photos,
  areas,
  thumbnailUrls,
  loadingUrls,
  onPhotoClick,
}: {
  photos: Photo[];
  areas: Area[];
  thumbnailUrls: Record<string, string>;
  loadingUrls: boolean;
  onPhotoClick: (photo: Photo, allPhotosInSet: Photo[]) => void;
}) {
  const areaMap = new Map(areas.map((a) => [a.id, a.name]));

  // Group photos by area
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
        const areaName =
          areaKey === "general"
            ? "General"
            : areaMap.get(areaKey) || "Unknown";

        return (
          <div key={areaKey}>
            <h3 className="mb-2 text-sm font-medium text-gray-700">
              {areaName} ({areaPhotos.length})
            </h3>
            {areaPhotos.length === 0 ? (
              <p className="text-xs text-gray-400">No photos</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {areaPhotos.map((photo) => (
                  <div key={photo.id}>
                    <div
                      onClick={() => onPhotoClick(photo, photos)}
                      className={`group relative aspect-square overflow-hidden rounded-lg bg-gray-100 cursor-pointer ${
                        photo.isDamageFlagged
                          ? "ring-2 ring-status-critical"
                          : ""
                      }`}
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
                    </div>
                    {/* Capture timestamp */}
                    {photo.captureTimestamp && (
                      <p className="mt-1 text-xs text-gray-400">
                        {formatTimestamp(photo.captureTimestamp)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatTimestamp(ts: Date | string | null): string {
  if (!ts) return "";
  const date = typeof ts === "string" ? new Date(ts) : ts;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
