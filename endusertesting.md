# End-User Testing Log

## Issue 1: Onboarding tooltips fire on page load before login

**Severity:** Medium
**Component:** `src/components/onboarding-tour.tsx`
**Reported:** 2026-03-01

### Description

The JavaScript onboarding tour tooltips (step-by-step walkthrough of Dashboard, Properties, Turnovers, Help) fire 500ms after any page load, regardless of whether the user is authenticated. Unauthenticated visitors on `/login`, `/register`, or `/` see the tooltip backdrop and overlay even though the target nav elements (`[data-tour='dashboard']`, etc.) don't exist until after login.

### Steps to reproduce

1. Clear localStorage (remove `banda-onboarding-complete` key)
2. Navigate to `/login` without being logged in
3. Wait 500ms
4. **Expected:** No tooltips appear
5. **Actual:** Semi-transparent backdrop and tooltip overlay appear, targeting non-existent nav elements

### Root cause

`onboarding-tour.tsx` lines 44-48 — the `useEffect` that triggers the tour only checks a localStorage flag, not auth state:

```tsx
useEffect(() => {
  if (localStorage.getItem(STORAGE_KEY)) return;
  const timer = setTimeout(() => setIsVisible(true), 500);
  return () => clearTimeout(timer);
}, []);
```

The empty dependency array `[]` means it fires once on mount. Since `<OnboardingTour />` is rendered in `layout.tsx` at the root level (outside any auth guard), it runs on every page regardless of session state.

### Fix applied

Added `useSession()` from `next-auth/react` to gate the tour on `status === "authenticated"`:

```tsx
import { useSession } from "next-auth/react";

export function OnboardingTour() {
  const { status } = useSession();
  // ...

  useEffect(() => {
    if (status !== "authenticated") return;   // <-- added guard
    if (localStorage.getItem(STORAGE_KEY)) return;
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, [status]);   // <-- added status dependency
```

The component already lives inside `<SessionProvider>` in `layout.tsx`, so `useSession` works without any additional provider changes.

### Files modified

- `src/components/onboarding-tour.tsx` — added `useSession` import and auth guard

### Verification checklist

- [ ] Visit `/login` while logged out — no tooltip backdrop or tour appears
- [ ] Visit `/register` while logged out — no tooltip backdrop or tour appears
- [ ] Visit `/` while logged out — no tooltip backdrop or tour appears
- [ ] Log in successfully — onboarding tour appears after 500ms (if not previously completed)
- [ ] Complete tour — localStorage flag set, tour does not reappear on refresh
- [ ] Skip tour — same behaviour as completing
- [ ] Log out and back in — tour does not reappear (localStorage flag persists)
- [ ] Clear localStorage and log in — tour reappears correctly

### E2E browser test results

**Date:** 2026-03-01
**Environment:** localhost:3000 (dev server with fix applied) + production Vercel deployment (without fix)

#### Test 1: Production site (before fix) — FAIL (bug confirmed)
- Navigated to production `/login` page while unauthenticated
- Cleared `banda-onboarding-complete` from localStorage
- **Result:** "Your Dashboard" tooltip overlay appeared on the login page with backdrop dimming. Nav shows Login/Register (no session), confirming user is not authenticated.
- **Status:** Bug reproduced

#### Test 2: Localhost (after fix) — PASS
- Navigated to localhost `/login` page while unauthenticated
- **Result:** Clean login page, no tooltip overlay, no backdrop. Tour did not fire.
- **Status:** Fix verified

#### Test 3: Localhost landing page (after fix) — PASS
- Navigated to localhost `/` while unauthenticated
- **Result:** Clean landing page, no tooltip overlay, no console errors.
- **Status:** Fix verified

#### Test 4: Post-login tour trigger — PENDING
- Requires login credentials to verify the tour fires correctly after authentication
- Expected: tour appears 500ms after successful login (if localStorage flag not set)

### Verification checklist (updated)

- [x] Visit `/login` while logged out — no tooltip backdrop or tour appears
- [x] Visit `/` while logged out — no tooltip backdrop or tour appears
- [ ] Visit `/register` while logged out — not yet tested
- [ ] Log in successfully — onboarding tour appears after 500ms (if not previously completed)
- [ ] Complete tour — localStorage flag set, tour does not reappear on refresh
- [ ] Skip tour — same behaviour as completing
- [ ] Log out and back in — tour does not reappear (localStorage flag persists)
- [ ] Clear localStorage and log in — tour reappears correctly
