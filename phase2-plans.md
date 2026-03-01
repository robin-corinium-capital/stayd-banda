# Phase 2 Plans — Post-Launch Polish & Support

## Context

banda (stayd-banda) is a turnover photo documentation tool for UK holiday let owners. Phases 1-5 (core features) and Phase 6 (initial polish) are complete. This plan covers 10 remaining post-launch tasks: user support content, onboarding UX, auth flows, GDPR compliance, and resilience. Each section is a self-contained build instruction with full implementation code, designed to be fed to a Claude Code sub-agent one at a time.

**Reorder:** User requested guide + tooltips first, then auth flows, then legal, then polish.

---

## 1. How-To / Support Guide

**Goal:** Create an in-app help page at `/help` with step-by-step guidance for the core workflow.

### Files to create

**`src/app/help/page.tsx`** — Server component, static content. Follow `src/app/terms/page.tsx` pattern exactly.

```tsx
import Link from "next/link";

export const metadata = {
  title: "Help — banda",
};

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-card bg-surface-card p-8 shadow-sm ring-1 ring-surface-border sm:p-12">
        <h1 className="text-3xl font-bold text-gray-900">How to use banda</h1>
        <p className="mt-2 text-sm text-gray-500">
          A step-by-step guide to documenting turnovers and building evidence packs.
        </p>

        <div className="mt-8 space-y-10 text-sm leading-relaxed text-gray-700">
          {/* Section 1: Getting Started */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">1. Getting Started</h2>
            <div className="mt-3 space-y-3">
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Create a property</h3>
                <p className="mt-1">
                  Go to <strong>Properties</strong> and click <strong>Add property</strong>.
                  Enter the property name, address, number of bedrooms, and type (house, flat, etc.).
                </p>
              </div>
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Set up areas</h3>
                <p className="mt-1">
                  Open your property and go to <strong>Manage areas</strong>. Add areas like
                  Kitchen, Bedroom 1, Bathroom, Living Room, Garden. These help organise photos
                  by room. You can drag to reorder them.
                </p>
              </div>
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Invite your team</h3>
                <p className="mt-1">
                  Go to <strong>Settings &rarr; Manage team &rarr; Create invite</strong>.
                  Send the invite link to your cleaners. They&apos;ll be able to upload photos
                  for assigned properties.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Running a Turnover */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">2. Running a Turnover</h2>
            <div className="mt-3 space-y-3">
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Create a turnover</h3>
                <p className="mt-1">
                  Go to <strong>Turnovers &rarr; New turnover</strong>. Select the property,
                  enter the checkout and check-in dates, and optionally add guest references
                  (e.g. Airbnb booking ID).
                </p>
              </div>
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Upload post-checkout photos</h3>
                <p className="mt-1">
                  After the guest leaves, open the turnover and upload photos of the property
                  condition. Select <strong>Post-checkout</strong> as the photo set, choose the
                  area for each photo, and flag any damage you find.
                </p>
              </div>
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Upload pre-check-in photos</h3>
                <p className="mt-1">
                  After cleaning, upload a second set of photos showing the property is ready.
                  Select <strong>Pre-check-in</strong> as the photo set. This proves the
                  property was cleaned and any damage was pre-existing.
                </p>
              </div>
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Flag damage</h3>
                <p className="mt-1">
                  When uploading or viewing photos, toggle the <strong>damage flag</strong> on
                  any photo that shows damage. Add a note describing what you see. Flagged
                  photos are highlighted in exports and easy to filter.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Exporting Evidence */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">3. Exporting Evidence</h2>
            <div className="mt-3 space-y-3">
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Download a ZIP</h3>
                <p className="mt-1">
                  On the turnover detail page, click <strong>Download ZIP</strong>. Photos are
                  organised into folders by photo set and area. Use this to keep a local backup
                  or share with your letting agent.
                </p>
              </div>
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Generate a PDF report</h3>
                <p className="mt-1">
                  Click <strong>Download PDF</strong> on the turnover detail page. The report
                  includes all photos with timestamps, EXIF metadata, and damage flags. This
                  is formatted for Airbnb&apos;s Resolution Centre.
                </p>
              </div>
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Bulk export</h3>
                <p className="mt-1">
                  On the property detail page, click <strong>Export all turnovers</strong> to
                  download every turnover for that property as a single ZIP file.
                </p>
              </div>
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Flagged-only export</h3>
                <p className="mt-1">
                  When downloading a ZIP or PDF, tick <strong>Flagged only</strong> to include
                  just the damage-flagged photos. Useful for submitting focused damage claims.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Team Management */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">4. Managing Your Team</h2>
            <div className="mt-3 space-y-3">
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Invite cleaners</h3>
                <p className="mt-1">
                  Go to <strong>Settings &rarr; Manage team</strong> and create an invite.
                  Choose the role (cleaner) and assign specific properties. Send the invite
                  link — it expires after 7 days.
                </p>
              </div>
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Assign properties</h3>
                <p className="mt-1">
                  Cleaners can only see and upload to properties they&apos;re assigned to.
                  Assign properties when creating the invite, or update assignments later
                  from the property settings.
                </p>
              </div>
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Remove access</h3>
                <p className="mt-1">
                  To revoke a team member&apos;s access, go to <strong>Settings &rarr;
                  Manage team</strong> and click <strong>Remove</strong> next to their name.
                  Pending invites can also be revoked.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5: Data & Retention */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">5. Data &amp; Retention</h2>
            <div className="mt-3 space-y-3">
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">12-month retention</h3>
                <p className="mt-1">
                  Photos and turnover data are retained for 12 months from the date the
                  turnover is marked as complete. This aligns with Airbnb&apos;s damage
                  claim window.
                </p>
              </div>
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Expiry warnings</h3>
                <p className="mt-1">
                  You&apos;ll receive an email 30 days before any turnover data is due for
                  deletion. The email includes links to download the evidence pack or extend
                  retention.
                </p>
              </div>
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Extend retention</h3>
                <p className="mt-1">
                  If you have an ongoing claim, you can extend retention from the turnover
                  detail page. Extended turnovers are excluded from automatic deletion.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: FAQ */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">6. Frequently Asked Questions</h2>
            <dl className="mt-3 space-y-4">
              <div>
                <dt className="font-medium text-gray-900">What photo formats are supported?</dt>
                <dd className="mt-1">JPEG, PNG, and HEIC (iPhone). Maximum file size is 20MB per photo. HEIC files are automatically converted to JPEG.</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900">Is my data stored in the UK/EU?</dt>
                <dd className="mt-1">Yes. Photos are stored on Cloudflare R2 (EU region) and database records on Vercel Postgres (Frankfurt, EU). All data stays within EU/UK jurisdiction.</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900">Can I use this on my phone?</dt>
                <dd className="mt-1">Yes. The upload page is optimised for mobile. Open it in your phone&apos;s browser — you can take photos directly or select from your camera roll.</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900">How do I submit a damage claim?</dt>
                <dd className="mt-1">
                  Generate a PDF report from the turnover detail page and upload it to{" "}
                  <a href="https://www.airbnb.co.uk/resolutions" target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-light underline">
                    Airbnb&apos;s Resolution Centre
                  </a>
                  . The report includes timestamped photos with EXIF data as supporting evidence.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900">What does EXIF data show?</dt>
                <dd className="mt-1">EXIF metadata is embedded by your camera and includes the date/time the photo was taken, GPS coordinates (if location services are enabled), and device model. This proves when and where the photo was captured.</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900">Is there a cost?</dt>
                <dd className="mt-1">banda is currently free to use.</dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="mt-10 border-t border-surface-border pt-6">
          <Link href="/dashboard" className="text-sm text-brand hover:text-brand-light">
            &larr; Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
```

### Files to edit

**`src/components/nav.tsx`** — Add "Help" link for authenticated users.

In the desktop nav section, after the Turnovers link (line ~39) and before the role-conditional Upload link, add:
```tsx
<Link href="/help" className="text-sm text-gray-600 hover:text-gray-900">
  Help
</Link>
```

In the mobile menu section, after the Turnovers link (line ~119) and before the role-conditional Upload link, add:
```tsx
<Link href="/help" className="block px-3 py-3 text-base text-gray-600 hover:bg-surface min-h-[44px]" onClick={() => setMobileOpen(false)}>
  Help
</Link>
```

**`src/components/footer.tsx`** — Add "Help" link next to Terms of Use.

After the existing Terms of Use `<Link>` (line 17-19), add:
```tsx
<Link href="/help" className="text-xs text-gray-500 hover:text-gray-700">
  Help
</Link>
```

### Verification
- `npm run build` should pass with the new page
- Navigate to `/help` — page renders with all 6 sections
- Nav shows "Help" link on desktop and mobile when logged in
- Footer shows "Help" link
- All internal links work (resolution centre link opens in new tab)

---

## 2. First-Login Onboarding Tooltips

**Goal:** Show a lightweight 4-step tooltip tour on first login. No external libraries. State stored in localStorage.

### Files to create

**`src/components/onboarding-tour.tsx`** — Client component.

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";

interface TourStep {
  target: string;
  title: string;
  description: string;
}

const STEPS: TourStep[] = [
  {
    target: "[data-tour='dashboard']",
    title: "Your Dashboard",
    description: "See your properties, turnovers, and flagged items at a glance.",
  },
  {
    target: "[data-tour='properties']",
    title: "Properties",
    description: "Add and manage your holiday let properties here.",
  },
  {
    target: "[data-tour='turnovers']",
    title: "Turnovers",
    description: "Create turnovers to start documenting guest changeovers with photos.",
  },
  {
    target: "[data-tour='help']",
    title: "Need Help?",
    description: "Find step-by-step guides, FAQs, and tips on exporting evidence.",
  },
];

const STORAGE_KEY = "banda-onboarding-complete";

export function OnboardingTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    arrowSide: "top" | "bottom";
  }>({ top: 0, left: 0, arrowSide: "top" });

  useEffect(() => {
    // Don't show if already completed
    if (localStorage.getItem(STORAGE_KEY)) return;
    // Small delay so DOM is ready
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const updatePosition = useCallback(() => {
    if (!isVisible) return;
    const step = STEPS[currentStep];
    const el = document.querySelector(step.target);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const tooltipHeight = 160;
    const tooltipWidth = 320;
    const gap = 12;

    // Determine if tooltip should go above or below
    const spaceBelow = window.innerHeight - rect.bottom;
    const showBelow = spaceBelow > tooltipHeight + gap;

    const top = showBelow
      ? rect.bottom + gap + window.scrollY
      : rect.top - tooltipHeight - gap + window.scrollY;

    // Center horizontally on the target, but clamp to viewport
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));

    setPosition({
      top,
      left,
      arrowSide: showBelow ? "top" : "bottom",
    });
  }, [currentStep, isVisible]);

  useEffect(() => {
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [updatePosition]);

  const complete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsVisible(false);
  }, []);

  const next = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      complete();
    }
  }, [currentStep, complete]);

  if (!isVisible) return null;

  const step = STEPS[currentStep];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/15"
        onClick={complete}
      />

      {/* Tooltip */}
      <div
        className="fixed z-50 w-80 rounded-card bg-surface-card p-5 shadow-xl ring-1 ring-surface-border"
        style={{ top: position.top, left: position.left }}
      >
        {/* Step indicator */}
        <div className="mb-3 flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i <= currentStep ? "bg-brand" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        <h3 className="text-sm font-semibold text-gray-900">{step.title}</h3>
        <p className="mt-1 text-sm text-gray-600">{step.description}</p>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={complete}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Skip tour
          </button>
          <button
            onClick={next}
            className="rounded-btn bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-light"
          >
            {currentStep < STEPS.length - 1 ? "Next" : "Done"}
          </button>
        </div>
      </div>
    </>
  );
}
```

### Files to edit

**`src/components/nav.tsx`** — Add `data-tour` attributes to nav links for targeting.

Edit the desktop nav links (lines 33-41). Add `data-tour` attributes:
```tsx
<Link href="/dashboard" data-tour="dashboard" className="text-sm text-gray-600 hover:text-gray-900">
  Dashboard
</Link>
<Link href="/properties" data-tour="properties" className="text-sm text-gray-600 hover:text-gray-900">
  Properties
</Link>
<Link href="/turnovers" data-tour="turnovers" className="text-sm text-gray-600 hover:text-gray-900">
  Turnovers
</Link>
```

The Help link added in task 1 should get `data-tour="help"`:
```tsx
<Link href="/help" data-tour="help" className="text-sm text-gray-600 hover:text-gray-900">
  Help
</Link>
```

**`src/app/layout.tsx`** — Mount the tour for authenticated users.

Add import at the top:
```tsx
import { OnboardingTour } from "@/components/onboarding-tour";
```

Add `<OnboardingTour />` inside the providers, after `<Nav />`:
```tsx
<Nav />
<OnboardingTour />
<main className="min-h-[calc(100vh-8rem)]">{children}</main>
```

Note: Since `OnboardingTour` is a client component with its own `useEffect` guard (localStorage check), it can be rendered unconditionally in the layout. It self-hides when not needed or when the user isn't on a page with tour targets.

### Verification
- Clear localStorage (`localStorage.removeItem("banda-onboarding-complete")`) and refresh
- Tour should appear with step 1 highlighting Dashboard
- "Next" advances through all 4 steps
- "Skip tour" dismisses and sets localStorage
- Refreshing after completion does NOT show tour again
- Tour positions correctly on mobile (test at 375px width)
- Clicking backdrop dismisses tour

---

## 3. Password Reset Flow

**Goal:** Let users reset a forgotten password via a 1-hour email link.

### Database changes

**`src/db/schema.ts`** — Add `passwordResetTokens` table after the `invites` table and its relations:

```typescript
// ── Password Reset Tokens ─────────────────────────────────────────────────

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const passwordResetTokensRelations = relations(
  passwordResetTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [passwordResetTokens.userId],
      references: [users.id],
    }),
  })
);
```

Run migration after adding: `npx drizzle-kit push`

### Files to create

**`src/app/api/auth/forgot-password/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendEmail, passwordResetEmailHtml } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Always return 200 to prevent email enumeration
    const successResponse = NextResponse.json({
      message: "If that email is registered, you'll receive a reset link.",
    });

    // Look up user
    const [user] = await db
      .select({ id: schema.users.id, passwordHash: schema.users.passwordHash })
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase().trim()))
      .limit(1);

    // No user found, or Google-only account (no password)
    if (!user || !user.passwordHash) {
      return successResponse;
    }

    // Generate token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(schema.passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt,
    });

    // Send email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://banda.stayd-tools.com";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    await sendEmail({
      to: email,
      subject: "Reset your password — banda",
      html: passwordResetEmailHtml(resetUrl),
    });

    return successResponse;
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
```

**`src/app/api/auth/reset-password/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq, and, isNull, gt } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Find valid token
    const [resetToken] = await db
      .select()
      .from(schema.passwordResetTokens)
      .where(
        and(
          eq(schema.passwordResetTokens.token, token),
          isNull(schema.passwordResetTokens.usedAt),
          gt(schema.passwordResetTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset link. Please request a new one." },
        { status: 400 }
      );
    }

    // Hash new password and update user
    const hash = await bcrypt.hash(password, 12);

    await db
      .update(schema.users)
      .set({ passwordHash: hash })
      .where(eq(schema.users.id, resetToken.userId));

    // Mark token as used
    await db
      .update(schema.passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(schema.passwordResetTokens.id, resetToken.id));

    return NextResponse.json({
      message: "Password updated. You can now sign in.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
```

**`src/app/forgot-password/page.tsx`** — Client component.

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Reset your password</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <div className="rounded-card bg-surface-card p-8 shadow-sm ring-1 ring-surface-border">
          {submitted ? (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mt-4 text-sm font-medium text-gray-900">Check your email</h3>
              <p className="mt-2 text-sm text-gray-600">
                If that email is registered, you&apos;ll receive a reset link shortly.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-block text-sm font-medium text-brand hover:text-brand-light"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-btn bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}

          {!submitted && (
            <p className="mt-6 text-center text-sm text-gray-600">
              Remember your password?{" "}
              <Link href="/login" className="font-medium text-brand hover:text-brand-light">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

**`src/app/reset-password/page.tsx`** — Client component with `useSearchParams`.

```tsx
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  if (!token) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-card bg-surface-card p-8 text-center shadow-sm ring-1 ring-surface-border">
          <h2 className="text-lg font-semibold text-gray-900">Invalid reset link</h2>
          <p className="mt-2 text-sm text-gray-600">
            This link is missing a reset token.
          </p>
          <Link
            href="/forgot-password"
            className="mt-4 inline-block text-sm font-medium text-brand hover:text-brand-light"
          >
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Set new password</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your new password below.
          </p>
        </div>

        <div className="rounded-card bg-surface-card p-8 shadow-sm ring-1 ring-surface-border">
          {success ? (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mt-4 text-sm font-medium text-gray-900">Password updated</h3>
              <p className="mt-2 text-sm text-gray-600">
                Your password has been changed. You can now sign in.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-block rounded-btn bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-light"
              >
                Sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoFocus
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
              </div>

              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">
                  Confirm new password
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-btn bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
```

### Files to edit

**`src/app/login/page.tsx`** — Add "Forgot password?" link below the password input (after line 113, after the password `</div>`):

```tsx
<div className="text-right">
  <Link href="/forgot-password" className="text-xs text-brand hover:text-brand-light">
    Forgot password?
  </Link>
</div>
```

### Tests to create

**`src/app/api/auth/__tests__/forgot-password.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

const mockSendEmail = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock("@/db", () => ({ db: mockDb }));
vi.mock("@/db/schema", () => {
  const t = (name: string) => ({ name });
  return {
    users: { id: t("id"), email: t("email"), passwordHash: t("password_hash") },
    passwordResetTokens: { userId: t("user_id"), token: t("token"), expiresAt: t("expires_at") },
  };
});
vi.mock("@/lib/email", () => ({
  sendEmail: mockSendEmail,
  passwordResetEmailHtml: (url: string) => `<a href="${url}">Reset</a>`,
}));

import { POST } from "../forgot-password/route";
import { NextRequest } from "next/server";

function makeReq(body: Record<string, unknown>) {
  return new NextRequest(new URL("http://localhost:3000/api/auth/forgot-password"), {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function chainable(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "from", "where", "limit"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(resolvedValue);
  (chain as Record<string, unknown>)[Symbol.toStringTag] = "Promise";
  return chain;
}

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 400 when email missing", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("returns 200 when email not found (no enumeration)", async () => {
    mockDb.select.mockReturnValue(chainable([]));

    const res = await POST(makeReq({ email: "nobody@test.com" }));
    expect(res.status).toBe(200);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 200 when Google-only account (no password hash)", async () => {
    mockDb.select.mockReturnValue(chainable([{ id: "u1", passwordHash: null }]));

    const res = await POST(makeReq({ email: "google@test.com" }));
    expect(res.status).toBe(200);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("sends email and returns 200 for valid user", async () => {
    mockDb.select.mockReturnValue(chainable([{ id: "u1", passwordHash: "$2a$12$hash" }]));

    const insertChain: Record<string, unknown> = {};
    insertChain.values = vi.fn().mockResolvedValue(undefined);
    mockDb.insert.mockReturnValue(insertChain);

    const res = await POST(makeReq({ email: "user@test.com" }));
    expect(res.status).toBe(200);
    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendEmail.mock.calls[0][0].to).toBe("user@test.com");
  });
});
```

**`src/app/api/auth/__tests__/reset-password.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/db", () => ({ db: mockDb }));
vi.mock("@/db/schema", () => {
  const t = (name: string) => ({ name });
  return {
    users: { id: t("id"), passwordHash: t("password_hash") },
    passwordResetTokens: {
      id: t("id"),
      token: t("token"),
      usedAt: t("used_at"),
      expiresAt: t("expires_at"),
      userId: t("user_id"),
    },
  };
});

import { POST } from "../reset-password/route";
import { NextRequest } from "next/server";

function makeReq(body: Record<string, unknown>) {
  return new NextRequest(new URL("http://localhost:3000/api/auth/reset-password"), {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function chainable(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "from", "where", "limit", "set"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(resolvedValue);
  (chain as Record<string, unknown>)[Symbol.toStringTag] = "Promise";
  return chain;
}

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 400 when fields missing", async () => {
    const res = await POST(makeReq({ token: "abc" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when password too short", async () => {
    const res = await POST(makeReq({ token: "abc", password: "short" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when token expired or invalid", async () => {
    mockDb.select.mockReturnValue(chainable([]));

    const res = await POST(makeReq({ token: "expired", password: "newpass123" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("expired");
  });

  it("resets password for valid token", async () => {
    const validToken = {
      id: "rt-1",
      userId: "u-1",
      token: "valid-token",
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: null,
    };

    mockDb.select.mockReturnValue(chainable([validToken]));

    const updateChain = chainable(undefined);
    mockDb.update.mockReturnValue(updateChain);

    const res = await POST(makeReq({ token: "valid-token", password: "newpass123" }));
    expect(res.status).toBe(200);
    expect(mockDb.update).toHaveBeenCalledTimes(2); // user password + mark token used
  });
});
```

### Verification
- `npx drizzle-kit push` — migration succeeds
- `npx vitest run src/app/api/auth/__tests__` — all tests pass
- Navigate to `/login` — "Forgot password?" link visible below password field
- Click it → `/forgot-password` page with email form
- Submit with valid email → success message, check Resend dashboard for email delivery
- Click link in email → `/reset-password?token=...` page
- Submit new password → success, can now log in with new password
- Reusing same token → "Invalid or expired reset link" error
- `npm run build` passes

---

## 4. Invite Acceptance Page

**Goal:** When a cleaner clicks the invite link in their email, they land on a page to accept and join the org.

The invite email (in `src/lib/email.ts` `inviteEmailHtml()`) generates a URL. Check what URL pattern it uses — it takes an `inviteUrl` parameter. The team settings page links to `/invite` for creating invites. The invite acceptance page should be at `/invite/accept` or handle the token on the `/invite` page itself.

### Files to create

**`src/app/api/invite/validate/route.ts`** — GET, no auth required. Returns invite metadata.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, gt } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Find invite
    const [invite] = await db
      .select({
        id: schema.invites.id,
        orgId: schema.invites.orgId,
        role: schema.invites.role,
        expiresAt: schema.invites.expiresAt,
        usedAt: schema.invites.usedAt,
      })
      .from(schema.invites)
      .where(eq(schema.invites.token, token))
      .limit(1);

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 }
      );
    }

    if (invite.usedAt) {
      return NextResponse.json(
        { error: "This invite has already been used" },
        { status: 400 }
      );
    }

    if (new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "This invite has expired" },
        { status: 400 }
      );
    }

    // Get org name
    const [org] = await db
      .select({ name: schema.organisations.name })
      .from(schema.organisations)
      .where(eq(schema.organisations.id, invite.orgId))
      .limit(1);

    return NextResponse.json({
      role: invite.role,
      orgName: org?.name || "Unknown organisation",
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    console.error("Invite validate error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
```

**`src/app/api/invite/accept/route.ts`** — POST, requires auth.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getApiSession, isAuthError } from "@/lib/auth-helpers";

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession();
    if (isAuthError(session)) return session;

    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Find valid invite
    const [invite] = await db
      .select()
      .from(schema.invites)
      .where(eq(schema.invites.token, token))
      .limit(1);

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 }
      );
    }

    if (invite.usedAt) {
      return NextResponse.json(
        { error: "This invite has already been used" },
        { status: 400 }
      );
    }

    if (new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "This invite has expired" },
        { status: 400 }
      );
    }

    // Check if already a member
    const [existing] = await db
      .select()
      .from(schema.orgMembers)
      .where(
        and(
          eq(schema.orgMembers.orgId, invite.orgId),
          eq(schema.orgMembers.userId, session.userId)
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "You're already a member of this organisation" },
        { status: 400 }
      );
    }

    // Add member
    await db.insert(schema.orgMembers).values({
      orgId: invite.orgId,
      userId: session.userId,
      role: invite.role,
    });

    // Create property assignments if specified
    if (invite.propertyIds) {
      const propertyIds = invite.propertyIds.split(",").filter(Boolean);
      for (const propertyId of propertyIds) {
        await db.insert(schema.propertyAssignments).values({
          propertyId: propertyId.trim(),
          userId: session.userId,
        });
      }
    }

    // Mark invite as used
    await db
      .update(schema.invites)
      .set({
        usedBy: session.userId,
        usedAt: new Date(),
      })
      .where(eq(schema.invites.id, invite.id));

    return NextResponse.json({
      message: "You've joined the team.",
      orgId: invite.orgId,
    });
  } catch (error) {
    console.error("Invite accept error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
```

**`src/app/invite/accept/page.tsx`** — Client component for accepting invites.

```tsx
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect, Suspense } from "react";
import { useToast } from "@/components/ui/toast";

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const token = searchParams.get("token");

  const [inviteInfo, setInviteInfo] = useState<{
    orgName: string;
    role: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No invite token provided");
      setLoading(false);
      return;
    }

    async function validateInvite() {
      try {
        const res = await fetch(`/api/invite/validate?token=${token}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error);
        } else {
          setInviteInfo(data);
        }
      } catch {
        setError("Failed to validate invite");
      }
      setLoading(false);
    }

    validateInvite();
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    try {
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setAccepting(false);
        return;
      }
      toast("You've joined the team!");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong");
      setAccepting(false);
    }
  }

  if (loading || status === "loading") {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-card bg-surface-card p-8 shadow-sm ring-1 ring-surface-border">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-2/3 rounded bg-gray-200" />
            <div className="h-4 w-full rounded bg-gray-200" />
            <div className="h-10 w-full rounded bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-card bg-surface-card p-8 text-center shadow-sm ring-1 ring-surface-border">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-gray-900">Invite unavailable</h2>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block text-sm font-medium text-brand hover:text-brand-light"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Not logged in — redirect to login with callback
  if (!session) {
    const callbackUrl = `/invite/accept?token=${token}`;
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-card bg-surface-card p-8 text-center shadow-sm ring-1 ring-surface-border">
          <h2 className="text-lg font-semibold text-gray-900">
            You&apos;ve been invited to {inviteInfo?.orgName}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in or create an account to accept this invitation.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="rounded-btn bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-light"
            >
              Sign in
            </Link>
            <Link
              href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="rounded-btn border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-card bg-surface-card p-8 text-center shadow-sm ring-1 ring-surface-border">
        <h2 className="text-lg font-semibold text-gray-900">
          Join {inviteInfo?.orgName}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          You&apos;ve been invited to join as a{" "}
          <span className="inline-block rounded-badge bg-accent-dim px-2 py-0.5 text-xs font-medium text-brand">
            {inviteInfo?.role}
          </span>
        </p>

        <button
          onClick={handleAccept}
          disabled={accepting}
          className="mt-6 w-full rounded-btn bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50"
        >
          {accepting ? "Joining..." : "Accept invitation"}
        </button>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteForm />
    </Suspense>
  );
}
```

### Files to edit

**`src/lib/email.ts`** — Verify the invite URL format in `inviteEmailHtml()`. The function takes `inviteUrl` as a param, so the caller (in the team/invite API route) constructs it. Find where invites are created and ensure the URL points to `/invite/accept?token=TOKEN`. Search for where `inviteEmailHtml` is called and update the URL construction if needed.

**`src/app/register/page.tsx`** — Support `callbackUrl` query param. After successful registration + auto sign-in, redirect to `callbackUrl` instead of hardcoded `/dashboard`:

Add `useSearchParams` to imports and read the callback:
```tsx
const searchParams = useSearchParams();
const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
```

Then change `router.push("/dashboard")` to `router.push(callbackUrl)`. Also wrap the component in `<Suspense>` like the login page does.

### Verification
- Create an invite from Settings > Team
- Check the invite email URL points to `/invite/accept?token=...`
- Open the link while logged out → shows "Sign in" / "Create account"
- Click "Sign in" → login page → after login, redirects back to invite acceptance
- Click "Accept invitation" → joins org, redirects to dashboard
- Toast shows "You've joined the team!"
- Try accepting same invite again → "already been used" error
- Try expired invite → "expired" error

---

## 5. Empty States for All List Pages

**Goal:** Show helpful prompts when lists are empty. Find each list page and add conditional rendering when the data array is empty.

### Pages to update

Find the properties list page (likely `src/app/properties/page.tsx`) and turnovers list page (likely `src/app/turnovers/page.tsx`). Read each file first to understand its data-fetching pattern, then add empty states.

**Empty state component pattern** (inline in each page, not a separate component — keeps it simple):

```tsx
{items.length === 0 ? (
  <div className="rounded-card bg-surface-card p-12 text-center shadow-sm ring-1 ring-surface-border">
    <h3 className="text-lg font-semibold text-gray-900">No [items] yet</h3>
    <p className="mt-2 text-sm text-gray-600">[Description]</p>
    <Link
      href="/[path]"
      className="mt-4 inline-block rounded-btn bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light"
    >
      [CTA]
    </Link>
  </div>
) : (
  /* existing list rendering */
)}
```

Specific empty states:

1. **Properties list** — "No properties yet" / "Add your first property to start documenting turnovers." / CTA: "Add property" → `/properties/new`
2. **Turnovers list** — "No turnovers yet" / "Create a turnover to begin photo documentation." / CTA: "New turnover" → `/turnovers/new`
3. **Settings team page** — Already has members (owner always shows). For the invites section, it already only renders when `invites.length > 0`. No change needed.
4. **Dashboard flagged items** — Check `src/app/dashboard/flagged-items.tsx` — if it doesn't already handle empty state, add "No flagged items — all clear."

### Verification
- Create a fresh account → dashboard shows "Get started" card (already exists)
- Navigate to Properties → see "No properties yet" empty state
- Navigate to Turnovers → see "No turnovers yet" empty state
- Add a property → empty state disappears, property shows
- Flagged items section shows "all clear" when no flags

---

## 6. Privacy Policy Page

**Goal:** Standalone Privacy Policy page at `/privacy`. Reference existing Terms of Use content and expand.

### Files to create

**`src/app/privacy/page.tsx`** — Server component, static content. Follow `src/app/terms/page.tsx` pattern exactly.

Use the same structure as the terms page: metadata export, `mx-auto max-w-3xl`, card wrapper, numbered sections with `space-y-8`, back link. Content sections:

1. **Data Controller** — Corinium Capital Limited, privacy@stayd-tools.com
2. **What We Collect** — Name, email, uploaded photos (EXIF: GPS, device, timestamps), IP addresses (server logs)
3. **Why We Collect It** — Providing the service (contract performance), improving the product (legitimate interest)
4. **Data Storage** — Cloudflare R2 EU (photos), Vercel Postgres Frankfurt (database), Vercel EU (hosting). All within EU/UK jurisdiction
5. **Data Retention** — Photos: 12 months from turnover completion. Account data: while account is active. Logs: 30 days
6. **Your Rights (GDPR)** — Access, rectification, erasure (Settings > Delete account), portability (Settings > Export data), restriction, objection. Contact privacy@stayd-tools.com
7. **Third-Party Processors** — Resend (email), Google (OAuth only), Cloudflare (storage), Vercel (hosting). No data sold
8. **Cookies** — Session cookie only (NextAuth JWT). No tracking cookies, no analytics, no third-party cookies
9. **Children** — Not intended for under 18s
10. **Changes** — Last updated date. Material changes notified by email
11. **Contact** — Corinium Capital Limited, privacy@stayd-tools.com

### Files to edit

**`src/components/footer.tsx`** — Add "Privacy" link between "Terms of Use" and the company name. After the existing Terms `<Link>`:
```tsx
<Link href="/privacy" className="text-xs text-gray-500 hover:text-gray-700">
  Privacy
</Link>
```

**`src/app/register/page.tsx`** — Update terms checkbox label to mention privacy policy. Change the label (line 157-162) to:
```tsx
<label htmlFor="terms" className="text-sm text-gray-600">
  I agree to the{" "}
  <Link href="/terms" className="font-medium text-brand hover:text-brand-light" target="_blank">
    Terms of Use
  </Link>
  {" "}and{" "}
  <Link href="/privacy" className="font-medium text-brand hover:text-brand-light" target="_blank">
    Privacy Policy
  </Link>
</label>
```

**`src/app/terms/page.tsx`** — In section 6 (Data Protection), add a link to the privacy policy:
```tsx
For full details, see our{" "}
<Link href="/privacy" className="text-brand hover:text-brand-light underline">
  Privacy Policy
</Link>.
```

### Verification
- Navigate to `/privacy` — all 11 sections render
- Footer "Privacy" link works
- Registration checkbox mentions both Terms and Privacy Policy
- Terms of Use links to Privacy Policy
- `npm run build` passes

---

## 7. Delete My Account + GDPR Data Export

**Goal:** Let users export their data as JSON and permanently delete their account.

### Files to create

**`src/app/api/settings/export-data/route.ts`** — GET, returns JSON download.

```typescript
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getApiSession, isAuthError } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const session = await getApiSession();
    if (isAuthError(session)) return session;

    // Get user profile
    const [user] = await db
      .select({
        email: schema.users.email,
        name: schema.users.name,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, session.userId))
      .limit(1);

    // Get org info
    const [org] = await db
      .select({ name: schema.organisations.name })
      .from(schema.organisations)
      .where(eq(schema.organisations.id, session.orgId))
      .limit(1);

    // Get properties (if owner)
    const properties = await db
      .select({
        name: schema.properties.name,
        address: schema.properties.address,
        propertyType: schema.properties.propertyType,
        bedrooms: schema.properties.bedrooms,
        createdAt: schema.properties.createdAt,
      })
      .from(schema.properties)
      .where(eq(schema.properties.orgId, session.orgId));

    // Get turnovers
    const turnovers = await db
      .select({
        checkoutDate: schema.turnovers.checkoutDate,
        checkinDate: schema.turnovers.checkinDate,
        departingGuestRef: schema.turnovers.departingGuestRef,
        arrivingGuestRef: schema.turnovers.arrivingGuestRef,
        status: schema.turnovers.status,
        createdAt: schema.turnovers.createdAt,
        completedAt: schema.turnovers.completedAt,
        propertyName: schema.properties.name,
      })
      .from(schema.turnovers)
      .innerJoin(schema.properties, eq(schema.turnovers.propertyId, schema.properties.id))
      .where(eq(schema.properties.orgId, session.orgId));

    // Get photos metadata (not binary data)
    const photos = await db
      .select({
        originalFilename: schema.photos.originalFilename,
        mimeType: schema.photos.mimeType,
        fileSizeBytes: schema.photos.fileSizeBytes,
        captureTimestamp: schema.photos.captureTimestamp,
        gpsLatitude: schema.photos.gpsLatitude,
        gpsLongitude: schema.photos.gpsLongitude,
        deviceMake: schema.photos.deviceMake,
        deviceModel: schema.photos.deviceModel,
        isDamageFlagged: schema.photos.isDamageFlagged,
        damageNote: schema.photos.damageNote,
        photoSet: schema.photos.photoSet,
        uploadTimestamp: schema.photos.uploadTimestamp,
      })
      .from(schema.photos)
      .innerJoin(schema.turnovers, eq(schema.photos.turnoverId, schema.turnovers.id))
      .innerJoin(schema.properties, eq(schema.turnovers.propertyId, schema.properties.id))
      .where(eq(schema.properties.orgId, session.orgId));

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: user || null,
      organisation: org?.name || null,
      properties,
      turnovers,
      photoMetadata: photos,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": "attachment; filename=banda-data-export.json",
      },
    });
  } catch (error) {
    console.error("Data export error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
```

**`src/app/api/settings/delete-account/route.ts`** — DELETE, requires email confirmation.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { eq, and, ne } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getApiSession, isAuthError, isOwner } from "@/lib/auth-helpers";
import { deleteObject } from "@/lib/r2";

export async function DELETE(request: NextRequest) {
  try {
    const session = await getApiSession();
    if (isAuthError(session)) return session;

    const { confirmEmail } = await request.json();

    if (!confirmEmail || confirmEmail !== session.email) {
      return NextResponse.json(
        { error: "Please enter your email address to confirm deletion" },
        { status: 400 }
      );
    }

    // If owner, check for other members
    if (isOwner(session)) {
      const otherMembers = await db
        .select()
        .from(schema.orgMembers)
        .where(
          and(
            eq(schema.orgMembers.orgId, session.orgId),
            ne(schema.orgMembers.userId, session.userId)
          )
        );

      if (otherMembers.length > 0) {
        return NextResponse.json(
          {
            error:
              "Remove all team members before deleting your account. Go to Settings > Manage team.",
          },
          { status: 400 }
        );
      }
    }

    // Delete photos from R2
    const photos = await db
      .select({
        r2KeyOriginal: schema.photos.r2KeyOriginal,
        r2KeyThumbnail: schema.photos.r2KeyThumbnail,
      })
      .from(schema.photos)
      .innerJoin(schema.turnovers, eq(schema.photos.turnoverId, schema.turnovers.id))
      .innerJoin(schema.properties, eq(schema.turnovers.propertyId, schema.properties.id))
      .where(eq(schema.properties.orgId, session.orgId));

    for (const photo of photos) {
      try {
        await deleteObject(photo.r2KeyOriginal);
        if (photo.r2KeyThumbnail) {
          await deleteObject(photo.r2KeyThumbnail);
        }
      } catch {
        // Continue deleting even if individual R2 deletion fails
      }
    }

    // Delete user — cascading deletes handle org_members, etc.
    // If owner with no other members, also delete the org
    if (isOwner(session)) {
      await db
        .delete(schema.organisations)
        .where(eq(schema.organisations.id, session.orgId));
    }

    await db
      .delete(schema.users)
      .where(eq(schema.users.id, session.userId));

    return NextResponse.json({ message: "Account deleted" });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
```

### Files to edit

**`src/app/settings/page.tsx`** — Add "Your Data" section after the Data Retention section. Add new state variables and handlers:

New state:
```tsx
const [exporting, setExporting] = useState(false);
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [confirmEmail, setConfirmEmail] = useState("");
const [deleting, setDeleting] = useState(false);
```

New handlers:
```tsx
async function handleExportData() {
  setExporting(true);
  try {
    const res = await fetch("/api/settings/export-data");
    if (!res.ok) {
      toast("Failed to export data", "error");
      setExporting(false);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "banda-data-export.json";
    a.click();
    URL.revokeObjectURL(url);
    toast("Data exported");
  } catch {
    toast("Something went wrong", "error");
  }
  setExporting(false);
}

async function handleDeleteAccount() {
  setDeleting(true);
  try {
    const res = await fetch("/api/settings/delete-account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmEmail }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error, "error");
      setDeleting(false);
      return;
    }
    // Sign out and redirect
    const { signOut } = await import("next-auth/react");
    await signOut({ callbackUrl: "/" });
  } catch {
    toast("Something went wrong", "error");
    setDeleting(false);
  }
}
```

New JSX section (after the Data Retention card):
```tsx
{/* Your Data */}
<div className="mt-6 rounded-card bg-surface-card p-6 shadow-sm ring-1 ring-surface-border">
  <h2 className="text-lg font-semibold text-gray-900">Your Data</h2>
  <p className="mt-2 text-sm text-gray-600">
    Export or delete your data in accordance with GDPR.
  </p>

  <div className="mt-4 flex flex-wrap gap-3">
    <button
      onClick={handleExportData}
      disabled={exporting}
      className="rounded-btn border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
    >
      {exporting ? "Exporting..." : "Export my data"}
    </button>

    <button
      onClick={() => setShowDeleteModal(true)}
      className="rounded-btn bg-status-critical px-4 py-2 text-sm font-medium text-white hover:opacity-90"
    >
      Delete my account
    </button>
  </div>

  {/* Delete confirmation modal */}
  {showDeleteModal && (
    <div className="mt-4 rounded-btn border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-medium text-red-800">
        This will permanently delete your account, all properties, turnovers, and photos. This cannot be undone.
      </p>
      <div className="mt-3">
        <label htmlFor="confirm-email" className="block text-sm font-medium text-red-700">
          Type your email to confirm: {session?.user?.email}
        </label>
        <input
          id="confirm-email"
          type="email"
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
          placeholder={session?.user?.email || ""}
          className="mt-1 block w-full rounded-md border border-red-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
      </div>
      <div className="mt-3 flex gap-3">
        <button
          onClick={handleDeleteAccount}
          disabled={deleting || confirmEmail !== session?.user?.email}
          className="rounded-btn bg-status-critical px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Permanently delete"}
        </button>
        <button
          onClick={() => {
            setShowDeleteModal(false);
            setConfirmEmail("");
          }}
          className="rounded-btn border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )}
</div>
```

### Verification
- Settings page shows "Your Data" section
- "Export my data" downloads JSON file with correct structure
- JSON includes user profile, properties, turnovers, photo metadata (no binary)
- "Delete my account" shows confirmation with email input
- Wrong email → button stays disabled
- Correct email + click → account deleted, signed out, redirected to `/`
- Owner with team members → error "Remove all team members first"
- `npm run build` passes

---

## 8. Rate Limiting on Public Routes

**Goal:** In-memory rate limiter for registration, forgot-password, and presigned upload routes.

### Files to create

**`src/lib/rate-limit.ts`**

```typescript
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterConfig {
  interval: number; // ms
  maxRequests: number;
}

export function rateLimit({ interval, maxRequests }: RateLimiterConfig) {
  const store = new Map<string, RateLimitEntry>();

  // Clean up expired entries every 60s
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    }
  }, 60_000);

  return {
    check(key: string): { success: boolean; remaining: number } {
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || entry.resetAt < now) {
        store.set(key, { count: 1, resetAt: now + interval });
        return { success: true, remaining: maxRequests - 1 };
      }

      if (entry.count >= maxRequests) {
        return { success: false, remaining: 0 };
      }

      entry.count++;
      return { success: true, remaining: maxRequests - entry.count };
    },
  };
}
```

### Files to edit

**`src/app/api/auth/register/route.ts`** — Add rate limiting (5 requests per 15 min per IP).

Add at top of file:
```typescript
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 15 * 60 * 1000, maxRequests: 5 });
```

At the start of the POST handler, before validation:
```typescript
const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
const { success } = limiter.check(ip);
if (!success) {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    { status: 429 }
  );
}
```

**`src/app/api/auth/forgot-password/route.ts`** — Same pattern (3 requests per 15 min per IP).

**`src/app/api/photos/presign/route.ts`** — Rate limit by session userId (100 requests per 15 min per user). Read this file first to see the auth pattern, then add the limiter after the auth check using `session.userId` as the key.

### Tests to create

**`src/lib/__tests__/rate-limit.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit } from "../rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const limiter = rateLimit({ interval: 60_000, maxRequests: 3 });

    expect(limiter.check("ip1").success).toBe(true);
    expect(limiter.check("ip1").success).toBe(true);
    expect(limiter.check("ip1").success).toBe(true);
  });

  it("blocks requests over the limit", () => {
    const limiter = rateLimit({ interval: 60_000, maxRequests: 2 });

    limiter.check("ip1");
    limiter.check("ip1");
    expect(limiter.check("ip1").success).toBe(false);
    expect(limiter.check("ip1").remaining).toBe(0);
  });

  it("resets after interval", () => {
    const limiter = rateLimit({ interval: 60_000, maxRequests: 1 });

    limiter.check("ip1");
    expect(limiter.check("ip1").success).toBe(false);

    vi.advanceTimersByTime(61_000);

    expect(limiter.check("ip1").success).toBe(true);
  });

  it("tracks different keys independently", () => {
    const limiter = rateLimit({ interval: 60_000, maxRequests: 1 });

    limiter.check("ip1");
    expect(limiter.check("ip1").success).toBe(false);
    expect(limiter.check("ip2").success).toBe(true);
  });

  it("returns correct remaining count", () => {
    const limiter = rateLimit({ interval: 60_000, maxRequests: 3 });

    expect(limiter.check("ip1").remaining).toBe(2);
    expect(limiter.check("ip1").remaining).toBe(1);
    expect(limiter.check("ip1").remaining).toBe(0);
  });
});
```

### Verification
- `npx vitest run src/lib/__tests__/rate-limit.test.ts` passes
- Registration: 6th signup attempt from same IP within 15 min → 429
- Forgot password: 4th request within 15 min → 429
- Normal usage stays under limits
- Different IPs are tracked independently

---

## 9. Loading Skeletons for List Pages

**Goal:** Add shimmer loading states to pages that fetch data on mount.

### Files to create

**`src/components/ui/skeleton.tsx`**

```tsx
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-gray-200 ${className || ""}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-card bg-surface-card p-6 shadow-sm ring-1 ring-surface-border">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="mt-3 h-4 w-1/2" />
      <Skeleton className="mt-2 h-4 w-1/3" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
  );
}
```

### Files to edit

Find the properties list and turnovers list pages. Add loading states using the pattern from `src/app/settings/team/page.tsx`:

```tsx
if (loading) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}
```

Read each page first — some may be server components (which don't need skeletons since they render on the server with data already loaded). Only add skeletons to client components that use `useEffect` data fetching.

### Verification
- Navigate to properties list — skeleton shows briefly then content loads
- Navigate to turnovers list — skeleton shows briefly then content loads
- Skeleton cards match the layout shape of real cards

---

## 10. Error Boundaries

**Goal:** Catch React errors gracefully instead of blanking the page.

### Files to create

**`src/components/error-boundary.tsx`** — Class component (React requirement for error boundaries).

```tsx
"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("ErrorBoundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="mx-auto max-w-lg px-4 py-16 text-center">
            <div className="rounded-card bg-surface-card p-8 shadow-sm ring-1 ring-surface-border">
              <h2 className="text-lg font-semibold text-gray-900">
                Something went wrong
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Please try refreshing the page.
              </p>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="mt-4 rounded-btn bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light"
              >
                Try again
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
```

**`src/app/error.tsx`** — Next.js app-wide error page (automatically catches errors in nested layouts/pages).

```tsx
"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-card bg-surface-card p-8 text-center shadow-sm ring-1 ring-surface-border">
        <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
        <p className="mt-2 text-sm text-gray-600">
          An unexpected error occurred. Please try again.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-btn bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="rounded-btn border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
```

**`src/app/not-found.tsx`** — 404 page.

```tsx
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
```

### Files to edit

**`src/app/layout.tsx`** — Wrap `{children}` in `<ErrorBoundary>`:

Add import:
```tsx
import { ErrorBoundary } from "@/components/error-boundary";
```

Wrap the main content:
```tsx
<Nav />
<OnboardingTour />
<main className="min-h-[calc(100vh-8rem)]">
  <ErrorBoundary>{children}</ErrorBoundary>
</main>
<Footer />
```

### Verification
- Navigate to `/nonexistent-page` → 404 page with "Go to dashboard" link
- If a page throws a runtime error → error.tsx catches it, shows "Try again" + "Go to dashboard"
- "Try again" button recovers from the error
- Normal pages unaffected by ErrorBoundary wrapper
- `npm run build` passes

---

## Execution Order

Feed each section as a standalone prompt to Claude Code, in order 1-10. Each task is independent — they can be committed separately.

After all 10: run full test suite (`npx vitest run`) and full build (`npm run build`) to verify everything works together.
