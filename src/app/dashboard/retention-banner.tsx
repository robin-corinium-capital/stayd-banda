import Link from "next/link";

interface ExpiringTurnover {
  id: string;
  propertyName: string;
  checkoutDate: string;
  completedAt: Date | null;
}

export function RetentionBanner({
  turnovers,
}: {
  turnovers: ExpiringTurnover[];
}) {
  return (
    <div className="mb-6 rounded-card bg-status-flag/10 p-4 ring-1 ring-status-flag/30">
      <div className="flex items-start gap-3">
        <svg
          className="mt-0.5 h-5 w-5 shrink-0 text-status-flag"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800">
            {turnovers.length} turnover{turnovers.length !== 1 ? "s" : ""} will
            be deleted soon
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Download evidence packs before deletion.
          </p>
          <ul className="mt-2 space-y-1">
            {turnovers.map((t) => {
              const expiresAt = t.completedAt
                ? new Date(
                    new Date(t.completedAt).getTime() +
                      365 * 24 * 60 * 60 * 1000
                  )
                : null;
              const daysLeft = expiresAt
                ? Math.max(
                    0,
                    Math.ceil(
                      (expiresAt.getTime() - Date.now()) /
                        (24 * 60 * 60 * 1000)
                    )
                  )
                : 0;

              return (
                <li key={t.id}>
                  <Link
                    href={`/turnovers/${t.id}`}
                    className="text-xs font-medium text-amber-800 underline hover:text-amber-900"
                  >
                    {t.propertyName} ({t.checkoutDate}) &mdash; {daysLeft} days
                    remaining
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
