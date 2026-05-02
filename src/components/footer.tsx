import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-surface-border bg-surface-card">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* About Us */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">About Us</h3>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              Short stays reimagined. stayd is building a vertically integrated
              UK short stay rentals platform. We optimise revenue for owners and
              agencies, provide an AI operating system for holiday letting and
              short stay management, and we acquire agencies from founders who
              want to pass their business to a safe and respectful pair of hands.
            </p>
            <a
              href="https://www.stayd.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs text-brand hover:text-brand-light"
            >
              Learn more at stayd.uk &rarr;
            </a>
          </div>

          {/* Links and branding */}
          <div className="flex flex-col items-start gap-4 md:items-end md:justify-between">
            <a
              href="https://www.stayd.uk"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/brand/stayd-horizontal-black.svg"
                alt="stayd"
                width={790}
                height={310}
                className="h-5 w-auto"
              />
            </a>
            <div className="flex items-center gap-6">
              <Link href="/terms" className="text-xs text-gray-500 hover:text-gray-700">
                Terms of Use
              </Link>
              <Link href="/privacy" className="text-xs text-gray-500 hover:text-gray-700">
                Privacy
              </Link>
              <Link href="/help" className="text-xs text-gray-500 hover:text-gray-700">
                Help
              </Link>
            </div>
            <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} stayd</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
