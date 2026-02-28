"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export function Nav() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href={session ? "/dashboard" : "/"} className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-gray-900">banda</span>
            <span className="text-xs text-gray-500">by stayd</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex md:items-center md:gap-6">
            {session ? (
              <>
                <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
                  Dashboard
                </Link>
                <Link href="/properties" className="text-sm text-gray-600 hover:text-gray-900">
                  Properties
                </Link>
                <Link href="/turnovers" className="text-sm text-gray-600 hover:text-gray-900">
                  Turnovers
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
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-medium">
                      {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase()}
                    </div>
                    <span>{session.user.name || session.user.email}</span>
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 z-50">
                      <Link
                        href="/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Settings
                      </Link>
                      <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
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
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
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
          <div className="border-t border-gray-200 pb-4 md:hidden">
            {session ? (
              <div className="space-y-1 pt-2">
                <Link href="/dashboard" className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>
                  Dashboard
                </Link>
                <Link href="/properties" className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>
                  Properties
                </Link>
                <Link href="/turnovers" className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>
                  Turnovers
                </Link>
                {session.user.role === "cleaner" && (
                  <Link href="/upload" className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>
                    Upload
                  </Link>
                )}
                <Link href="/settings" className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>
                  Settings
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="block w-full px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="space-y-1 pt-2">
                <Link href="/login" className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>
                  Login
                </Link>
                <Link href="/register" className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>
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
