import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="animate-pulse">
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-card bg-surface-card p-6 shadow-sm ring-1 ring-surface-border"
            >
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-8 w-16" />
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Skeleton className="h-6 w-40" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-16 w-full rounded-card" />
            <Skeleton className="h-16 w-full rounded-card" />
          </div>
        </div>
      </div>
    </div>
  );
}
