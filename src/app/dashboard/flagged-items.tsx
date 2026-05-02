"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/format";

type FlaggedPhoto = {
  photoId: string;
  turnoverId: string;
  thumbnailUrl: string | null;
  propertyName: string;
  areaName: string | null;
  checkoutDate: string;
  checkinDate: string;
  damageNote: string | null;
  uploadTimestamp: string | null;
};

export function FlaggedItemsSection() {
  const [items, setItems] = useState<FlaggedPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard/flagged");
        if (res.ok) {
          const data = await res.json();
          setItems(data.flaggedPhotos || []);
        }
      } catch {
        // Non-fatal
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Flagged Items</h2>
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-card bg-surface-card p-4 shadow-sm ring-1 ring-surface-border">
              <div className="flex gap-4">
                <div className="h-16 w-16 shrink-0 rounded bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-gray-200" />
                  <div className="h-3 w-1/2 rounded bg-gray-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Flagged Items</h2>
        <div className="rounded-card bg-surface-card p-8 text-center shadow-sm ring-1 ring-surface-border">
          <svg className="mx-auto h-10 w-10 text-status-pass" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No damage flags — looking good!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Recent Flagged Items</h2>
        <Link href="/turnovers?has_damage=true" className="text-sm text-brand hover:text-brand-light">
          View all →
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.photoId}
            href={`/turnovers/${item.turnoverId}`}
            className="flex gap-3 rounded-card bg-surface-card p-3 shadow-sm ring-1 ring-surface-border hover:ring-brand/30 transition-all"
          >
            {/* Thumbnail */}
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-status-critical/30">
              {item.thumbnailUrl ? (
                <img src={item.thumbnailUrl} alt="Flagged" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <svg className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                  </svg>
                </div>
              )}
            </div>
            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">{item.propertyName}</p>
              <p className="text-xs text-gray-500">{item.areaName || "General"}</p>
              <p className="text-xs text-gray-500">
                {formatDate(item.checkoutDate, { includeYear: false })} → {formatDate(item.checkinDate, { includeYear: false })}
              </p>
              {item.damageNote && (
                <p className="mt-1 truncate text-xs text-status-critical">
                  {item.damageNote}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

