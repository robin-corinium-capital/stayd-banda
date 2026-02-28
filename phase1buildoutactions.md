# Phase 1 Build Actions

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
