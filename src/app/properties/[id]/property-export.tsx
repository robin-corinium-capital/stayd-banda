"use client";

import { useState, useCallback } from "react";

interface PropertyExportProps {
  propertyId: string;
  propertyName: string;
}

export function PropertyExport({
  propertyId,
  propertyName,
}: PropertyExportProps) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [downloading, setDownloading] = useState(false);

  const propSlug = propertyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const handleDownload = useCallback(async () => {
    if (!from || !to || downloading) return;

    setDownloading(true);
    try {
      const url = `/api/export/property/${propertyId}?from=${from}&to=${to}`;
      const response = await fetch(url);

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Download failed");
      }

      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${propSlug}_${from}_to_${to}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Download failed. Please try again."
      );
    } finally {
      setDownloading(false);
    }
  }, [from, to, downloading, propertyId, propSlug]);

  return (
    <div className="rounded-card bg-surface-card p-6 shadow-sm ring-1 ring-surface-border">
      <h3 className="text-sm font-medium text-gray-500">Export</h3>
      <p className="mt-1 text-xs text-gray-400">
        Download all turnover photos in a date range
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <label
            htmlFor="export-from"
            className="block text-xs font-medium text-gray-600"
          >
            From
          </label>
          <input
            id="export-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block w-full rounded-btn border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div>
          <label
            htmlFor="export-to"
            className="block text-xs font-medium text-gray-600"
          >
            To
          </label>
          <input
            id="export-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block w-full rounded-btn border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <button
          disabled={!from || !to || downloading}
          onClick={handleDownload}
          className={`w-full rounded-btn px-4 py-2 text-sm font-medium ${
            !from || !to || downloading
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-brand text-white hover:bg-brand-light"
          }`}
        >
          {downloading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Generating...
            </span>
          ) : (
            "Download all turnovers"
          )}
        </button>
        <p className="text-xs text-gray-400">
          Large date ranges may take a while to generate.
        </p>
      </div>
    </div>
  );
}
