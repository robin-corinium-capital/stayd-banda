import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-surface-border bg-surface-card">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-6">
            <Image
              src="/brand/stayd-horizontal-black.svg"
              alt="stayd"
              width={790}
              height={310}
              className="h-5 w-auto"
            />
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
          <p className="text-xs text-gray-500">Corinium Capital Limited</p>
        </div>
      </div>
    </footer>
  );
}
