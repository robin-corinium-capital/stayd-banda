"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

export function RetentionSection({
  turnoverId,
  completedAt,
  retentionExtended,
}: {
  turnoverId: string;
  completedAt: Date | null;
  retentionExtended: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [extending, setExtending] = useState(false);

  const expiresAt = completedAt
    ? new Date(new Date(completedAt).getTime() + 365 * 24 * 60 * 60 * 1000)
    : null;

  const now = new Date();
  const isInWarningWindow =
    expiresAt &&
    !retentionExtended &&
    expiresAt.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000 &&
    expiresAt.getTime() > now.getTime();

  const daysLeft = expiresAt
    ? Math.max(
        0,
        Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      )
    : 0;

  async function handleExtend() {
    setExtending(true);
    try {
      const res = await fetch(`/api/turnovers/${turnoverId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retention_extended: true }),
      });
      if (!res.ok) {
        toast("Failed to extend retention", "error");
      } else {
        toast("Retention extended");
        router.refresh();
      }
    } catch {
      toast("Something went wrong", "error");
    }
    setExtending(false);
  }

  return (
    <div
      className={`mb-8 rounded-card p-4 ring-1 ${
        isInWarningWindow
          ? "bg-status-flag/10 ring-status-flag/30"
          : retentionExtended
          ? "bg-brand-dim ring-brand/20"
          : "bg-surface-card ring-surface-border"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Retention</h3>
          {retentionExtended ? (
            <p className="mt-1 text-xs text-brand font-medium">
              Retention extended (no expiry)
            </p>
          ) : expiresAt ? (
            <p className="mt-1 text-xs text-gray-600">
              Evidence retained until{" "}
              {expiresAt.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {isInWarningWindow && (
                <span className="ml-1 font-semibold text-status-flag">
                  ({daysLeft} days remaining)
                </span>
              )}
            </p>
          ) : null}
        </div>
        {!retentionExtended && (
          <button
            onClick={handleExtend}
            disabled={extending}
            className={`rounded-btn px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
              isInWarningWindow
                ? "bg-status-flag hover:opacity-90"
                : "bg-brand hover:bg-brand-light"
            }`}
          >
            {extending ? "Extending..." : "Extend retention"}
          </button>
        )}
      </div>
    </div>
  );
}
