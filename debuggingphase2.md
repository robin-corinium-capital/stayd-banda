# Debugging Phase 2 — Property & Area Management

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
