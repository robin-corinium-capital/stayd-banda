export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-gray-200 ${className || ""}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-card bg-surface-card p-6 shadow-sm ring-1 ring-surface-border">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="mt-3 h-4 w-1/2" />
      <Skeleton className="mt-2 h-4 w-1/3" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
  );
}
