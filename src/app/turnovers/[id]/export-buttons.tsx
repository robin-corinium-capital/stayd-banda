"use client";

import { useState, useCallback } from "react";

interface ExportButtonsProps {
  turnoverId: string;
  propertyName: string;
  checkoutDate: string;
  checkinDate: string;
  hasPhotos: boolean;
  hasFlaggedPhotos: boolean;
}

export function ExportButtons({
  turnoverId,
  propertyName,
  checkoutDate,
  checkinDate,
  hasPhotos,
  hasFlaggedPhotos,
}: ExportButtonsProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadFile = useCallback(
    async (url: string, filename: string, type: string) => {
      if (downloading) return;
      setDownloading(type);

      try {
        const response = await fetch(url);

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error || "Download failed");
        }

        const blob = await response.blob();
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      } catch (err) {
        alert(
          err instanceof Error ? err.message : "Download failed. Please try again."
        );
      } finally {
        setDownloading(null);
      }
    },
    [downloading]
  );

  const propSlug = propertyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return (
    <>
      {/* Download all photos ZIP */}
      <button
        disabled={!hasPhotos || downloading !== null}
        onClick={() =>
          downloadFile(
            `/api/export/turnover/${turnoverId}`,
            `turnover_${checkoutDate}_to_${checkinDate}_${propSlug}.zip`,
            "zip"
          )
        }
        className={`rounded-btn border px-4 py-2 text-sm font-medium ${
          !hasPhotos || downloading !== null
            ? "border-gray-300 text-gray-400 cursor-not-allowed"
            : "border-gray-300 text-gray-700 hover:bg-gray-50"
        }`}
      >
        {downloading === "zip" ? (
          <span className="flex items-center gap-2">
            <Spinner />
            Generating...
          </span>
        ) : (
          "Download ZIP"
        )}
      </button>

      {/* Download flagged only */}
      {hasFlaggedPhotos && (
        <button
          disabled={downloading !== null}
          onClick={() =>
            downloadFile(
              `/api/export/turnover/${turnoverId}?flagged_only=true`,
              `turnover_${checkoutDate}_to_${checkinDate}_${propSlug}_flagged.zip`,
              "flagged"
            )
          }
          className={`rounded-btn border px-4 py-2 text-sm font-medium ${
            downloading !== null
              ? "border-gray-300 text-gray-400 cursor-not-allowed"
              : "border-red-300 text-red-700 hover:bg-red-50"
          }`}
        >
          {downloading === "flagged" ? (
            <span className="flex items-center gap-2">
              <Spinner />
              Generating...
            </span>
          ) : (
            "Download flagged"
          )}
        </button>
      )}

      {/* Download PDF report */}
      <button
        disabled={!hasPhotos || downloading !== null}
        onClick={() =>
          downloadFile(
            `/api/export/turnover/${turnoverId}/report`,
            `evidence_report_${propSlug}_${checkoutDate}.pdf`,
            "report"
          )
        }
        className={`rounded-btn border px-4 py-2 text-sm font-medium ${
          !hasPhotos || downloading !== null
            ? "border-gray-300 text-gray-400 cursor-not-allowed"
            : "border-gray-300 text-gray-700 hover:bg-gray-50"
        }`}
      >
        {downloading === "report" ? (
          <span className="flex items-center gap-2">
            <Spinner />
            Generating...
          </span>
        ) : (
          "Download report"
        )}
      </button>
    </>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-current"
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
  );
}
