# Phase 5 Debugging Report — Export & Evidence Packs

**Date:** 2026-03-01
**Scope:** ZIP downloads (turnover + property bulk), PDF reports, export UI buttons
**Commit tested:** `c36ae35` (Phase 5: Export & evidence packs)

---

## A. Unit Tests

### Summary

| Suite | File | Tests | Pass | Fail |
|-------|------|-------|------|------|
| A1 | `src/lib/__tests__/export-helpers.test.ts` | 10 | 10 | 0 |
| A2 | `src/app/api/export/turnover/[id]/__tests__/turnover-zip.test.ts` | 6 | 6 | 0 |
| A3 | `src/app/api/export/turnover/[id]/report/__tests__/report.test.ts` | 5 | 5 | 0 |
| A4 | `src/app/api/export/property/[id]/__tests__/property-export.test.ts` | 7 | 7 | 0 |
| **Total** | | **28** | **28** | **0** |

Full suite (including phases 2–4): **70/70 pass**

### A1. Export Helpers (`export-helpers.test.ts`)

| # | Test | Result |
|---|------|--------|
| 1 | `sanitiseFilename` — normal string → `"beach-house-123"` | PASS |
| 2 | `sanitiseFilename` — leading/trailing special chars → `"test"` | PASS |
| 3 | `sanitiseFilename` — unicode/spaces → `"caf-c-te"` | PASS |
| 4 | `getTurnoverWithAccess` — returns turnover for owner in same org | PASS |
| 5 | `getTurnoverWithAccess` — returns null when not found | PASS |
| 6 | `getTurnoverWithAccess` — returns null for wrong org | PASS |
| 7 | `getTurnoverWithAccess` — returns null for cleaner without assignment | PASS |
| 8 | `getTurnoverWithAccess` — returns turnover for cleaner with assignment | PASS |
| 9 | `getTurnoverPhotos` — returns all photos | PASS |
| 10 | `getTurnoverPhotos` — calls with flaggedOnly filter | PASS |

### A2. Turnover ZIP Export (`turnover-zip.test.ts`)

| # | Test | Result |
|---|------|--------|
| 1 | Returns 401 when unauthenticated | PASS |
| 2 | Returns 404 when turnover not found | PASS |
| 3 | Returns 400 when no photos to export | PASS |
| 4 | Returns ZIP with correct Content-Disposition for all photos | PASS |
| 5 | Returns ZIP with `_flagged` suffix when `flagged_only=true` | PASS |
| 6 | Does not crash when a photo fails to download from R2 | PASS |

### A3. PDF Report (`report.test.ts`)

| # | Test | Result |
|---|------|--------|
| 1 | Returns 401 when unauthenticated | PASS |
| 2 | Returns 404 when turnover not found | PASS |
| 3 | Returns 400 when no photos to export | PASS |
| 4 | Returns PDF with correct Content-Type and filename | PASS |
| 5 | Renders PDF with flagged photos when they exist | PASS |

### A4. Property Bulk Export (`property-export.test.ts`)

| # | Test | Result |
|---|------|--------|
| 1 | Returns 401 when unauthenticated | PASS |
| 2 | Returns 403 when user is not owner | PASS |
| 3 | Returns 400 when from/to params missing | PASS |
| 4 | Returns 404 when property not in org | PASS |
| 5 | Returns 400 when no turnovers in date range | PASS |
| 6 | Returns 400 when turnovers exist but no photos | PASS |
| 7 | Returns ZIP with correct filename for valid request | PASS |

### Unit Test Bugs Found & Fixed

#### Bug U1: `PassThrough` mock arrow function can't be `new`'d

**Files:** `turnover-zip.test.ts`, `property-export.test.ts`
**Error:** `TypeError: () => value is not a constructor`
**Root cause:** `vi.fn(() => mockPT)` creates an arrow function. The route code does `new PassThrough()` which requires a constructor.
**Fix:** Changed mock to a regular function:
```js
vi.mock("stream", () => ({
  PassThrough: function () {
    return MockPassThroughInstance;
  },
}));
```

#### Bug U2: Report test imported wrong route

**File:** `report.test.ts`
**Error:** `TypeError: Cannot read properties of undefined (reading 'searchParams')`
**Root cause:** Import path `../../route` resolved to the ZIP route (`[id]/route.ts`) instead of the report route (`report/route.ts`).
**Fix:** Changed import to `../route`.

#### Bug U3: Destructuring mismatch after PassThrough rename

**File:** `turnover-zip.test.ts`
**Error:** `ReferenceError: MockPassThroughInstance is not defined`
**Root cause:** Destructuring at line 13 still used `mockPassThrough` while the hoisted return key was renamed to `MockPassThroughInstance`.
**Fix:** Updated destructuring to match the key name.

---

## B. Browser Use-Case Tests

**Target:** `https://stayd-banda.vercel.app`
**User:** Phase2 Tester (owner role)
**Test turnover:** Debug Test Property, 1 Mar 2026 → 2 Mar 2026, departing guest ref: P5-EXPORT-TEST

### Summary

| TC | Test Case | Result | Notes |
|----|-----------|--------|-------|
| TC1 | Export buttons render on turnover detail | PARTIAL | Buttons render correctly; full test blocked — no photos uploadable |
| TC2 | Export buttons disabled when no photos | **PASS** | "Download ZIP" and "Download report" grayed/disabled; "Download flagged" hidden |
| TC3 | Download ZIP | BLOCKED | Requires photos; upload broken (see Bug B1, B2) |
| TC4 | Download flagged ZIP | BLOCKED | Requires flagged photos |
| TC5 | Download PDF report | BLOCKED | Requires photos |
| TC6 | Property export card renders | **PASS** | "Export" card visible with From/To date inputs and "Download all turnovers" button |
| TC7 | Property export button disabled without dates | **PASS** | Button is `disabled: true` with `cursor-not-allowed` class |
| TC8 | Property export with valid dates | PARTIAL | With turnovers but 0 photos → correctly shows "No photos to export" error; full download test blocked |
| TC9 | Property export with empty range | **PASS** | Error alert: "No turnovers in date range" |
| TC10 | Property export not visible to cleaners | SKIPPED | Would require separate cleaner login |

**Passed: 4 | Partial: 2 | Blocked: 3 | Skipped: 1**

### Critical Deployment Bugs Found

#### Bug B1: `R2_BUCKET_NAME` has trailing newline (CRITICAL)

**Impact:** All photo uploads fail on Vercel deployment
**Evidence:** Presigned URL path contains `banda-photos%0A/` — the `%0A` is a URL-encoded newline character
**Root cause:** The `R2_BUCKET_NAME` environment variable in Vercel has a trailing newline, which gets embedded into every presigned URL generated by the S3 SDK.
**Diagnosis steps:**
1. Presign API returns 200 with valid-looking response
2. PUT to presigned URL fails with "Failed to fetch"
3. Inspecting the URL shows `banda-photos%0A/` instead of `banda-photos/`

**Fix applied (code-level):** Added `.trim()` to bucket name in `src/lib/r2.ts`:
```ts
// Before
const BUCKET = process.env.R2_BUCKET_NAME!;
// After
const BUCKET = process.env.R2_BUCKET_NAME!.trim();
```

**Fix required (infra):** Also clean up the `R2_BUCKET_NAME` value in the Vercel environment variables dashboard to remove the trailing newline.

#### Bug B2: R2 CORS missing Vercel origin (CRITICAL)

**Impact:** All photo uploads from `stayd-banda.vercel.app` are blocked by CORS
**Evidence:** Browser PUT to R2 presigned URL fails with "Failed to fetch" (CORS preflight rejection)
**Root cause:** The R2 bucket CORS configuration (per `03_PHASE_UPLOAD.md`) only allows:
- `https://banda.stayd-tools.com`
- `http://localhost:3000`

The Vercel deployment origin `https://stayd-banda.vercel.app` is not in the allowed origins list.

**Fix required:** Add `https://stayd-banda.vercel.app` to the R2 bucket CORS configuration:
```json
[
  {
    "AllowedOrigins": [
      "https://banda.stayd-tools.com",
      "https://stayd-banda.vercel.app",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

### Browser Test Details

**TC2 — Export buttons disabled when no photos:**
- Navigated to turnover detail page (0 photos)
- "Download ZIP" button: visible, grayed out, `border-gray-300 text-gray-400 cursor-not-allowed`
- "Download report" button: visible, grayed out, same disabled styling
- "Download flagged" button: correctly hidden (`hasFlaggedPhotos` is false → not rendered)
- "Upload photos" button: active/enabled (dark green)

**TC6 — Property export card renders:**
- Navigated to property detail page
- Export card visible in sidebar with:
  - Title: "Export"
  - Subtitle: "Download all turnover photos in a date range"
  - "From" date input (type=date)
  - "To" date input (type=date)
  - "Download all turnovers" button
  - Helper text: "Large date ranges may take a while to generate."

**TC7 — Download button disabled without dates:**
- Confirmed via JS: `disabled: true`, classes include `bg-gray-100 text-gray-400 cursor-not-allowed`

**TC9 — Empty date range error:**
- Set dates: From 01/01/2024 To 31/12/2024
- Clicked "Download all turnovers"
- Alert captured: "No turnovers in date range"

**TC8 (partial) — Valid date range, no photos:**
- Set dates: From 01/03/2026 To 31/03/2026 (covers our test turnover)
- Clicked "Download all turnovers"
- Alert captured: "No photos to export"
- Confirms API correctly finds turnovers but rejects when zero photos

---

## C. Fixes Applied

| # | Type | File | Description |
|---|------|------|-------------|
| 1 | Code fix | `src/lib/r2.ts:18` | Added `.trim()` to `R2_BUCKET_NAME` to prevent trailing whitespace/newlines from corrupting presigned URLs |

## D. Outstanding Issues

| # | Severity | Issue | Action Required |
|---|----------|-------|-----------------|
| 1 | CRITICAL | R2 CORS missing `https://stayd-banda.vercel.app` origin | Add origin to R2 bucket CORS config in Cloudflare dashboard |
| 2 | CRITICAL | `R2_BUCKET_NAME` env var has trailing newline in Vercel | Clean up the env var value in Vercel dashboard (code-level `.trim()` fix also applied) |
| 3 | LOW | Export error feedback uses `alert()` | Consider replacing with inline toast/banner for better UX |

## E. Test Artifacts

### Test files created
- `src/lib/__tests__/export-helpers.test.ts` — 10 tests
- `src/app/api/export/turnover/[id]/__tests__/turnover-zip.test.ts` — 6 tests
- `src/app/api/export/turnover/[id]/report/__tests__/report.test.ts` — 5 tests
- `src/app/api/export/property/[id]/__tests__/property-export.test.ts` — 7 tests

### Test data created on Vercel
- Property: "Debug Test Property" (`26d14c23-aa59-40a6-b48b-7ca5607033a6`)
- Turnover: 1 Mar → 2 Mar 2026 (`d64d34e0-44f2-4c22-97ec-abef5e47d67b`)
- Departing guest ref: P5-EXPORT-TEST
- Photos: 0 (upload blocked by bugs B1 + B2)

### Vitest run output
```
 ✓ src/lib/__tests__/r2.test.ts (5 tests) 3ms
 ✓ src/app/api/export/turnover/[id]/__tests__/turnover-zip.test.ts (6 tests) 9ms
 ✓ src/app/api/photos/__tests__/confirm.test.ts (11 tests) 12ms
 ✓ src/lib/__tests__/export-helpers.test.ts (10 tests) 15ms
 ✓ src/app/api/export/property/[id]/__tests__/property-export.test.ts (7 tests) 14ms
 ✓ src/app/api/turnovers/__tests__/turnovers.test.ts (8 tests) 8ms
 ✓ src/app/api/photos/__tests__/presign.test.ts (8 tests) 10ms
 ✓ src/app/api/export/turnover/[id]/report/__tests__/report.test.ts (5 tests) 30ms
 ✓ src/app/api/turnovers/__tests__/turnover-detail.test.ts (10 tests) 9ms

 Test Files  9 passed (9)
      Tests  70 passed (70)
   Duration  426ms
```
