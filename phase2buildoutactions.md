# Phase 2 Build Actions — Property & Area Management

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
