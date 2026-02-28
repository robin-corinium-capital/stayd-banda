import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="bg-surface-card">
      {/* Hero */}
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Document every turnover.
            <br />
            Prove every claim.
          </h1>
          <p className="mt-6 text-lg text-gray-600">
            Free photo evidence tool for holiday let owners and agencies.
          </p>
          <div className="mt-10">
            <Link
              href="/register"
              className="rounded-btn bg-brand px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-brand-light"
            >
              Get started
            </Link>
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div className="border-t border-surface-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="rounded-card bg-surface-card p-8 shadow-sm ring-1 ring-surface-border">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-dim">
                <svg className="h-6 w-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Before and after</h3>
              <p className="mt-2 text-sm text-gray-600">
                Timestamped photo sets for every guest changeover. Compare
                post-checkout and pre-checkin conditions side by side.
              </p>
            </div>

            <div className="rounded-card bg-surface-card p-8 shadow-sm ring-1 ring-surface-border">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-dim">
                <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Evidence that holds up</h3>
              <p className="mt-2 text-sm text-gray-600">
                EXIF metadata, server timestamps, no AI content. Documentation
                that meets Airbnb&apos;s Host Damage Protection requirements.
              </p>
            </div>

            <div className="rounded-card bg-surface-card p-8 shadow-sm ring-1 ring-surface-border">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-mid">
                <svg className="h-6 w-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Built for cleaners</h3>
              <p className="mt-2 text-sm text-gray-600">
                Mobile-first upload interface that works on any phone. No app
                download required. Cleaners snap and upload in seconds.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-surface-border">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <Image
              src="/brand/stayd-horizontal-black.svg"
              alt="stayd"
              width={790}
              height={310}
              className="h-6 w-auto"
            />
            <p className="text-xs text-gray-500">
              Corinium Capital Limited
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
