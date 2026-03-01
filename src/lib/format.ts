/** Format a date string (YYYY-MM-DD) for display. */
export function formatDate(
  dateStr: string,
  opts?: { includeYear?: boolean },
): string {
  const date = new Date(dateStr + "T00:00:00Z");
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (opts?.includeYear !== false) options.year = "numeric";
  return date.toLocaleDateString("en-GB", { ...options, timeZone: "UTC" });
}

/** Tailwind classes for turnover status badges. */
export const STATUS_COLOUR: Record<string, string> = {
  open: "bg-status-flag/20 text-status-flag",
  in_progress: "bg-brand-dim text-brand",
  complete: "bg-status-pass/20 text-status-pass",
};

/** Human-readable labels for turnover statuses. */
export const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  complete: "Complete",
};
