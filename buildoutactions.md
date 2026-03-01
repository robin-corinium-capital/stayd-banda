# Phase 1: Foundation


## What Was Built

### 1. Project Scaffold
- Next.js 16.1.6 with TypeScript, Tailwind CSS v4, App Router, `src/` directory
- Package name set to `stayd-banda`
- Added `db:generate`, `db:push`, `db:studio` npm scripts

### 2. Dependencies Installed

**Production:**
- `next-auth@beta` (v5.0.0-beta.30) + `@auth/core` — Auth.js v5 for App Router
- `@vercel/postgres` — serverless Postgres driver (HTTP-based)
- `drizzle-orm` — TypeScript ORM
- `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` — R2/S3 presigned URLs
- `bcryptjs` — password hashing
- `resend` — transactional email
- `sharp` — EXIF extraction and thumbnails (used in later phases)
- `dotenv` — env loading for drizzle-kit

**Dev:**
- `drizzle-kit` — migration generation and push
- `@types/bcryptjs`

### 3. Database Schema (`src/db/schema.ts`)

All 9 tables defined with Drizzle ORM `pgTable` helpers:

| Table | Columns | Purpose |
|---|---|---|
| `organisations` | 4 | Agency or owner account |
| `users` | 6 | Email, password hash, verification status |
| `org_members` | 5 | Links users to orgs with role (owner/cleaner/viewer) |
| `properties` | 10 | Holiday let properties |
| `property_assignments` | 4 | Assigns cleaners to properties |
| `areas` | 6 | Rooms/zones within a property |
| `turnovers` | 12 | Guest changeover records with dates and status |
| `photos` | 19 | Photo metadata, R2 keys, EXIF data, damage flags |
| `invites` | 10 | Invite tokens with expiry and role |

Relations defined for type-safe joins. Indexes on foreign keys and common query patterns. Unique constraints on org_members(org_id, user_id) and property_assignments(property_id, user_id).

Migration generated to `drizzle/0000_nostalgic_bulldozer.sql` and pushed to Vercel Postgres.

### 4. Database Client (`src/db/index.ts`)

Drizzle ORM instance using `@vercel/postgres` driver with schema for relational queries.

### 5. Drizzle Config (`drizzle.config.ts`)

Points at `POSTGRES_URL_NON_POOLING` (direct connection) for migrations. Loads env from `.env.local` via dotenv.

### 6. R2 Client (`src/lib/r2.ts`)

S3Client configured for Cloudflare R2. Three exported helpers:
- `getPresignedUploadUrl(key, contentType, maxSizeBytes)` — 15 min expiry
- `getPresignedDownloadUrl(key)` — 1 hour expiry
- `deleteObject(key)` — removes file from R2

### 7. Email Client (`src/lib/email.ts`)

Resend client with `sendEmail()` helper and three HTML templates:
- `inviteEmailHtml(inviteUrl, orgName, role)`
- `verificationEmailHtml(verifyUrl)`
- `passwordResetEmailHtml(resetUrl)`

### 8. Auth.js v5 (`src/lib/auth.ts`)

**Providers:**
- Credentials — email/password lookup via Drizzle, bcrypt comparison
- Google — OAuth with auto-provisioning on first sign-in

**Callbacks:**
- `signIn` — creates user + organisation + owner membership on first Google login
- `jwt` — attaches `id`, `orgId`, `role` to token
- `session` — exposes `id`, `orgId`, `role` on session.user

**Type augmentation** in `src/types/next-auth.d.ts` for `Session`, `User`, and `JWT`.

**Route handler** at `src/app/api/auth/[...nextauth]/route.ts`.

### 9. Registration API (`src/app/api/auth/register/route.ts`)

POST endpoint that:
1. Validates email format and password length (min 8)
2. Checks for existing user (409 if duplicate)
3. Hashes password with bcrypt (12 rounds)
4. Creates user, organisation, and org_member (role: owner)
5. Returns 201 on success

### 10. Auth Pages

**Login (`src/app/login/page.tsx`):**
- Google SSO button
- Email/password form
- Error display
- Link to register
- Respects `callbackUrl` query param

**Register (`src/app/register/page.tsx`):**
- Google SSO button
- Name/email/password form with validation
- Auto-signs in after successful registration
- Link to login

### 11. Root Layout (`src/app/layout.tsx`)

- Inter font
- SessionProvider wrapping all children
- Nav component rendered globally
- Meta: title "banda - Turnover Photo Documentation"

### 12. Navigation (`src/components/nav.tsx`)

- Logo: "banda" with "by stayd" subtitle
- Authenticated: Dashboard, Properties, Turnovers, Upload (cleaner only), user dropdown (Settings, Sign out)
- Unauthenticated: Login, Register
- Mobile: hamburger menu with full nav

### 13. Dashboard (`src/app/dashboard/page.tsx`)

Server component with auth check (redirects to /login if unauthenticated). Shows:
- Welcome message with org name (fetched from DB)
- Properties count (fetched from DB)
- Recent turnovers card (placeholder, 0)
- Flagged items card (placeholder, 0)

### 14. Landing Page (`src/app/page.tsx`)

- Hero: "Document every turnover. Prove every claim."
- Subheadline: "Free photo evidence tool for holiday let owners and agencies."
- CTA: "Get started" linking to /register
- Three feature cards: Before and after, Evidence that holds up, Built for cleaners
- Footer: "banda by stayd" / Corinium Capital Limited

### 15. Middleware (`src/middleware.ts`)

Protects all routes except:
- `/`, `/login`, `/register`, `/api/auth/*`, `/invite/*`
- Static assets (`_next/`, images, favicon)

Redirects unauthenticated users to `/login?callbackUrl=<original path>`.

### 16. Other Files

- `LICENCE` — MIT, Copyright 2026 Corinium Capital Limited
- `.gitignore` — covers `.env*`, `node_modules`, `.next/`, build artifacts
- `src/components/session-provider.tsx` — client-side NextAuth SessionProvider wrapper

## File Tree

```
stayd-banda/
├── LICENCE
├── drizzle.config.ts
├── drizzle/
│   ├── 0000_nostalgic_bulldozer.sql
│   └── meta/
├── package.json
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx                          (landing)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── dashboard/page.tsx
│   │   └── api/
│   │       └── auth/
│   │           ├── [...nextauth]/route.ts
│   │           └── register/route.ts
│   ├── components/
│   │   ├── nav.tsx
│   │   └── session-provider.tsx
│   ├── db/
│   │   ├── schema.ts
│   │   └── index.ts
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── r2.ts
│   │   └── email.ts
│   ├── middleware.ts
│   └── types/
│       └── next-auth.d.ts
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
└── eslint.config.mjs
```

## Done When Checklist

- [x] Landing page renders at /
- [x] User can register with email/password
- [x] User can sign in with Google SSO
- [x] Registration creates an organisation and sets user as owner
- [x] Authenticated user sees the dashboard shell
- [x] Unauthenticated user is redirected to /login
- [x] Database has all tables created and accessible
- [x] R2 client utility exists and can generate presigned URLs
- [ ] Deployed to Vercel EU region — code ready, needs git push + Vercel env vars

## Deployment Notes

Before deploying, add these env vars in the Vercel dashboard (POSTGRES_* should already be auto-populated):
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (set to `https://banda.stayd-tools.com`)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_ENDPOINT`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_APP_URL` (set to `https://banda.stayd-tools.com`)

Vercel region should be set to `lhr1` (London). Configure custom domain `banda.stayd-tools.com` in the Vercel dashboard.

---

# Phase 2: Property & Area Management


## Status: Complete

## What Was Built

### 1. Auth Helper Utility (`src/lib/auth-helpers.ts`)
- `getSessionOrNull()` — returns typed session or null for server components
- `getApiSession()` — returns session or 401 NextResponse for API routes
- `isAuthError()` — type guard to check if result is error response
- `isOwner()` — checks user role

### 2. Properties API Routes

**`GET /api/properties`** (`src/app/api/properties/route.ts`)
- Lists all properties for user's org
- Cleaners only see assigned properties (via `property_assignments`)
- Owners/viewers see all org properties
- Ordered by name

**`POST /api/properties`** (`src/app/api/properties/route.ts`)
- Creates a property (owner only)
- Validates name is required
- Sets org_id from session
- Returns 201 with created property

**`GET /api/properties/[id]`** (`src/app/api/properties/[id]/route.ts`)
- Returns property with areas
- Verifies property belongs to user's org
- Cleaners: checks assignment exists
- Areas ordered by sort_order then name

**`PATCH /api/properties/[id]`** (`src/app/api/properties/[id]/route.ts`)
- Updates property fields (owner only)
- Supports: name, address, propertyType, bedrooms, notes, isActive
- Sets updatedAt timestamp

**`DELETE /api/properties/[id]`** (`src/app/api/properties/[id]/route.ts`)
- Deletes property (owner only, cascades to areas/turnovers/photos via FK)

### 3. Areas API Routes (`src/app/api/properties/[id]/areas/route.ts`)

**`GET`** — list areas for a property (ordered by sort_order, name)
**`POST`** — create area (owner only, body: `{ name, description?, sortOrder? }`)
**`PATCH`** — update area (owner only, body: `{ areaId, name?, description?, sortOrder? }`)
**`DELETE`** — delete area (owner only, query param: `?areaId=xxx`)

All area routes verify:
1. User is authenticated
2. Property belongs to user's org
3. Area belongs to the property (for PATCH/DELETE)
4. User is owner (for write operations)

### 4. Properties Pages

**`/properties`** (`src/app/properties/page.tsx`) — Server component
- Lists all properties as cards in a responsive grid
- Shows name, address, property type, bedrooms, area count
- Empty state with CTA for owners
- Cleaners see only assigned properties
- "Add property" button for owners

**`/properties/new`** (`src/app/properties/new/page.tsx`) — Client component
- Form: name (required), address, property type (dropdown), bedrooms, notes
- Property types: house, flat, cottage, bungalow, lodge, cabin, other
- Redirects to property detail on success

**`/properties/[id]`** (`src/app/properties/[id]/page.tsx`) — Server component
- Property header with name, address, type, bedrooms, active status, notes
- Areas list (ordered by sort_order)
- Sidebar stats: area count, turnover count
- "Manage areas" link for owners
- Actions dropdown (edit, manage areas, delete) for owners

**`/properties/[id]/edit`** (`src/app/properties/[id]/edit/page.tsx`) — Client component
- Pre-populated form with all property fields
- Active/inactive toggle
- Saves via PATCH

**`/properties/[id]/areas`** (`src/app/properties/[id]/areas/page.tsx`) — Client component
- Add area form at top (name + optional description)
- Area list with reorder buttons (up/down arrows swap sort_order)
- Inline edit mode for each area
- Delete with confirmation
- "Done" button returns to property detail

**`/properties/[id]/property-actions.tsx`** — Client component
- Actions dropdown menu (Edit, Manage areas, Delete)
- Delete confirmation modal with warning about cascading deletes

### 5. Dashboard Update (`src/app/dashboard/page.tsx`)
- Properties card now links to `/properties`
- Turnovers card shows real count (joined through properties for org scoping)
- Flagged items card shows real flagged photo count
- "Get started" CTA when owner has 0 properties (links to `/properties/new`)

## File Tree (new files)

```
src/
├── app/
│   ├── api/
│   │   └── properties/
│   │       ├── route.ts                    (GET list, POST create)
│   │       └── [id]/
│   │           ├── route.ts                (GET, PATCH, DELETE)
│   │           └── areas/
│   │               └── route.ts            (GET, POST, PATCH, DELETE)
│   ├── dashboard/
│   │   └── page.tsx                        (updated — real counts, links)
│   └── properties/
│       ├── page.tsx                        (list)
│       ├── new/
│       │   └── page.tsx                    (create form)
│       └── [id]/
│           ├── page.tsx                    (detail)
│           ├── property-actions.tsx        (actions dropdown + delete modal)
│           ├── edit/
│           │   └── page.tsx                (edit form)
│           └── areas/
│               └── page.tsx                (manage areas)
├── lib/
│   └── auth-helpers.ts                     (auth utility)
```

## Build Output

```
Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/auth/[...nextauth]
├ ƒ /api/auth/register
├ ƒ /api/properties
├ ƒ /api/properties/[id]
├ ƒ /api/properties/[id]/areas
├ ƒ /dashboard
├ ○ /login
├ ƒ /properties
├ ƒ /properties/[id]
├ ƒ /properties/[id]/areas
├ ƒ /properties/[id]/edit
├ ○ /properties/new
└ ○ /register
```

No TypeScript errors. Build succeeds.

## Done When Checklist

- [x] Owner can create a property with name, address, type, bedrooms, notes
- [x] Owner can edit a property
- [x] Owner can delete a property
- [x] Owner can create areas within a property
- [x] Owner can edit and delete areas
- [x] Owner can reorder areas
- [x] Properties list shows all properties for the user's org
- [x] Property detail page shows areas
- [x] All API routes validate auth and org membership
- [x] Cleaners can only see assigned properties in the list
- [x] Dashboard links to properties
- [x] Build succeeds with no TypeScript errors

---

# Phase 3: Turnovers & Photo Upload


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

---

# Phase 4: Retrieval & Search


## Status: COMPLETE

All Phase 4 features implemented. TypeScript compiles clean (only pre-existing test file errors remain).

---

## What Was Built

### Step 1: API Enhancements
- **`GET /api/turnovers`** — Extended with pagination (`page`, `limit`), free-text search (`search` on guest refs), `has_damage` filter (exists subquery on flagged photos), `sort` (checkout/checkin asc/desc). Returns `{ turnovers, totalCount, page, limit, totalPages }`.
- **Auto-complete** — Turnovers with `checkinDate < now - 24h` and `status = 'in_progress'` are auto-completed when the turnovers list is loaded.
- **`GET /api/dashboard/flagged`** — New endpoint returning 10 most recent flagged photos with thumbnails, property/area names, turnover dates, damage notes.
- **`GET /api/turnovers/[id]/photos`** — Added left join to users table, returning `uploaderName` for each photo.

### Step 2: Turnover Detail Page
- **Property name linked** to `/properties/[id]`
- **Mark Complete button** — Prominent green button for owners when status is not complete
- **Disabled placeholders** for "Download ZIP" and "Download report" (Phase 5)
- **`<PhotoSections>`** — New client component replacing PhotoGrid with:
  - Desktop: two columns side-by-side (post_checkout left, pre_checkin right)
  - Mobile: tabbed view with count badges
  - Photos grouped by area within each column/tab
  - Areas with no photos show "No photos" placeholder
  - Flagged photos have red ring border and damage dot indicator
  - Capture timestamp shown below each thumbnail

### Step 3: Full-Size Photo Viewer
- **`<PhotoViewer>`** — Full-screen modal overlay with:
  - Full-size image loaded via presigned URL (lazy loaded with prefetch ±1)
  - Arrow key and swipe navigation
  - Photo counter (e.g. "3 / 12")
  - Loading spinner while image fetches
  - Close on Escape or X button
- **`<PhotoMetadata>`** — Sidebar (desktop) / bottom sheet (mobile) showing:
  - Upload and capture timestamps
  - GPS coordinates with "Open in Maps" link
  - Device make/model, uploader name, area, photo set
  - File size, original filename
- **`<PhotoActions>`** — Damage flag toggle, damage note textarea (debounced 500ms), area reassignment dropdown (owner only). All changes save via PATCH and propagate back to the parent.

### Step 4: Filterable Turnovers List
- **Filter bar** — Property dropdown, status toggle buttons, date range inputs, search with 300ms debounce, "Has damage flags" toggle
- **Results** — Desktop table with sortable column headers, mobile card layout
- **Pagination** — "Showing X-Y of Z" with Previous/Next buttons, 20 per page
- **Sort** — Click column headers to toggle checkout/checkin asc/desc

### Step 5: Dashboard Flagged Items
- **Flagged Items stat card** now links to `/turnovers?has_damage=true`
- **`<FlaggedItemsSection>`** — Client component showing grid of flagged photo cards with thumbnails, property/area names, dates, damage notes. Links to turnover detail. Empty state with checkmark icon.

### Step 6: Cleanup
- Deleted old `photo-grid.tsx` (replaced by `photo-sections.tsx`)
- TypeScript compiles clean

---

## Files Changed

| Action | File |
|--------|------|
| Modified | `src/app/api/turnovers/route.ts` |
| Created | `src/app/api/dashboard/flagged/route.ts` |
| Modified | `src/app/api/turnovers/[id]/photos/route.ts` |
| Modified | `src/app/turnovers/[id]/page.tsx` |
| Created | `src/app/turnovers/[id]/photo-sections.tsx` |
| Modified | `src/app/turnovers/[id]/turnover-actions.tsx` |
| Created | `src/components/photo-viewer/photo-viewer.tsx` |
| Created | `src/components/photo-viewer/photo-metadata.tsx` |
| Created | `src/components/photo-viewer/photo-actions.tsx` |
| Modified | `src/app/turnovers/page.tsx` |
| Created | `src/app/turnovers/turnovers-list.tsx` |
| Modified | `src/app/dashboard/page.tsx` |
| Created | `src/app/dashboard/flagged-items.tsx` |
| Deleted | `src/app/turnovers/[id]/photo-grid.tsx` |

## Done When Checklist

- [x] Turnover detail shows post-checkout and pre-checkin photos grouped by area
- [x] Desktop: side-by-side columns for the two photo sets
- [x] Mobile: tabbed view for the two photo sets
- [x] Areas with no photos show "No photos" placeholder
- [x] Clicking a thumbnail opens full-size photo viewer
- [x] Viewer supports swipe/arrow navigation between photos
- [x] Viewer shows metadata overlay (timestamps, GPS, device, uploader)
- [x] GPS coordinates link to maps
- [x] Damage flag can be toggled from the viewer
- [x] Damage note editable from the viewer
- [x] Turnovers list has working filters: property, status, date range, has-damage
- [x] Turnovers list supports sorting and pagination
- [x] Dashboard shows flagged items across all properties
- [x] Owner can reassign a photo to a different area
- [x] "Mark complete" updates turnover status
- [x] Auto-complete triggers for overdue turnovers

---

# Rebrand: stayd Branding


## Overview

Applied the full stayd brand identity to the banda app, replacing generic Tailwind defaults (blue-600 primary, Inter font, no custom theme) with the stayd design system: racing green + bright green color palette, Plus Jakarta Sans + JetBrains Mono fonts, SVG logos, and consistent design tokens. The project uses **Tailwind CSS v4** (`@import "tailwindcss"` in CSS, `@theme` directive), so all brand tokens were defined in CSS rather than a v3 `tailwind.config.ts` preset.

TypeScript compiles clean (`npm run build` passes with zero errors across all 27 routes). Zero `blue-` class references remain in any `.tsx` file.

---

## Brand Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--color-brand` | `#00402E` (racing green) | Primary buttons, links, focus rings |
| `--color-brand-light` | `#005C42` | Hover states |
| `--color-brand-dim` | `rgba(0,64,46,0.10)` | In-progress badges, subtle backgrounds |
| `--color-brand-mid` | `rgba(0,64,46,0.25)` | Medium-emphasis backgrounds |
| `--color-accent` | `#00E5A0` (bright green) | Accent highlights, theme color |
| `--color-accent-dim` | `rgba(0,229,160,0.13)` | Accent badge backgrounds |
| `--color-surface` | `#f8f9fa` | Page background |
| `--color-surface-card` | `#ffffff` | Card background |
| `--color-surface-border` | `#e5e7eb` | Card/photo borders |
| `--color-status-pass` | `#00E5A0` | Complete status badges |
| `--color-status-flag` | `#ffa726` | Open/warning status badges |
| `--color-status-critical` | `#ff4757` | Flagged/error badges |
| `--radius-card` | `12px` | Card border radius |
| `--radius-btn` | `8px` | Button border radius |
| `--radius-badge` | `20px` | Badge border radius |
| `--font-sans` | Plus Jakarta Sans | Body text |
| `--font-mono` | JetBrains Mono | Code/monospace |

---

## Files Created (11 new)

### Brand Assets — Logos

| File | Description |
|------|-------------|
| `public/brand/stayd-horizontal-black.svg` | Horizontal logo, dark variant (used in nav) |
| `public/brand/stayd-horizontal-white.svg` | Horizontal logo, light variant |
| `public/brand/stayd-icon-colour.svg` | Icon-only logo, colour |
| `public/brand/stayd-icon-white.svg` | Icon-only logo, white |
| `public/brand/stayd-stacked-black.svg` | Stacked logo, dark variant |
| `public/brand/stayd-stacked-white.svg` | Stacked logo, light variant |

### UI Components

| File | Description |
|------|-------------|
| `src/components/ui/button.tsx` | Brand-styled button component with variant support |
| `src/components/ui/card.tsx` | Brand-styled card component |
| `src/components/ui/badge.tsx` | Brand-styled badge component |
| `src/components/ui/stayd-logo.tsx` | Logo component wrapping SVG assets |

### Config

| File | Description |
|------|-------------|
| `vitest.config.ts` | Vitest configuration (unrelated, pre-existing in working tree) |

---

## Files Modified (16 existing)

### Core Config & Layout

| File | Change |
|------|--------|
| `src/app/globals.css` | Added `@theme` block with all brand design tokens (colors, fonts, radii). Added `@layer base` with tap-highlight and safe-area-inset rules. |
| `src/app/layout.tsx` | Replaced `Inter` with `Plus_Jakarta_Sans` + `JetBrains_Mono` via `next/font/google`. Added CSS variables `--font-jakarta` and `--font-jetbrains` on `<html>`. Added `viewport` export with `themeColor: '#00E5A0'`. Changed body from `bg-gray-50` to `bg-surface`. |
| `src/components/nav.tsx` | Replaced text logo with SVG logo via `next/image` pointing to `/brand/stayd-horizontal-black.svg`. Replaced `bg-blue-600` / `hover:bg-blue-700` on buttons and avatar with `bg-brand` / `hover:bg-brand-light`. |

### Pages — Systematic Class Replacements

| File | Changes |
|------|---------|
| `src/app/page.tsx` | Hero CTA button, feature card icon backgrounds, footer logo — all rebranded. Feature icons use `bg-brand-dim`, `bg-accent-dim`, `bg-brand-mid`. |
| `src/app/dashboard/page.tsx` | Card hover rings, get-started callout link, all `blue-` references replaced with brand tokens. |
| `src/app/login/page.tsx` | Submit button, focus rings on inputs, "Register" link — all rebranded. |
| `src/app/register/page.tsx` | Submit button, focus rings on inputs, "Sign in" link — all rebranded. |
| `src/app/properties/page.tsx` | Add property button, card hover states, empty state CTA — all rebranded. |
| `src/app/properties/new/page.tsx` | Submit button, focus rings on all 5 inputs, card container — all rebranded. |
| `src/app/properties/[id]/page.tsx` | "Manage areas" link, empty state links, card containers (area rows, sidebar stats) — all rebranded. |
| `src/app/properties/[id]/edit/page.tsx` | Submit button, focus rings on 5 inputs, checkbox color, card container — all rebranded. |
| `src/app/properties/[id]/areas/page.tsx` | Add/save buttons, focus rings, area cards, delete modal — all rebranded. |
| `src/app/turnovers/page.tsx` | New turnover button, status badges (open/in_progress/complete/flagged), property links, table card — all rebranded. |
| `src/app/turnovers/new/page.tsx` | Submit button, focus rings on 5 inputs, "add property" link, card container — all rebranded. |
| `src/app/turnovers/[id]/page.tsx` | Upload button, status badges, empty state card, "upload photos" link — all rebranded. |
| `src/app/turnovers/[id]/photo-grid.tsx` | Spinner `border-t-blue-600` → `border-t-brand`. Photo container `ring-gray-200` → `ring-surface-border`. |
| `src/app/upload/page.tsx` | Empty state card, property cards, status badges, links — all rebranded. |
| `src/app/upload/[propertyId]/[turnoverId]/page.tsx` | Upload button, progress bar, drop zone hover, upload item cards, status text, retry link, focus rings — all rebranded. |

---

## Systematic Replacements Applied

### Colors

| Old class | New class |
|-----------|-----------|
| `bg-blue-600` | `bg-brand` |
| `hover:bg-blue-700` | `hover:bg-brand-light` |
| `text-blue-600` | `text-brand` |
| `hover:text-blue-500` | `hover:text-brand-light` |
| `focus:border-blue-500` | `focus:border-brand` |
| `focus:ring-blue-500` | `focus:ring-brand` |
| `text-blue-600` (checkbox) | `text-brand` |
| `border-t-blue-600` (spinner) | `border-t-brand` |
| `bg-blue-600` (progress bar) | `bg-brand` |
| `hover:border-blue-400 hover:bg-blue-50` (drop zone) | `hover:border-brand/40 hover:bg-brand-dim` |

### Status Badges

| Status | Old | New |
|--------|-----|-----|
| Open | `bg-yellow-100 text-yellow-800` | `bg-status-flag/20 text-status-flag` |
| In progress | `bg-blue-100 text-blue-800` | `bg-brand-dim text-brand` |
| Complete | `bg-green-100 text-green-800` | `bg-status-pass/20 text-status-pass` |
| Flagged | `bg-red-100 text-red-800` | `bg-status-critical/20 text-status-critical` |

### Surfaces & Radii

| Old class | New class |
|-----------|-----------|
| `bg-gray-50` (page bg) | `bg-surface` |
| `bg-white` (card bg) | `bg-surface-card` |
| `ring-gray-200` (card border) | `ring-surface-border` |
| `rounded-lg` (cards) | `rounded-card` |
| `rounded-md` (buttons) | `rounded-btn` |

---

## Key Design Decisions

1. **Tailwind v4 `@theme` over v3 preset** — the branding repo provides a v3-style preset, but banda uses Tailwind v4. All tokens were translated into `@theme` CSS custom properties, which Tailwind v4 automatically picks up as utility classes.
2. **Racing green for primary actions** — all primary buttons use `bg-brand` (#00402E) rather than bright green accent, per user preference. Accent green is reserved for status indicators and highlights.
3. **Status badge palette** — moved from generic Tailwind color classes (yellow-100, blue-100, green-100, red-100) to semantic status tokens (status-flag, brand-dim, status-pass, status-critical) for consistency and easier future theming.
4. **Font loading via next/font/google** — Plus Jakarta Sans and JetBrains Mono are loaded as CSS variable fonts with `next/font/google`, avoiding FOUT and ensuring fonts are self-hosted.
5. **Custom border radius tokens** — cards use `rounded-card` (12px) and buttons use `rounded-btn` (8px) via `@theme` custom properties, giving a softer, more polished look than Tailwind's default `rounded-lg` (8px) and `rounded-md` (6px).

---

# Phase 5: Export & Evidence Packs — Build Output

## Dependencies Installed
- `archiver` — ZIP file generation (streaming, server-side)
- `@react-pdf/renderer` — PDF generation in Node.js (no browser dependency)
- `@types/archiver` — TypeScript definitions (devDep)

## Config Changes

### vercel.json
- Added `functions` block: `src/app/api/export/**/*.ts` → `maxDuration: 60`
- Requires Vercel Pro ($20/month) to take effect. Free tier caps at 10s.

### next.config.ts
- Added `@react-pdf/renderer` to `serverExternalPackages` alongside `sharp`

## Files Created

### src/lib/export-helpers.ts
Shared utilities for all export routes:
- `getTurnoverWithAccess(turnoverId, session)` — fetches turnover + property, verifies org membership, checks cleaner assignment if applicable. Returns null if no access.
- `getTurnoverPhotos(turnoverId, flaggedOnly)` — fetches photos with uploader name and area name joined. Optionally filters to flagged photos only.
- `sanitiseFilename(str)` — lowercase, replace non-alphanumeric with hyphens.

### src/app/api/export/turnover/[id]/route.ts
**GET /api/export/turnover/:id** — ZIP download of all photos for a turnover.

Query params:
- `flagged_only=true` — only include damage-flagged photos

Flow:
1. Auth check via `getApiSession()`
2. Access check via `getTurnoverWithAccess()` (owners, cleaners with assignment, viewers)
3. Fetch photos (all or flagged only)
4. Stream ZIP using `archiver` piped through `PassThrough` → `ReadableStream`
5. Folder structure: `post-checkout/[area]/photo_001.jpg`, `pre-checkin/[area]/photo_002.jpg`
6. Downloads original images from R2 via `getObject()`
7. Returns `Content-Disposition: attachment` with descriptive filename

### src/app/api/export/turnover/[id]/report/route.ts
**GET /api/export/turnover/:id/report** — PDF evidence report.

The feature that makes banda directly useful for Airbnb damage claims.

Flow:
1. Auth + access check
2. Fetch areas, photos with metadata, uploader names
3. Download thumbnails from R2, convert to base64 data URLs for PDF embedding
4. Build PDF using `@react-pdf/renderer` with `React.createElement` (no JSX in .ts)
5. Return as `application/pdf` attachment

PDF structure:
- **Cover page**: Property name, address, checkout/checkin dates, guest references, photo count, flagged count, generation timestamp, "Generated by banda by stayd"
- **Area pages** (one per area with photos): Two-column layout — "After guest left" (post_checkout) vs "Before next guest" (pre_checkin). Each photo shows: capture timestamp, upload timestamp, device make/model, GPS coordinates, uploaded by. Flagged photos get red border + "DAMAGE FLAGGED" label + damage note.
- **Damage summary page** (if any flagged): Lists all flagged photos with thumbnail, area name, photo set, capture timestamp, damage note.
- **Footer on every page**: "Generated by banda (banda.stayd-tools.com). All photographs are original, unmodified uploads with server-verified timestamps. No AI generated or AI enhanced content." + page context.

### src/app/api/export/property/[id]/route.ts
**GET /api/export/property/:id?from=YYYY-MM-DD&to=YYYY-MM-DD** — bulk property download.

Flow:
1. Auth check — owners only (`isOwner()`)
2. Verify property belongs to org
3. Fetch turnovers where `checkout_date` falls within [from, to]
4. Fetch all photos for those turnovers using `inArray`
5. Stream ZIP with structure: `turnover_[checkout]_to_[checkin]/post-checkout/[area]/photo_NNN.ext`

### src/app/turnovers/[id]/export-buttons.tsx
Client component with three buttons:
- **Download ZIP** — all photos for the turnover
- **Download flagged** — only appears if flagged photos exist, red-tinted styling
- **Download report** — PDF evidence report

Features:
- Loading spinner per button while generating
- Disables all buttons during any download (prevents concurrent exports)
- Blob download pattern: fetch → blob → createObjectURL → click → revokeObjectURL
- Error handling with alert (keeps it simple for v1)
- Buttons disabled when no photos exist

### src/app/properties/[id]/property-export.tsx
Client component in property detail sidebar:
- Date range picker (from / to)
- "Download all turnovers" button
- Loading spinner during generation
- Warning text about large date ranges
- Only shown to owners when turnovers exist

## Files Modified

### src/app/turnovers/[id]/page.tsx
- Imported `ExportButtons` component
- Replaced two disabled `<button>` placeholders ("Download ZIP", "Download report") with `<ExportButtons>` component
- Passes: turnoverId, propertyName, checkoutDate, checkinDate, hasPhotos, hasFlaggedPhotos

### src/app/properties/[id]/page.tsx
- Imported `PropertyExport` component
- Added export card to sidebar (below turnovers stat card)
- Only rendered when `role === "owner"` and `turnoverCount > 0`

## Done Checklist (from 05_PHASE_EXPORT.md)

- [x] "Download all photos" button on turnover detail downloads a ZIP
- [x] ZIP contains correct folder structure (photo set > area > photos)
- [x] "Download flagged only" downloads ZIP with only flagged photos
- [x] "Download evidence report" generates and downloads a PDF
- [x] PDF has cover page with property name, address, dates, guest reference
- [x] PDF shows photos per area in two-column layout (post-checkout vs pre-checkin)
- [x] PDF shows metadata below each photo (timestamps, GPS, device, uploader)
- [x] Flagged photos have red border and damage note in the PDF
- [x] Damage summary page lists all flagged items
- [x] PDF footer on every page includes the "no AI content" statement
- [x] Bulk property download works with date range filter
- [x] Loading spinners show during file generation
- [x] Files download with readable filenames

## TypeScript Status
- Clean compile (tsc --noEmit passes, excluding pre-existing test file errors in __tests__/)

## Architecture Notes

### Why `React.createElement` instead of JSX
The PDF report route uses `React.createElement()` instead of JSX because the file is `.ts` not `.tsx`. This avoids needing to rename the API route file and keeps it consistent with the other route files in the project. The dynamic import pattern (`await import("@react-pdf/renderer")`) is used because `@react-pdf/renderer` is an ESM module.

### Streaming ZIP approach
ZIPs are built using `archiver` → `PassThrough` (Node stream) → `ReadableStream` (Web API). This streams the ZIP to the client as it's built rather than buffering the entire ZIP in memory. Each photo is fetched from R2 sequentially and appended to the archive.

### PDF image handling
Thumbnails are used instead of originals to keep PDF file size manageable. Images are fetched from R2, converted to base64 data URLs, and embedded directly in the PDF. For turnovers with 100+ photos this could produce a large PDF, but it's acceptable for v1.

### Access control
- Turnover ZIP + report: any org member with access to the property (owners, assigned cleaners, viewers)
- Bulk property export: owners only (prevents cleaners from downloading data for properties they shouldn't have bulk access to)
