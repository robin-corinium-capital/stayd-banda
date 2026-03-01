import { Skeleton, SkeletonRow } from "@/components/ui/skeleton";

export default function TurnoversLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="animate-pulse">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-10 w-36 rounded bg-gray-200" />
        </div>
        <div className="mb-4 flex gap-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="rounded-card bg-surface-card shadow-sm ring-1 ring-surface-border divide-y divide-surface-border">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    </div>
  );
}
