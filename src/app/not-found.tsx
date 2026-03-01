import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-card bg-surface-card p-8 text-center shadow-sm ring-1 ring-surface-border">
        <h2 className="text-lg font-semibold text-gray-900">Page not found</h2>
        <p className="mt-2 text-sm text-gray-600">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-btn bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
