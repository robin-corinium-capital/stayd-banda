# Phase 3 Build Actions — Turnovers & Photo Upload

## Overview

Phase 3 implements the core product functionality: turnover management and photo upload with EXIF extraction, HEIC conversion, thumbnail generation, and damage flagging. All API routes enforce org-scoped access control and cleaner-assignment checks consistent with Phases 1–2.

TypeScript compiles clean (`npx tsc --noEmit` passes with zero errors).

---

## Files Created (13 new)

### API Routes — Turnover CRUD

| File | What it does |
|------|-------------|
| `src/app/api/turnovers/route.ts` | **GET** lists turnovers with filters (property, status, date range) and aggregated photo/flagged counts. **POST** creates a turnover with date validation and property-access checks. |
| `src/app/api/turnovers/[id]/route.ts` | **GET** fetches turnover detail with areas + photos grouped by set. **PATCH** updates status/guest refs (owner or creator). **DELETE** removes turnover, deletes all R2 objects first, then cascades DB rows. |
| `src/app/api/turnovers/[id]/photos/route.ts` | **GET** lists photos for a turnover with presigned thumbnail URLs, grouped by photo_set and area. |

### API Routes — Photo Upload & Management

| File | What it does |
|------|-------------|
| `src/app/api/photos/presign/route.ts` | **POST** validates file type (JPEG/PNG/HEIC) and size (≤20 MB), checks turnover access, generates R2 key (`{org}/{property}/{turnover}/{uuid}.ext`), returns presigned PUT URL (15 min expiry). |
| `src/app/api/photos/confirm/route.ts` | **POST** confirms upload: downloads from R2, extracts EXIF (capture timestamp, GPS, device make/model), converts HEIC→JPEG via Sharp, generates 400 px thumbnail, inserts photo row, auto-advances turnover status from "open" → "in_progress". |
| `src/app/api/photos/[id]/route.ts` | **PATCH** updates damage flag, damage note, or area assignment (owner or uploader). **DELETE** removes R2 objects + DB row (owner only). |
| `src/app/api/photos/[id]/original/route.ts` | **GET** returns a presigned download URL for the original image (1 hr expiry). |

### UI Pages — Turnover Management

| File | What it does |
|------|-------------|
| `src/app/turnovers/new/page.tsx` | Client form: property dropdown, checkout/checkin date pickers, guest reference fields. POSTs to `/api/turnovers`, redirects to detail page on success. |
| `src/app/turnovers/[id]/page.tsx` | Server component: turnover header with status badge, 3-column stats row (post-checkout / pre-checkin / flagged counts), photo sections grouped by set, links to upload. |
| `src/app/turnovers/[id]/turnover-actions.tsx` | Client component: actions dropdown (mark complete / reopen, delete with confirmation modal). |
| `src/app/turnovers/[id]/photo-grid.tsx` | Client component: loads thumbnail URLs, groups photos by area, renders grid with damage-flag indicators and hover overlay. |

### UI Pages — Photo Upload

| File | What it does |
|------|-------------|
| `src/app/upload/page.tsx` | Upload hub: lists open/in-progress turnovers grouped by property. Auto-redirects if only one active turnover. |
| `src/app/upload/[propertyId]/[turnoverId]/page.tsx` | Main upload interface: photo-set toggle (after guest left / before next guest), area selector, file picker (multi-select), upload queue with progress bars, concurrent uploads (3 at a time), retry on failure, success summary with "view turnover" link. |

---

## Files Modified (4 existing)

| File | Change |
|------|--------|
| `next.config.ts` | Added `serverExternalPackages: ["sharp"]` so Sharp's native binaries work in serverless. |
| `src/lib/r2.ts` | Added `getObject(key)` (returns Buffer) and `putObject(key, body, contentType)` for server-side image processing (thumbnail generation, HEIC conversion). |
| `src/app/turnovers/page.tsx` | Replaced "coming soon" placeholder with full turnovers list: table with property name, dates, status badge, photo counts (post-checkout / pre-checkin), flagged count. "New turnover" button. |
| `src/app/dashboard/page.tsx` | Made turnovers card a clickable `<Link>` to `/turnovers` (was a plain `<div>`). |

---

## Upload Flow (3-step presigned URL pattern)

```
Client                          Server                        R2
  |                               |                            |
  |-- POST /api/photos/presign -->|                            |
  |   {turnover_id, filename,     |                            |
  |    content_type, file_size}   |-- validates access ------->|
  |<-- {presignedUrl, r2Key} -----|                            |
  |                               |                            |
  |-- PUT presignedUrl ---------->|                            |
  |   (binary file body)         |                        --> R2 bucket
  |<-- 200 OK -------------------|                            |
  |                               |                            |
  |-- POST /api/photos/confirm -->|                            |
  |   {r2_key, turnover_id,       |-- getObject(r2Key) ------>|
  |    area_id, photo_set, ...}   |<-- image buffer -----------|
  |                               |-- sharp: EXIF, thumb,      |
  |                               |   HEIC→JPEG conversion     |
  |                               |-- putObject(thumb) ------->|
  |                               |-- INSERT photos row        |
  |<-- photo record --------------|                            |
```

---

## Access Control Summary

| Action | Owner | Cleaner (assigned) | Viewer |
|--------|-------|--------------------|--------|
| List turnovers | All org turnovers | Only assigned-property turnovers | All org turnovers |
| Create turnover | Any org property | Only assigned properties | Any org property |
| Update turnover | Yes | Only if creator | No |
| Delete turnover | Yes | No | No |
| Upload photos | Yes | Yes (assigned) | Yes |
| Update photo (flag/note) | Yes | Only if uploader | No |
| Delete photo | Yes | No | No |

---

## Key Design Decisions

1. **Presigned URLs** — files go direct to R2, never through our server's upload bandwidth. Server only handles the small confirm payload.
2. **Server-side Sharp** — EXIF extraction, HEIC→JPEG conversion, and 400 px thumbnail generation all happen in the confirm step, so every photo gets a web-friendly thumbnail regardless of original format.
3. **Concurrent upload queue** — the upload UI processes up to 3 files simultaneously with per-file progress tracking, retry, and remove.
4. **Auto status progression** — first photo upload moves turnover from "open" → "in_progress" automatically.
5. **R2 cleanup before cascade** — turnover DELETE fetches all R2 keys before deleting the DB record (which cascades photo rows), ensuring storage objects aren't orphaned.
