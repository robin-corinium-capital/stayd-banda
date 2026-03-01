# Phase 1: Deployment & Auth


## Issue
Vercel deployment at `stayd-banda.vercel.app` showing "Server error" on `/api/auth/error`.

## Root Causes Found

### 1. Missing Vercel Environment Variables (FIXED)
Only Postgres/Neon vars were set via Vercel integration. All auth and service vars were missing.

**Added to Vercel production:**
- `NEXTAUTH_SECRET` — JWT encryption key (primary cause of "Server error")
- `NEXTAUTH_URL` — `https://stayd-banda.vercel.app`
- `AUTH_TRUST_HOST` — required for NextAuth v5 on Vercel
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth
- `NEXT_PUBLIC_APP_URL` — app base URL
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT` — Cloudflare R2
- `RESEND_API_KEY` — email service

**Result:** Server error resolved. Auth endpoints now return 200. Providers endpoint returns valid config.

### 2. Google OAuth Client Secret Rotated (FIXED)
Original secret in `.env.local` was stale. Updated to new secret in both `.env.local` and Vercel.

### 3. Google OAuth `invalid_client` Error (IN PROGRESS — Session 2)
**Symptom:** `Error 401: invalid_client` — "The OAuth client was not found"
**User:** `shamu1982@gmail.com` (personal Gmail)
**Flow:** `GeneralOAuthFlow`

**Tests performed (session 1):**
- Client ID confirmed visible in Google Cloud Console (project `banda-488807`)
- Redirect URIs correctly configured (localhost, banda.stayd-tools.com, stayd-banda.vercel.app)
- OAuth consent screen configured and set to production
- Google Identity Toolkit API enabled
- Direct curl to Google OAuth endpoint: **302 redirect to sign-in** (Google recognises the client ID at initial stage)
- Error occurs AFTER initial redirect, during consent/token flow

**Session 2 investigation (browser automation of Google Cloud Console + Vercel):**

#### Step 1: Google Cloud Console — Client ✅
- [x] Client ID `465309846060-...googleusercontent.com` **exists and is enabled**
- [x] Client name: `banda`, created 28 Feb 2026 10:50:38 GMT+0
- [x] Single client secret ending `****gPqP`, status: Enabled
- [x] `.env.local` secret ends with `gPqP` — **matches Google**
- [x] Session 1 doc referenced wrong secret — that was stale/incorrect

#### Step 2: Google Cloud Console — Redirect URIs ✅
- [x] URI 1: `https://stayd-banda.vercel.app/api/auth/callback/google`
- [x] URI 2: `https://banda.stayd-tools.com/api/auth/callback/google`
- [x] URI 3: `http://localhost:3000/api/auth/callback/google`
- [x] No Authorised JavaScript origins set (not needed for server-side flow)

#### Step 3: Google Cloud Console — Consent Screen ✅
- [x] Publishing status: **Testing** (not production)
- [x] User type: **External**
- [x] Test users (2): `robin.smith@coriniumcapital.co.uk`, `shamu1982@gmail.com`
- [x] Consent screen is NOT the issue — test users are correctly listed

#### Step 4: Vercel Environment Variables ✅
- [x] `GOOGLE_CLIENT_SECRET` on Vercel = `GOCSPX-zlYqCzdr02ctYHo1W10gs7jvg...` — **matches Google + .env.local**
- [x] `GOOGLE_CLIENT_ID` set (added 24m ago)
- [x] `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `AUTH_TRUST_HOST` all present
- [x] All R2 and RESEND vars present

#### Step 5: First redeploy — still failing
- [x] Redeployed to pick up env var timing mismatch — error persisted
- [x] Inspected Google OAuth error URL in browser

#### Step 6: ACTUAL ROOT CAUSE FOUND — Trailing newline in env vars
- [x] Google error URL revealed `client_id=...googleusercontent.com%0A` — a `%0A` (newline) appended
- [x] Opened `GOOGLE_CLIENT_ID` in Vercel edit UI — visible `↵` character at end + orange warning triangle
- [x] Opened `GOOGLE_CLIENT_SECRET` — same trailing newline issue
- [x] **Both env vars had trailing `\n` from copy-paste into Vercel dashboard**
- [x] Removed trailing newlines from both vars, saved, redeployed

**Full RCA:** See [google-oauth-invalid-client-rca.md](./google-oauth-invalid-client-rca.md)

#### Step 7: Verification — OAuth flow now works ✅
- [x] Google sign-in on `https://stayd-banda.vercel.app` — OAuth flow completes, Google consent works

### 4. Post-sign-in "Configuration" Error (FIXED)
**Symptom:** After successful Google OAuth consent, redirected to `/api/auth/error?error=Configuration` with "Server error — There is a problem with the server configuration."

**Root cause:** In `src/lib/auth.ts`, the `jwt` callback used `user.id` to query `orgMembers.userId`. For Google OAuth, `user.id` is Google's numeric string ID (e.g. `"107530004286756160000"`), NOT a UUID. The `orgMembers.userId` column is `uuid`, so Postgres threw `invalid input syntax for type uuid`, crashing the callback.

**Fix:** Changed the `jwt` callback to look up the DB user by email instead of by `user.id`. This returns the correct DB UUID, which is then used for the orgMembers query.

```diff
- token.id = user.id;
- const [membership] = await db.select()...
-   .where(eq(schema.orgMembers.userId, user.id as string))
+ const [dbUser] = await db.select()...
+   .where(eq(schema.users.email, email))
+ token.id = dbUser.id;
+ const [membership] = await db.select()...
+   .where(eq(schema.orgMembers.userId, dbUser.id))
```

**Status:** Code fix applied, needs redeploy to verify.

## What's Working
- Vercel build and deployment: OK
- Database (Neon Postgres) connection: OK
- NextAuth providers endpoint (`/api/auth/providers`): OK — returns Google + Credentials
- Email/password registration (`/api/auth/register`): OK — successfully created test user
- Middleware (protected routes): OK
- Custom domain alias (`www.stayd-tools.com`): OK
- Google OAuth flow (consent + token exchange): OK

## What's Not Working
- Post-sign-in session: fix applied locally, pending deploy + verification

## Environment
- Next.js 16.1.6 (Turbopack)
- NextAuth v5 beta 30
- Vercel (region: lhr1)
- Neon Postgres (eu-west-2)

---

# Phase 2: Property & Area Management


## Summary
Browser testing of Phase 2 features on `https://stayd-banda.vercel.app`. Tested registration, dashboard, property CRUD, and area management.

---

## Issues Found & Resolved

### 1. Phase 2 Deployment Not Promoted to Production (RESOLVED)
**Symptom:** `/properties` page returned 404 on the deployed site.

**Root cause:** The current production deployment (`9yKxG5YLA`) was a redeploy of an older Phase 1 commit (`c0cc410`). The Phase 2 commit (`G43gDekhD`, git `4f85ff5`) was built and "Ready" in Vercel but had never been promoted to production.

**Fix:** Used the Vercel dashboard three-dot menu → Promote on the Phase 2 deployment.

**Result:** All Phase 2 pages load correctly. Dashboard "Get started" CTA now appears.

### 2. Google OAuth Post-Sign-In Crash (RESOLVED — Phase 1 carry-over)
**Symptom:** After successful Google OAuth consent, redirected to `/api/auth/error?error=Configuration`.

**Root cause:** In `src/lib/auth.ts`, the `jwt` callback used `user.id` to query `orgMembers.userId`. For Google OAuth, `user.id` is Google's numeric string ID (e.g. `"107530004286756160000"`), not a UUID. Postgres threw `invalid input syntax for type uuid`.

**Fix:** Changed jwt callback to look up DB user by email first, then use `dbUser.id` for the orgMembers query.

**File:** `src/lib/auth.ts:91-120`

---

## Issues Found & Fixed (Debug Phase 3)

### 3. Area Sort Order Exposed in UI (RESOLVED)
**Location:** `src/app/properties/[id]/page.tsx` — property detail page

**Issue:** Areas displayed `#0`, `#1`, `#2` — the raw internal `sortOrder` value exposed to users.

**Fix:** Changed to human-readable `1 / 3`, `2 / 3`, `3 / 3` format using 1-indexed position from `.map()` index.

### 4. Properties List N+1 Query Pattern (RESOLVED)
**Location:** `src/app/properties/page.tsx`

**Issue:** Looped over each property making individual `SELECT count(*)` queries for area counts. N properties = N+1 queries.

**Fix:** Replaced with a single query using a left-joined subquery (`SELECT property_id, count(*) FROM areas GROUP BY property_id`) with `coalesce()` for properties with no areas.

### 5. Area Delete Uses Native `confirm()` Dialog (RESOLVED)
**Location:** `src/app/properties/[id]/areas/page.tsx`

**Issue:** Area deletion used `window.confirm()` while property deletion used a proper React modal. Inconsistent UX and crashes Chrome MCP extension.

**Fix:** Added `deleteTarget` state and a custom confirmation modal matching the property delete pattern. Modal shows area name and warns about photo unassignment.

### 6. Turnovers Nav Link Points to Nonexistent Page (RESOLVED)
**Location:** `src/components/nav.tsx` → `/turnovers`

**Issue:** Nav link to `/turnovers` returned 404 — no page existed.

**Fix:** Created `src/app/turnovers/page.tsx` with auth guard and a "Coming soon" placeholder explaining Phase 3 will add turnover management.

---

## Test Results

### Registration & Auth ✅
- [x] Register with email/password: `phase2test@test.com` / `TestPass123!` / "Phase2 Tester"
- [x] Auto-sign-in after registration works
- [x] Redirects to `/dashboard` after registration
- [x] Session contains correct `role: "owner"` and `orgId`

### Dashboard ✅
- [x] Stats cards display: Properties (0), Turnovers (0), Flagged Items (0)
- [x] "Get started" CTA appears when propertyCount === 0 and role === owner
- [x] "Add property" link navigates to `/properties/new`

### Properties List ✅
- [x] Empty state shows "No properties yet" with "Add property" button
- [x] After creating a property, list shows property with area count

### Create Property ✅
- [x] Form loads with fields: Name (required), Address, Type (select), Bedrooms, Notes
- [x] Created "Cliff View Cottage" with all fields populated
- [x] Redirects to property detail page after creation

### View Property Detail ✅
- [x] All metadata displayed correctly (name, address, type, bedrooms, notes)
- [x] Areas section shows list of areas with sort order
- [x] Sidebar stats panel present
- [x] Actions dropdown shows: Edit property, Manage areas, Delete property

### Edit Property ✅
- [x] Form pre-populates all existing values
- [x] Updated bedrooms from 3 to 4
- [x] Saves successfully, redirects back to detail page
- [x] Updated value (4 bedrooms) displays correctly

### Area Management — Add ✅
- [x] Added "Kitchen" (no description)
- [x] Added "Living Room" (no description)
- [x] Added "Bathroom" with description "Main bathroom upstairs"
- [x] All three areas appear in list

### Area Management — Reorder ✅
- [x] Moved "Bathroom" up (Kitchen → Bathroom → Living Room)
- [x] Sort order updated correctly

### Area Management — Edit ✅
- [x] Inline edit: renamed "Living Room" to "Lounge"
- [x] Save works, name updates in list

### Area Management — Delete ✅
- [x] Deleted "Lounge" area — removed from list, 2 areas remain (Kitchen, Bathroom)
- [x] Note: uses native `confirm()` dialog which crashes Chrome MCP extension — workaround: override `window.confirm` via JS injection before clicking

### Delete Property ✅
- [x] Actions → Delete property shows custom modal with cascade warning
- [x] Modal text: "Are you sure you want to delete 'Cliff View Cottage'? This will also delete all areas, turnovers, and photos associated with this property. This action cannot be undone."
- [x] Delete button (red) triggers deletion and redirects to `/properties`
- [x] Properties list shows empty state after deletion — cascade delete worked

---

## Environment
- App URL: `https://stayd-banda.vercel.app`
- Test account: `phase2test@test.com` / `TestPass123!`
- Test property: "Cliff View Cottage" (`a88456ef-974e-47b9-856f-8966fd7edc0d`)
- 3 areas: Kitchen (#0), Bathroom (#1), Lounge (#2)
- Next.js 16.1.6 (Turbopack)
- NextAuth v5 beta 30
- Vercel (region: lhr1, Hobby plan)
- Neon Postgres (eu-west-2)

## Notes
- Chrome extension (Claude in Chrome MCP) disconnected multiple times during testing, particularly when browser native dialogs (`confirm()`) were triggered
- The `confirm()` dialog used for area/property deletion may need to be replaced with a custom modal to avoid MCP issues during automated testing

---

# Phase 3: Turnovers & Photo Upload


**Date:** 2026-02-28
**Scope:** Unit tests (Vitest) + Browser tests (Chrome MCP)

---

## Part A: Unit Tests (Vitest)

### Summary

| Suite | File | Passed | Failed | Total |
|-------|------|--------|--------|-------|
| R2 helpers | `src/lib/__tests__/r2.test.ts` | 5 | 0 | 5 |
| Turnovers (list/create) | `src/app/api/turnovers/__tests__/turnovers.test.ts` | 8 | 0 | 8 |
| Turnover detail | `src/app/api/turnovers/__tests__/turnover-detail.test.ts` | 10 | 0 | 10 |
| Presign | `src/app/api/photos/__tests__/presign.test.ts` | 8 | 0 | 8 |
| Confirm | `src/app/api/photos/__tests__/confirm.test.ts` | 11 | 0 | 11 |
| **Totals** | | **42** | **0** | **42** |

### All suites passing

**r2.test.ts** — 5/5
- generates presigned upload URL with correct params
- generates presigned download URL with correct params
- getObject returns buffer from S3 response
- putObject sends correct PutObjectCommand
- deleteObject sends correct DeleteObjectCommand

**turnovers.test.ts** — 8/8
- POST: returns 401 when unauthenticated
- POST: returns 400 when required fields missing
- POST: returns 400 when checkin_date < checkout_date
- POST: returns 404 when property not found
- POST: returns 403 when cleaner not assigned to property
- POST: returns 201 on success
- GET: returns 401 when unauthenticated
- GET: returns empty array when no properties

**turnover-detail.test.ts** — 10/10
- GET: returns 404 when turnover not found
- GET: returns turnover with areas and grouped photos on success
- PATCH: returns 404 when turnover not found
- PATCH: returns 403 when non-owner non-creator tries to update
- PATCH: returns 400 for invalid status
- PATCH: returns 400 when no valid fields provided
- PATCH: sets completedAt when status is 'complete'
- DELETE: returns 403 when non-owner tries to delete
- DELETE: returns 404 when turnover not found
- DELETE: deletes R2 objects then DB record on success

**presign.test.ts** — 8/8
- returns 400 when required fields missing
- returns 400 for invalid content type
- returns 400 when file too large (>20MB)
- returns 404 when turnover not found
- returns 404 when turnover belongs to different org
- returns 403 when cleaner not assigned to property
- returns presigned URL on success
- accepts HEIC content type

**confirm.test.ts** — 11/11
- returns 400 when required fields missing
- returns 400 for invalid photo_set
- returns 404 when turnover not found
- returns 404 when turnover belongs to different org
- returns 403 when cleaner not assigned to property
- returns 400 when area not found for property
- returns 500 when R2 getObject fails
- creates photo and returns 201 on success
- auto-updates turnover status from open to in_progress
- does NOT update status when turnover already in_progress
- accepts pre_checkin as valid photo_set

### Debugged issue (resolved)

**turnovers.test.ts** originally had 6 failing tests.

**Root cause:** `vi.clearAllMocks()` in `beforeEach` only clears call history — it does NOT reset `mockReturnValue` implementations. The 401 test set `mockIsAuthError.mockReturnValue(true)`, and this persisted into all subsequent tests. Every test after the 401 test had `isAuthError()` returning `true`, causing the route to return the raw session object (no `.json()` or `.status`) instead of a NextResponse.

**Fix:** Changed `vi.clearAllMocks()` → `vi.resetAllMocks()` in both `beforeEach` blocks. `resetAllMocks` clears call history AND resets all mock implementations.

---

## Part B: Browser Tests (Chrome MCP)

**Target:** `https://stayd-banda.vercel.app` (deployed app, authenticated as owner)

### Summary

| Test Case | Description | Result |
|-----------|-------------|--------|
| TC1 | Turnovers list page | PASS |
| TC2 | Create turnover | PASS |
| TC3 | Turnover detail page | PASS |
| TC4 | Mark complete (owner) | PASS |
| TC5 | Reopen (owner) | PASS |
| TC6 | Upload hub | PASS |
| TC7 | Upload interface | PASS |
| TC8 | Delete turnover | PASS |
| TC9 | Empty states | PASS |

**9/9 browser tests passed.**

### Detailed results

#### TC1: Turnovers list page — PASS
- Navigated to `/turnovers`
- Verified: page title "Turnovers", "New turnover" button present
- Empty state message displayed correctly ("No turnovers found")
- Layout: sidebar nav, header, content area all rendering

#### TC2: Create turnover — PASS
- Navigated to `/turnovers/new`
- Filled form: selected "Debug Test Property", checkout date 2026-03-01, checkin date 2026-03-03
- Entered guest refs: TEST-BOOKING-001 (departing), TEST-BOOKING-002 (arriving)
- Submitted form successfully
- Redirected to turnover detail page with correct data

#### TC3: Turnover detail page — PASS
- Verified property name "Debug Test Property" displayed
- Dates shown: Mar 1 checkout, Mar 3 checkin
- Status badge: "Open" (amber)
- Stats boxes: Total Photos (0), Post-checkout (0), Pre-checkin (0), Damage Flags (0)
- Empty photos state: "No photos uploaded yet." with "Upload photos now" link

#### TC4: Mark complete (owner) — PASS
- Opened Actions dropdown menu
- Clicked "Mark complete"
- Status badge changed to "Complete" (green)
- Verified via screenshot

#### TC5: Reopen (owner) — PASS
- Opened Actions dropdown menu
- Clicked "Reopen"
- Status badge changed back to "Open" (amber)
- Verified via screenshot

#### TC6: Upload hub — PASS
- Navigated to `/upload`
- App auto-redirected to upload interface (`/upload/[propertyId]/[turnoverId]`) since only one active turnover existed
- Upload interface loaded correctly

#### TC7: Upload interface — PASS
- Verified photo set selector present with two options: "After guest leaves" / "Before next guest"
- Successfully toggled between photo set options
- Area dropdown present and functional
- File drop zone present with "Click or drag photos here" instruction
- Camera icon displayed in drop zone

#### TC8: Delete turnover — PASS
- Navigated back to turnover detail page
- Opened Actions dropdown
- Clicked "Delete turnover"
- Confirmation modal appeared: "Are you sure? This will permanently delete this turnover and all associated photos."
- Confirmed deletion
- Redirected to turnovers list page
- Turnover no longer in list (empty state shown)

#### TC9: Empty states — PASS
- **Turnovers list** (`/turnovers`): Shows "No turnovers found" message
- **Turnover detail photos**: Shows "No photos uploaded yet." with "Upload photos now" link
- **Upload hub** (`/upload`): Shows "No open turnovers available." with "Create a turnover" link

---

## Final Status

**42/42 unit tests passing. 9/9 browser tests passing. 0 errors remaining.**

---

# Phase 4: Retrieval & Search


**Date:** 2026-02-28
**Scope:** Phase 4 features — paginated/filterable turnovers list, turnover detail with photo viewer, dashboard flagged items, auto-complete overdue turnovers

---

## 1. Unit Tests

**Suite:** 42 tests across 5 files | **Result:** 42/42 PASS (after 1 fix)

### Issue #1 — Stale test assertion for paginated response

| | |
|---|---|
| **File** | `src/app/api/turnovers/__tests__/turnovers.test.ts` |
| **Test** | `GET /api/turnovers > returns empty array when no properties` |
| **Error** | `AssertionError: expected { turnovers: [], totalCount: +0, … } to deeply equal []` |
| **Root cause** | Phase 4 changed GET `/api/turnovers` from returning a plain `[]` to a paginated response `{ turnovers, totalCount, page, limit, totalPages }`. The Phase 3 test still expected `[]`. |
| **Fix** | Updated assertion to `expect(json).toEqual({ turnovers: [], totalCount: 0, page: 1, limit: 20, totalPages: 0 })` |
| **Status** | Fixed |

### TypeScript check

Pre-existing `ts(2469)` errors in test files only (the chainable mock's `Symbol.toStringTag` pattern). No new type errors introduced by Phase 4.

---

## 2. Browser Tests

**Target:** `https://stayd-banda.vercel.app` (deployed Vercel) | **Result:** 12 tests — 11 PASS, 1 BUG found & fixed

### TC1 — Turnovers list page (empty state) — PASS
- Filter bar renders: property dropdown, status buttons (All/Open/In progress/Complete), date range inputs, search field, "Has damage flags" toggle
- Empty state with camera icon and "No turnovers found" message shown
- "New turnover" button visible in header

### TC2 — Create turnover — PASS
- Created turnover via `/turnovers/new` form (property selected, dates set, guest ref entered)
- Redirected to turnover detail page on success

### TC3 — Turnover detail page — PASS
- Property name linked back to `/properties/[id]`
- Checkout/checkin dates displayed correctly
- Status badge shows "Open"
- Guest ref displayed
- Three stat cards (Post-checkout photos: 0, Pre-checkin photos: 0, Damage flags: 0)
- "Upload photos" link present
- Actions dropdown (Mark complete, Delete turnover)
- Empty state message "No photos uploaded yet"

### TC4 — Mark complete — PASS
- Clicked "Mark complete" button
- Status changed to "Complete" with green badge
- Mark complete button hidden after completion

### TC5 — Reopen turnover — PASS
- Used Actions dropdown > "Reopen"
- Status reverted to "Open" with amber badge
- Mark complete button reappeared

### TC6 — Turnovers list with data — PASS
- Table renders columns: Property, Checkout, Check-in, Status, Post/Pre, Flagged
- Created turnover appears with correct data
- Pagination shows "Showing 1–1 of 1"

### TC7 — Search filter (matching) — PASS
- Searched "P4-TEST" (guest ref)
- Results filtered to matching turnover

### TC8 — Search filter (no match) — PASS
- Searched "ZZZZZ-NOMATCH"
- Empty state shown: "No turnovers found" with "Try adjusting your filters or search terms."

### TC9 — Status filter — PASS
- Selected "Complete" status button (highlighted green)
- Results filtered correctly (no complete turnovers, showed empty state)

### TC10 — Dashboard stats & flagged section — PASS
- Stats cards: Properties 1, Turnovers 1, Flagged Items 0
- Flagged Items section shows empty state with checkmark icon and "No flagged items found"

### TC11 — Dashboard "Flagged Items" card link — BUG #1 (fixed)
- Card links to `/turnovers?has_damage=true`
- URL navigated correctly BUT filter was not applied — all turnovers shown instead of filtered
- See Bug #1 below

### TC12 — Delete turnover — PASS
- Clicked Actions > "Delete turnover"
- Confirmation modal appeared: "This will permanently delete this turnover and all associated photos."
- Confirmed deletion
- Redirected to turnovers list
- Turnover no longer in list

---

## 3. Bugs Found & Fixed

### Bug #1 — Dashboard "Flagged Items" link doesn't apply filter

| | |
|---|---|
| **Severity** | Medium — broken navigation flow from dashboard |
| **Steps to reproduce** | 1. Go to Dashboard 2. Click "Flagged Items" stat card 3. Navigates to `/turnovers?has_damage=true` 4. All turnovers shown (filter not applied) |
| **Root cause** | `TurnoversListClient` initialised all filter state with hardcoded defaults (`useState(false)` for `hasDamage`, `useState("")` for others) without reading URL search params. The `?has_damage=true` URL param was completely ignored. |
| **Fix** | Added `useSearchParams()` from `next/navigation` to read initial filter values from the URL on mount. All six filters (`property_id`, `status`, `date_from`, `date_to`, `has_damage`, `search`) now initialise from URL params. Added required `<Suspense>` boundary in parent `page.tsx`. |
| **Files changed** | `src/app/turnovers/turnovers-list.tsx`, `src/app/turnovers/page.tsx` |
| **Status** | Fixed |

---

## 4. UI Observations (cosmetic, not blocking)

- **Status button text truncation:** On the turnovers filter bar, the "Complete" status button text can truncate to "Comple…" when horizontal space is tight (e.g. narrower desktop viewports with date inputs consuming space). Not blocking — layout remains functional.

---

## 5. Summary

| Category | Count |
|---|---|
| Unit tests | 42/42 PASS |
| Unit test fixes | 1 (stale assertion for paginated response) |
| Browser test cases | 12 |
| Browser tests passed | 11 |
| Bugs found | 1 |
| Bugs fixed | 1 |
| New type errors | 0 |
