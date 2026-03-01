"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export function Nav() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <nav className="border-b border-surface-border bg-surface-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href={session ? "/dashboard" : "/"} className="flex items-center">
            <Image
              src="/brand/stayd-horizontal-black.svg"
              alt="stayd"
              width={790}
              height={310}
              className="h-8 w-auto"
              priority
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex md:items-center md:gap-6">
            {session ? (
              <>
                <Link href="/dashboard" data-tour="dashboard" className="text-sm text-gray-600 hover:text-gray-900">
                  Dashboard
                </Link>
                <Link href="/properties" data-tour="properties" className="text-sm text-gray-600 hover:text-gray-900">
                  Properties
                </Link>
                <Link href="/turnovers" data-tour="turnovers" className="text-sm text-gray-600 hover:text-gray-900">
                  Turnovers
                </Link>
                <Link href="/help" data-tour="help" className="text-sm text-gray-600 hover:text-gray-900">
                  Help
                </Link>
                {session.user.role === "cleaner" && (
                  <Link href="/upload" className="text-sm text-gray-600 hover:text-gray-900">
                    Upload
                  </Link>
                )}

                {/* User dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white text-xs font-medium">
                      {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase()}
                    </div>
                    <span>{session.user.name || session.user.email}</span>
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-btn bg-surface-card py-1 shadow-lg ring-1 ring-black/5 z-50">
                      <Link
                        href="/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-surface"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Settings
                      </Link>
                      <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-surface"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
                  Login
                </Link>
                <Link
                  href="/register"
                  className="rounded-btn bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-t border-surface-border pb-4 md:hidden">
            {session ? (
              <div className="space-y-1 pt-2">
                <Link href="/dashboard" className="block px-3 py-3 text-base text-gray-600 hover:bg-surface min-h-[44px]" onClick={() => setMobileOpen(false)}>
                  Dashboard
                </Link>
                <Link href="/properties" className="block px-3 py-3 text-base text-gray-600 hover:bg-surface min-h-[44px]" onClick={() => setMobileOpen(false)}>
                  Properties
                </Link>
                <Link href="/turnovers" className="block px-3 py-3 text-base text-gray-600 hover:bg-surface min-h-[44px]" onClick={() => setMobileOpen(false)}>
                  Turnovers
                </Link>
                <Link href="/help" className="block px-3 py-3 text-base text-gray-600 hover:bg-surface min-h-[44px]" onClick={() => setMobileOpen(false)}>
                  Help
                </Link>
                {session.user.role === "cleaner" && (
                  <Link href="/upload" className="block px-3 py-3 text-base text-gray-600 hover:bg-surface min-h-[44px]" onClick={() => setMobileOpen(false)}>
                    Upload
                  </Link>
                )}
                <Link href="/settings" className="block px-3 py-3 text-base text-gray-600 hover:bg-surface min-h-[44px]" onClick={() => setMobileOpen(false)}>
                  Settings
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="block w-full px-3 py-3 text-left text-base text-gray-600 hover:bg-surface min-h-[44px]"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="space-y-1 pt-2">
                <Link href="/login" className="block px-3 py-3 text-base text-gray-600 hover:bg-surface min-h-[44px]" onClick={() => setMobileOpen(false)}>
                  Login
                </Link>
                <Link href="/register" className="block px-3 py-3 text-base text-gray-600 hover:bg-surface min-h-[44px]" onClick={() => setMobileOpen(false)}>
                  Register
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
