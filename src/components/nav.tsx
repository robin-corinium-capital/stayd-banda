"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";

export function Nav() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

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
                {[
                  { href: "/dashboard", label: "Dashboard", tour: "dashboard" },
                  { href: "/properties", label: "Properties", tour: "properties" },
                  { href: "/turnovers", label: "Turnovers", tour: "turnovers" },
                  { href: "/help", label: "Help", tour: "help" },
                  ...(session.user.role === "cleaner"
                    ? [{ href: "/upload", label: "Upload", tour: undefined }]
                    : []),
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    data-tour={link.tour}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    {link.label}
                  </Link>
                ))}

                {/* User dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    aria-expanded={dropdownOpen}
                    aria-haspopup="true"
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
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
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
                {[
                  { href: "/dashboard", label: "Dashboard" },
                  { href: "/properties", label: "Properties" },
                  { href: "/turnovers", label: "Turnovers" },
                  { href: "/help", label: "Help" },
                  ...(session.user.role === "cleaner"
                    ? [{ href: "/upload", label: "Upload" }]
                    : []),
                  { href: "/settings", label: "Settings" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block px-3 py-3 text-base text-gray-600 hover:bg-surface min-h-[44px]"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
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
