# stayd-banda: Shared Context

Upload this file with EVERY build session. It contains the project identity, stack decisions, data model, database schema, API routes, page structure, and environment variables that all phases reference.

## Project Identity

**Name:** stayd-banda (Before and After)
**Repo:** stayd-banda on GitHub (public, open source, MIT licence)
**Domain:** banda.stayd-tools.com
**Description:** Free turnover photo documentation tool for UK holiday let owners, agencies, and cleaners. First visible feature of stayd's open source property operations platform.

## Why It Exists

Airbnb updated its Host Damage Protection Terms in February 2026 to explicitly ban AI generated evidence in damage claims and introduced a "reasonable care" clause that lets them reject repeat claimers who lack documentation. Most hosts take photos on their phones and lose them. Agencies managing 30+ properties have no consistent process. This tool solves that.

## Who Uses It

1. **Owner/Manager** (full access): creates properties, manages areas, invites cleaners, views all photos, downloads evidence packs, manages account
2. **Cleaner** (scoped access): uploads photos and flags issues for assigned properties only. Cannot delete properties, view other properties, or access account settings
3. **Viewer** (read only): can view photos for properties they are granted access to. Optional for v1

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend + API | Next.js 14+ (App Router), TypeScript | SSR for marketing pages, React for app. Single deployable |
| Auth | Auth.js v5 (NextAuth) | Email/password + Google SSO. Self-hosted |
| Database | Vercel Postgres (Neon under the hood) | Never sleeps, env vars auto-populated, EU region available |
| ORM | Drizzle ORM | Lightweight, native TypeScript, great serverless support. Uses @vercel/postgres driver |
| Object Storage | Cloudflare R2 (EU jurisdiction) | S3-compatible, zero egress fees |
| Image Processing | Sharp | EXIF extraction, thumbnails. Node.js |
| Hosting | Vercel (EU region: lhr1 London) | Hosting, database, and edge functions in one platform |
| Email | Resend | Transactional emails (invites, password reset) |

### Why These Choices

Vercel Postgres over Supabase: Supabase pauses on inactivity. Cleaners use this tool sporadically, sometimes weeks between turnovers. Vercel Postgres (Neon) never sleeps. Environment variables auto-populate into the Vercel project. One fewer account to manage.

Drizzle over Prisma: Lighter, faster cold starts on serverless, native TypeScript schema definition. Works with @vercel/postgres serverless driver (HTTP-based, no persistent TCP connections to manage).

R2 over S3: Identical API, zero egress. When an agency downloads 200 photos for a claim, bandwidth is free on R2. Critical for a free tool.

Next.js over separate API + SPA: Fewer moving parts. Auth, API routes, and frontend in one project. Faster to build solo.

Vercel over a custom server: Presigned URL pattern means photos go directly from cleaner's phone to R2, bypassing the server. No heavy lifting needed server-side for v1.

### European Data Residency (non-negotiable)

- Vercel Postgres: select EU region (Frankfurt) when creating the database in the Vercel dashboard
- Cloudflare R2 bucket with EU jurisdiction hint
- Vercel deployment to lhr1 (London) region

### Cost (v1 testing with 5 users)

Everything runs on free tiers. Zero cost.
- Vercel Hobby: free (hosting + Postgres with 256MB storage, 60 compute hours/month)
- Cloudflare R2: free (10GB storage, zero egress)
- Resend: free (100 emails/day)
- Auth.js: open source
- Google OAuth: free

Upgrade to Vercel Pro ($20/month) when you reach Phase 5 (exports). The free tier's 10 second function timeout is too short for ZIP/PDF generation. Pro gives 60 seconds.

## Data Model

```
Organisation (the agency or individual owner account)
  > Property (a holiday let)
    > Area (kitchen, bedroom 1, bathroom, garden, etc.)
      > Turnover (linked to checkout date + checkin date)
        > Photo Set: "post_checkout" or "pre_checkin"
          > Photo (image file + metadata)
```

A Turnover is the gap between one guest leaving and the next arriving. Two photo sets per turnover:
- post_checkout: condition after the departing guest left
- pre_checkin: condition after cleaning, before the next guest arrives

Comparing these two sets proves a specific guest caused specific damage.

## Key Rules

- Every photo timestamped server-side at point of upload (do not rely solely on client timestamps)
- Extract and store EXIF metadata (GPS, device info, original capture timestamp) on upload
- Strip EXIF from any publicly accessible image URLs
- Store original unmodified image files. Never apply filters, enhancements, or compression that alters content
- All data stored in Europe

## Database Schema

Define this schema using Drizzle ORM in src/db/schema.ts. The SQL below shows the target structure. Drizzle will generate and run migrations from the TypeScript schema definition.

```sql
-- Organisations
CREATE TABLE organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organisation memberships
CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'cleaner', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- Properties
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  property_type TEXT,
  bedrooms INTEGER,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cleaner property assignments
CREATE TABLE property_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, user_id)
);

-- Areas within a property
CREATE TABLE areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turnovers
CREATE TABLE turnovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  checkout_date DATE NOT NULL,
  checkin_date DATE NOT NULL,
  departing_guest_ref TEXT,
  arriving_guest_ref TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'complete')),
  retention_extended BOOLEAN DEFAULT FALSE,
  retention_notified_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Photos
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turnover_id UUID REFERENCES turnovers(id) ON DELETE CASCADE,
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  photo_set TEXT NOT NULL CHECK (photo_set IN ('post_checkout', 'pre_checkin')),
  r2_key_original TEXT NOT NULL,
  r2_key_thumbnail TEXT,
  original_filename TEXT,
  file_size_bytes BIGINT,
  mime_type TEXT,
  upload_timestamp TIMESTAMPTZ DEFAULT NOW(),
  capture_timestamp TIMESTAMPTZ,
  gps_latitude DOUBLE PRECISION,
  gps_longitude DOUBLE PRECISION,
  device_make TEXT,
  device_model TEXT,
  is_damage_flagged BOOLEAN DEFAULT FALSE,
  damage_note TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invite links
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('cleaner', 'viewer')),
  property_ids UUID[],
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_by UUID REFERENCES users(id),
  used_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_photos_turnover ON photos(turnover_id);
CREATE INDEX idx_photos_area ON photos(area_id);
CREATE INDEX idx_turnovers_property ON turnovers(property_id);
CREATE INDEX idx_turnovers_dates ON turnovers(checkout_date, checkin_date);
CREATE INDEX idx_properties_org ON properties(org_id);
CREATE INDEX idx_org_members_user ON org_members(user_id);
CREATE INDEX idx_property_assignments_user ON property_assignments(user_id);
```

## API Routes (Next.js App Router)

```
/api/auth/[...nextauth]     -- Auth.js handlers
/api/auth/register           -- Email/password registration

/api/organisations           -- GET (list user's orgs)
/api/organisations/[id]      -- GET, PATCH

/api/properties              -- GET (list), POST (create)
/api/properties/[id]         -- GET, PATCH, DELETE
/api/properties/[id]/areas   -- GET, POST, PATCH, DELETE
/api/properties/[id]/assign  -- POST (assign cleaner), DELETE (revoke)

/api/turnovers               -- GET (list, filterable), POST (create)
/api/turnovers/[id]          -- GET, PATCH (update status/notes), DELETE
/api/turnovers/[id]/photos   -- GET (list photos for turnover)

/api/photos/presign          -- POST (get presigned R2 upload URL)
/api/photos/confirm          -- POST (confirm upload, trigger EXIF extraction)
/api/photos/[id]             -- GET, PATCH (add note/flag), DELETE
/api/photos/[id]/original    -- GET (presigned download URL for original)

/api/invites                 -- POST (create invite), GET (list pending)
/api/invites/[token]         -- GET (validate), POST (accept)

/api/export/turnover/[id]    -- GET (ZIP download of all photos)
/api/export/turnover/[id]/report -- GET (PDF evidence report)
/api/export/property/[id]    -- GET (bulk download with date range params)
```

## Page Structure

```
/                            -- Marketing landing page (public)
/login                       -- Login
/register                    -- Registration
/invite/[token]              -- Accept invite

/dashboard                   -- Organisation overview. Property list, recent turnovers, flagged items
/properties                  -- Property list
/properties/new              -- Create property
/properties/[id]             -- Property detail: areas, assigned cleaners, recent turnovers
/properties/[id]/areas       -- Manage areas

/turnovers                   -- All turnovers (filterable by property, date)
/turnovers/[id]              -- Turnover detail: photo sets side by side, metadata, notes
/turnovers/new               -- Create turnover (select property, enter dates)

/upload                      -- Cleaner upload interface (simplified, mobile-first)
/upload/[propertyId]         -- Upload photos for a specific property
/upload/[propertyId]/[turnoverId] -- Upload to a specific turnover

/settings                    -- Account settings, organisation settings
/settings/team               -- Manage members and invites
```

## Environment Variables

```
# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Database (auto-populated by Vercel when you create a Postgres database)
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=
POSTGRES_USER=
POSTGRES_HOST=
POSTGRES_PASSWORD=
POSTGRES_DATABASE=

# Object Storage
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=           # https://<account-id>.r2.cloudflarestorage.com

# Email
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=   # https://banda.stayd-tools.com
```

Note: The POSTGRES_* variables are automatically added to your Vercel project when you create a Postgres database in the Vercel dashboard. You only need to copy them to .env.local for local development.

## Things Deliberately Left Out of v1

- Offline-first (too complex, revisit based on feedback)
- Calendar/PMS integration (comes later with Lodgify connection)
- Automated turnover creation from booking data (requires PMS)
- Guest-facing damage reports
- Payment/billing (it is free)
- Native mobile app (browser is sufficient)
- Multi-language support (English only)
- Audit log
- Two-factor authentication (add when paying users exist)
