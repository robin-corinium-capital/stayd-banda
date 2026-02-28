# stayd-banda: Phase 1 - Foundation

Upload 00_SHARED_CONTEXT.md alongside this file. It contains the full schema, stack decisions, and environment variables.

## What This Session Builds

1. Next.js project scaffold with TypeScript
2. Vercel Postgres database schema via Drizzle ORM
3. Cloudflare R2 client utility
4. Auth.js (v5) with email/password and Google SSO
5. Basic layout: nav, auth pages, dashboard shell
6. Deploy skeleton to Vercel

## Prerequisites (set up manually before this session)

- Vercel account with Postgres database created (EU region, Frankfurt). This auto-populates POSTGRES_* env vars in the Vercel project
- Cloudflare R2 bucket created with EU jurisdiction hint
- Vercel project linked to GitHub repo (stayd-banda, public)
- Google OAuth credentials created (for SSO)
- Resend account created (for transactional email)
- Copy POSTGRES_* env vars from Vercel dashboard to .env.local for local development
- All other environment variables from 00_SHARED_CONTEXT.md populated in .env.local

## Step by Step

### 1. Scaffold Next.js

```bash
npx create-next-app@latest stayd-banda --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd stayd-banda
```

### 2. Install Dependencies

```bash
npm install next-auth@beta @auth/core
npm install @vercel/postgres
npm install drizzle-orm
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install bcryptjs
npm install resend
npm install sharp
npm install -D drizzle-kit @types/bcryptjs
```

Notes on packages:
- next-auth@beta is Auth.js v5 for App Router
- @vercel/postgres is the serverless Postgres driver (HTTP-based, no TCP connection pooling needed)
- drizzle-orm + drizzle-kit for schema definition, migrations, and type-safe queries
- @aws-sdk packages work with R2 (S3-compatible API)
- sharp is for EXIF extraction and thumbnail generation (used in later phases but install now)

### 3. Define Database Schema with Drizzle

**Create src/db/schema.ts**

Define all tables using Drizzle's TypeScript schema builder. The target structure matches the SQL in 00_SHARED_CONTEXT.md. Use pgTable, uuid, text, boolean, timestamp, integer, doublePrecision, bigint from drizzle-orm/pg-core.

Key Drizzle-specific notes:
- Use uuid('id').defaultRandom().primaryKey() for all ID columns
- Use timestamp('created_at', { withTimezone: true }).defaultNow() for timestamps
- Define relations separately using the relations() helper for type-safe joins
- The property_ids array column on invites: use text('property_ids').array() or store as JSON text (simpler)

**Create drizzle.config.ts**
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Use NON_POOLING for migrations (direct connection, not pooled)
    url: process.env.POSTGRES_URL_NON_POOLING!,
  },
});
```

Note: POSTGRES_URL is the pooled connection (for app queries via Drizzle). POSTGRES_URL_NON_POOLING is the direct connection (for migrations via drizzle-kit). Using the pooled URL for migrations can cause timeout issues.

**Generate and run migrations:**
```bash
npx drizzle-kit generate
npx drizzle-kit push
```

**Create src/db/index.ts**
```typescript
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import * as schema from './schema';

export const db = drizzle(sql, { schema });
```

This db instance is used in all API routes.

### 4. Create Core Utility Files

**R2 client: src/lib/r2.ts**
- Create an S3Client configured for R2:
  - endpoint: process.env.R2_ENDPOINT
  - region: "auto"
  - credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY }
- Export helper functions:
  - getPresignedUploadUrl(key: string, contentType: string, maxSize: number): returns a presigned PUT URL, expires in 15 minutes
  - getPresignedDownloadUrl(key: string): returns a presigned GET URL, expires in 1 hour
  - deleteObject(key: string): deletes a file from R2

**Email client: src/lib/email.ts**
- Create a Resend client
- Export a sendEmail function that accepts to, subject, html
- Add templates for: invite email, email verification, password reset

### 5. Implement Auth.js

**Auth config: src/lib/auth.ts**

Providers:
- CredentialsProvider: email + password. Hash passwords with bcryptjs. Look up user in users table via Drizzle. Verify password_hash
- GoogleProvider: uses GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET

Session strategy must be set to "jwt" explicitly. The Credentials provider does not support database sessions in Auth.js v5.

Callbacks:
- signIn: on first Google SSO sign-in, create user in users table if they don't exist. Create an organisation for them. Add them as owner of that organisation
- jwt: include user ID and org_id in the JWT token
- session: expose user ID and org_id in the session object

All database operations use Drizzle ORM (import db from src/db/index.ts and schema from src/db/schema.ts). Use Drizzle's type-safe query builder, not raw SQL.

**Registration: src/app/api/auth/register/route.ts**
- POST endpoint
- Accept email, password, name
- Validate: email format, password minimum 8 characters
- Hash password with bcryptjs (12 rounds)
- Insert into users table using db.insert(schema.users)
- Create an organisation using db.insert(schema.organisations)
- Insert into org_members with role "owner" using db.insert(schema.orgMembers)
- Send verification email
- Return success

**Auth pages:**
- src/app/login/page.tsx: email/password form + "Sign in with Google" button
- src/app/register/page.tsx: name, email, password form + "Sign up with Google" button
- Both should be clean, minimal. Tailwind styling. banda.stayd-tools.com branding

### 6. Basic Layout

**Root layout: src/app/layout.tsx**
- Session provider wrapping the app
- Basic HTML structure with Tailwind

**Navigation: src/components/nav.tsx**
- Logo/brand: "banda" with "by stayd" subtitle
- If authenticated: Dashboard, Properties, Turnovers, Upload (if cleaner role), Settings
- If not authenticated: Login, Register
- Mobile: hamburger menu
- User avatar/name with dropdown: Settings, Sign out

**Dashboard: src/app/dashboard/page.tsx**
- Protected route (redirect to /login if not authenticated)
- Shell layout with:
  - Welcome message with org name
  - "Properties" card showing count (0 for now)
  - "Recent turnovers" card (empty for now)
  - "Flagged items" card (empty for now)
- This is just the shell. Content gets filled in later phases

**Middleware: src/middleware.ts**
- Protect all routes under /dashboard, /properties, /turnovers, /upload, /settings
- Redirect unauthenticated users to /login
- Allow public access to /, /login, /register, /invite/[token], /api/auth/*

### 7. Landing Page

**src/app/page.tsx**
- Simple marketing page
- Headline: "Document every turnover. Prove every claim."
- Subheadline: "Free photo evidence tool for holiday let owners and agencies."
- Call to action: "Get started" linking to /register
- Three feature cards:
  - "Before and after": timestamped photo sets for every guest changeover
  - "Evidence that holds up": EXIF metadata, server timestamps, no AI content
  - "Built for cleaners": mobile-first upload interface that works on any phone
- Footer: "banda by stayd" / Corinium Capital Limited / Terms link

### 8. Deploy

- Push to GitHub (stayd-banda repo, public)
- Verify .gitignore includes .env.local and .env*.local (create-next-app includes this by default, but double-check since the repo is public and credentials must never leak)
- Add MIT LICENCE file to repo root
- Connect to Vercel (should already be linked)
- Verify region is lhr1 (London)
- Verify POSTGRES_* env vars are auto-populated from Vercel Postgres
- Add remaining environment variables (R2, Resend, Google OAuth, NEXTAUTH_SECRET)
- Deploy and verify: landing page loads, registration works, login works, dashboard loads when authenticated
- Configure custom domain: banda.stayd-tools.com

## Done When

- [ ] Landing page renders at banda.stayd-tools.com
- [ ] User can register with email/password
- [ ] User can sign in with Google SSO
- [ ] Registration creates an organisation and sets user as owner
- [ ] Authenticated user sees the dashboard shell
- [ ] Unauthenticated user is redirected to /login
- [ ] Database has all tables created and accessible
- [ ] R2 client utility exists and can generate presigned URLs (test manually)
- [ ] Deployed to Vercel EU region
