import { SkeletonCard } from "@/components/ui/skeleton";

export default function PropertiesLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="animate-pulse">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-10 w-32 rounded bg-gray-200" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}
