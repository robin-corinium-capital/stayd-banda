"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

type Turnover = {
  id: string;
  checkoutDate: string;
  checkinDate: string;
  status: string | null;
  propertyName: string;
  propertyId: string;
};

export default function UploadPage() {
  const router = useRouter();
  const [turnovers, setTurnovers] = useState<Turnover[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTurnovers() {
      try {
        const res = await fetch("/api/turnovers?status=open&status=in_progress");
        if (res.ok) {
          const data = await res.json();
          setTurnovers(
            data.filter(
              (t: Turnover) =>
                t.status === "open" || t.status === "in_progress"
            )
          );
        }
      } catch {
        // Non-fatal
      }
      setLoading(false);
    }
    loadTurnovers();
  }, []);

  // If only one active turnover, go straight to it
  useEffect(() => {
    if (!loading && turnovers.length === 1) {
      router.replace(
        `/upload/${turnovers[0].propertyId}/${turnovers[0].id}`
      );
    }
  }, [loading, turnovers, router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  // Group turnovers by property
  const byProperty = new Map<string, { name: string; turnovers: Turnover[] }>();
  for (const t of turnovers) {
    if (!byProperty.has(t.propertyId)) {
      byProperty.set(t.propertyId, { name: t.propertyName, turnovers: [] });
    }
    byProperty.get(t.propertyId)!.turnovers.push(t);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Upload photos</h1>
        <p className="mt-1 text-sm text-gray-600">
          Select a property and turnover to start uploading.
        </p>
      </div>

      {turnovers.length === 0 ? (
        <div className="rounded-card bg-surface-card p-12 text-center shadow-sm ring-1 ring-surface-border">
          <p className="text-sm text-gray-500">
            No open turnovers available.
          </p>
          <Link
            href="/turnovers/new"
            className="mt-3 inline-block text-sm font-medium text-brand hover:text-brand-light"
          >
            Create a turnover
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(byProperty.entries()).map(
            ([propertyId, { name, turnovers: propTurnovers }]) => (
              <div
                key={propertyId}
                className="rounded-card bg-surface-card shadow-sm ring-1 ring-surface-border"
              >
                <div className="border-b border-gray-100 px-4 py-3">
                  <h2 className="text-sm font-semibold text-gray-900">
                    {name}
                  </h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {propTurnovers.map((t) => (
                    <Link
                      key={t.id}
                      href={`/upload/${propertyId}/${t.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                    >
                      <div>
                        <p className="text-sm text-gray-700">
                          {formatDate(t.checkoutDate)} &rarr;{" "}
                          {formatDate(t.checkinDate)}
                        </p>
                        <span
                          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            t.status === "open"
                              ? "bg-status-flag/20 text-status-flag"
                              : "bg-brand-dim text-brand"
                          }`}
                        >
                          {t.status === "open" ? "Open" : "In progress"}
                        </span>
                      </div>
                      <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Link>
                  ))}
                </div>
                <div className="border-t border-gray-100 px-4 py-2">
                  <Link
                    href="/turnovers/new"
                    className="text-xs font-medium text-brand hover:text-brand-light"
                  >
                    + Start new turnover
                  </Link>
                </div>
              </div>
            )
          )}
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
  });
}
