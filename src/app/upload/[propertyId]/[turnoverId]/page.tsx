"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Area = { id: string; name: string };

type UploadItem = {
  file: File;
  id: string;
  status: "pending" | "uploading" | "confirming" | "done" | "error";
  progress: number;
  error?: string;
  areaId: string;
  photoSet: "post_checkout" | "pre_checkin";
  isDamageFlagged: boolean;
  damageNote: string;
};

type TurnoverInfo = {
  id: string;
  propertyId: string;
  propertyName: string;
  checkoutDate: string;
  checkinDate: string;
  status: string | null;
};

export default function UploadTurnoverPage() {
  const router = useRouter();
  const params = useParams();
  const turnoverId = params.turnoverId as string;

  const [turnover, setTurnover] = useState<TurnoverInfo | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [photoSet, setPhotoSet] = useState<"post_checkout" | "pre_checkin">(
    "post_checkout"
  );
  const [defaultAreaId, setDefaultAreaId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load turnover + areas
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/turnovers/${turnoverId}`);
        if (!res.ok) {
          setError("Turnover not found or access denied");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setTurnover({
          id: data.id,
          propertyId: data.propertyId,
          propertyName: data.propertyName,
          checkoutDate: data.checkoutDate,
          checkinDate: data.checkinDate,
          status: data.status,
        });
        setAreas(data.areas || []);
      } catch {
        setError("Failed to load turnover details");
      }
      setLoading(false);
    }
    load();
  }, [turnoverId]);

  // Handle file selection
  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const newUploads: UploadItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Validate type
        const validTypes = [
          "image/jpeg",
          "image/png",
          "image/heic",
          "image/heif",
        ];
        if (!validTypes.includes(file.type.toLowerCase())) {
          continue; // Skip unsupported files silently
        }
        // Validate size (20MB)
        if (file.size > 20 * 1024 * 1024) {
          continue;
        }

        newUploads.push({
          file,
          id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`,
          status: "pending",
          progress: 0,
          areaId: defaultAreaId,
          photoSet,
          isDamageFlagged: false,
          damageNote: "",
        });
      }

      setUploads((prev) => [...prev, ...newUploads]);
    },
    [defaultAreaId, photoSet]
  );

  // Upload a single file
  async function uploadOne(item: UploadItem) {
    setUploads((prev) =>
      prev.map((u) =>
        u.id === item.id ? { ...u, status: "uploading", progress: 10 } : u
      )
    );

    try {
      // 1. Get presigned URL
      const presignRes = await fetch("/api/photos/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turnover_id: turnoverId,
          filename: item.file.name,
          content_type: item.file.type || "image/jpeg",
          file_size: item.file.size,
        }),
      });

      if (!presignRes.ok) {
        const err = await presignRes.json();
        throw new Error(err.error || "Failed to get upload URL");
      }

      const { presignedUrl, r2Key } = await presignRes.json();

      setUploads((prev) =>
        prev.map((u) => (u.id === item.id ? { ...u, progress: 30 } : u))
      );

      // 2. Upload to R2
      const uploadRes = await fetch(presignedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": item.file.type || "image/jpeg",
          "Content-Length": String(item.file.size),
        },
        body: item.file,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file to storage");
      }

      setUploads((prev) =>
        prev.map((u) =>
          u.id === item.id ? { ...u, status: "confirming", progress: 70 } : u
        )
      );

      // 3. Confirm upload
      const confirmRes = await fetch("/api/photos/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          r2_key: r2Key,
          turnover_id: turnoverId,
          area_id: item.areaId || undefined,
          photo_set: item.photoSet,
          original_filename: item.file.name,
          file_size_bytes: item.file.size,
          mime_type: item.file.type || "image/jpeg",
          is_damage_flagged: item.isDamageFlagged,
          damage_note: item.damageNote || undefined,
        }),
      });

      if (!confirmRes.ok) {
        const err = await confirmRes.json();
        throw new Error(err.error || "Failed to confirm upload");
      }

      setUploads((prev) =>
        prev.map((u) =>
          u.id === item.id ? { ...u, status: "done", progress: 100 } : u
        )
      );
    } catch (err) {
      setUploads((prev) =>
        prev.map((u) =>
          u.id === item.id
            ? {
                ...u,
                status: "error",
                error: err instanceof Error ? err.message : "Upload failed",
              }
            : u
        )
      );
    }
  }

  // Upload all pending
  async function uploadAll() {
    const pending = uploads.filter((u) => u.status === "pending");
    // Process up to 3 concurrently
    const concurrency = 3;
    const queue = [...pending];

    async function processNext(): Promise<void> {
      const next = queue.shift();
      if (!next) return;
      await uploadOne(next);
      return processNext();
    }

    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, () =>
      processNext()
    );
    await Promise.all(workers);
  }

  function removeUpload(id: string) {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }

  function retryUpload(id: string) {
    setUploads((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: "pending", progress: 0, error: undefined } : u
      )
    );
  }

  const pendingCount = uploads.filter((u) => u.status === "pending").length;
  const doneCount = uploads.filter((u) => u.status === "done").length;
  const errorCount = uploads.filter((u) => u.status === "error").length;
  const activeCount = uploads.filter(
    (u) => u.status === "uploading" || u.status === "confirming"
  ).length;

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error || !turnover) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error || "Turnover not found"}
        </div>
        <Link
          href="/upload"
          className="mt-4 inline-block text-sm text-brand hover:text-brand-light"
        >
          &larr; Back to upload
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/turnovers/${turnoverId}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Back to turnover
        </Link>
        <h1 className="mt-2 text-xl font-bold text-gray-900">
          Upload photos &mdash; {turnover.propertyName}
        </h1>
        <p className="text-sm text-gray-600">
          {formatDate(turnover.checkoutDate)} &rarr;{" "}
          {formatDate(turnover.checkinDate)}
        </p>
      </div>

      {/* Photo set and area selectors */}
      <div className="mb-6 space-y-4 rounded-card bg-surface-card p-4 shadow-sm ring-1 ring-surface-border">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Photo set
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPhotoSet("post_checkout")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                photoSet === "post_checkout"
                  ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              After guest left
            </button>
            <button
              type="button"
              onClick={() => setPhotoSet("pre_checkin")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                photoSet === "pre_checkin"
                  ? "bg-green-100 text-green-900 ring-1 ring-green-300"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              Before next guest
            </button>
          </div>
        </div>

        {areas.length > 0 && (
          <div>
            <label
              htmlFor="defaultArea"
              className="block text-sm font-medium text-gray-700"
            >
              Area (applied to new photos)
            </label>
            <select
              id="defaultArea"
              value={defaultAreaId}
              onChange={(e) => setDefaultAreaId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="">General (no area)</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Drop zone / file picker */}
      <div className="mb-6">
        <label
          htmlFor="fileInput"
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-8 text-center hover:border-brand/40 hover:bg-brand-dim transition-colors"
        >
          <svg
            className="mb-3 h-10 w-10 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          <p className="text-sm font-medium text-gray-700">
            Tap to select photos
          </p>
          <p className="mt-1 text-xs text-gray-500">
            JPEG, PNG, or HEIC &middot; max 20MB each
          </p>
          <input
            id="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      </div>

      {/* Upload queue */}
      {uploads.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              {doneCount} uploaded
              {pendingCount > 0 && ` · ${pendingCount} ready`}
              {activeCount > 0 && ` · ${activeCount} uploading`}
              {errorCount > 0 && ` · ${errorCount} failed`}
            </p>
            {pendingCount > 0 && activeCount === 0 && (
              <button
                onClick={uploadAll}
                className="rounded-btn bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light"
              >
                Upload {pendingCount} photo{pendingCount > 1 ? "s" : ""}
              </button>
            )}
          </div>

          <div className="space-y-2">
            {uploads.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-card bg-surface-card p-3 shadow-sm ring-1 ring-surface-border"
              >
                {/* Thumbnail preview */}
                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                  <img
                    src={URL.createObjectURL(item.file)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* File info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-700">
                    {item.file.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {(item.file.size / 1024 / 1024).toFixed(1)}MB
                    </span>
                    {item.status === "pending" && (
                      <span className="text-xs text-gray-500">Ready</span>
                    )}
                    {item.status === "uploading" && (
                      <span className="text-xs text-brand">
                        Uploading...
                      </span>
                    )}
                    {item.status === "confirming" && (
                      <span className="text-xs text-brand">
                        Processing...
                      </span>
                    )}
                    {item.status === "done" && (
                      <span className="text-xs text-green-600">Done</span>
                    )}
                    {item.status === "error" && (
                      <span className="text-xs text-red-600">
                        {item.error}
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  {(item.status === "uploading" ||
                    item.status === "confirming") && (
                    <div className="mt-1 h-1 w-full rounded-full bg-gray-200">
                      <div
                        className="h-1 rounded-full bg-brand transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Actions */}
                {item.status === "pending" && (
                  <button
                    onClick={() => removeUpload(item.id)}
                    className="text-gray-400 hover:text-red-500"
                    title="Remove"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
                {item.status === "error" && (
                  <button
                    onClick={() => retryUpload(item.id)}
                    className="text-brand hover:text-brand-light text-xs font-medium"
                  >
                    Retry
                  </button>
                )}
                {item.status === "done" && (
                  <svg
                    className="h-5 w-5 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Done actions */}
      {doneCount > 0 && pendingCount === 0 && activeCount === 0 && (
        <div className="rounded-lg bg-green-50 p-4 ring-1 ring-green-200">
          <p className="text-sm font-medium text-green-800">
            {doneCount} photo{doneCount > 1 ? "s" : ""} uploaded
            successfully.
          </p>
          <div className="mt-3 flex gap-3">
            <Link
              href={`/turnovers/${turnoverId}`}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              View turnover
            </Link>
            <button
              onClick={() => {
                setUploads([]);
              }}
              className="rounded-md px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
            >
              Upload more
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
