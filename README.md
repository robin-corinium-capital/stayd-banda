# stayd-banda Build Guide

## Files

| File | Purpose | When to Use |
|---|---|---|
| 00_SHARED_CONTEXT.md | Stack, schema, API routes, env vars, data model | Upload with EVERY session |
| 01_PHASE_FOUNDATION.md | Scaffold, auth, database, layout, deploy | Session 1 |
| 02_PHASE_PROPERTY_ADMIN.md | Property CRUD, areas, invites, roles | Session 2 |
| 03_PHASE_UPLOAD.md | Turnovers, presigned URLs, mobile upload, EXIF | Session 3 |
| 04_PHASE_RETRIEVAL.md | Turnover detail, search, photo viewer | Session 4 |
| 05_PHASE_EXPORT.md | ZIP downloads, PDF evidence reports | Session 5 |
| 06_PHASE_POLISH.md | Terms, retention, mobile polish, deploy | Session 6 |

## Stack

- Next.js 14+ (App Router, TypeScript)
- Vercel Postgres (Neon under the hood, never sleeps, EU region)
- Drizzle ORM (type-safe queries, migrations)
- Cloudflare R2 (photo storage, zero egress)
- Auth.js v5 (email/password + Google SSO)
- Resend (transactional email)
- Hosted on Vercel (lhr1 London)

## Manual Setup (do this before any Claude Code sessions)

### 1. GitHub repo (2 minutes)

Go to github.com/new. Create stayd-banda as a public repo. Clone it locally.

### 2. Vercel project + Postgres (5 minutes)

1. Go to vercel.com/new, import the stayd-banda repo
2. Set the project region to London (lhr1) in project settings
3. Go to the Storage tab in your Vercel project
4. Create a new Postgres database, select EU (Frankfurt) region
5. This auto-populates POSTGRES_* environment variables in your Vercel project
6. Go to Settings > Environment Variables, copy all POSTGRES_* values for your .env.local

### 3. Cloudflare R2 bucket (5 minutes)

1. Log into Cloudflare dashboard
2. Go to R2 Object Storage
3. Create bucket: "banda-photos"
4. Set jurisdiction to EU
5. Go to R2 > Manage R2 API Tokens, create a token with read/write on the bucket
6. Note: Account ID, Access Key ID, Secret Access Key, Endpoint URL
7. Configure CORS on the bucket (Settings tab): allow PUT and GET from https://banda.stayd-tools.com and http://localhost:3000, allow Content-Type header

### 4. Google OAuth credentials (5 minutes)

1. Go to console.cloud.google.com
2. Create a project (or use existing)
3. Go to APIs & Services > Credentials > Create Credentials > OAuth Client ID
4. Application type: Web application
5. Authorized redirect URIs: http://localhost:3000/api/auth/callback/google and https://banda.stayd-tools.com/api/auth/callback/google
6. Note: Client ID and Client Secret

### 5. Resend (3 minutes)

1. Go to resend.com, create account
2. Add and verify domain: stayd-tools.com (add the DNS records they give you)
3. Create an API key
4. Note: API Key

### 6. Domain DNS (2 minutes)

Add a CNAME record for banda.stayd-tools.com pointing to cname.vercel-dns.com in your domain registrar.

### Total: roughly 20 minutes.

## Claude Code Instructions

### Session 1: Foundation

Open Claude Code in the stayd-banda repo directory. Upload both files:

```
/add 00_SHARED_CONTEXT.md 01_PHASE_FOUNDATION.md
```

Then prompt:

```
Here is the shared context for the stayd-banda project and the build instructions for Phase 1 (Foundation). Build everything described in the phase file. Use Vercel Postgres with Drizzle ORM for the database layer. Use @vercel/postgres as the driver. Define the full schema in src/db/schema.ts using Drizzle's pgTable helpers, then generate and push migrations. Check against the "Done When" list at the bottom before finishing.
```

### Session 2: Property Admin

```
/add 00_SHARED_CONTEXT.md 02_PHASE_PROPERTY_ADMIN.md
```

```
Here is the shared context and Phase 2 build instructions. The Phase 1 foundation is complete (auth, database schema, basic layout all working). Build everything in the phase file. All database queries must use Drizzle ORM, not raw SQL. Check against the "Done When" list before finishing.
```

### Session 3: Upload

```
/add 00_SHARED_CONTEXT.md 03_PHASE_UPLOAD.md
```

```
Here is the shared context and Phase 3 build instructions. Phases 1 and 2 are complete (auth, properties, areas, invites all working). Build the turnover management and photo upload flow. The critical path is: presigned URL generation for R2, direct client upload, server-side EXIF extraction on confirmation, thumbnail generation. Build and test these before polishing the mobile upload UI. Check against the "Done When" list before finishing.
```

### Session 4: Retrieval

```
/add 00_SHARED_CONTEXT.md 04_PHASE_RETRIEVAL.md
```

```
Here is the shared context and Phase 4 build instructions. Phases 1 through 3 are complete (photos can be uploaded and stored). Build the turnover detail view with side-by-side photo sets, search/filter, full-size photo viewer with metadata overlay, and damage flag management. Check against the "Done When" list before finishing.
```

### Session 5: Export

**Upgrade to Vercel Pro ($20/month) before this session.** The free tier's 10 second function timeout is too short for ZIP/PDF generation.

```
/add 00_SHARED_CONTEXT.md 05_PHASE_EXPORT.md
```

```
Here is the shared context and Phase 5 build instructions. Phases 1 through 4 are complete. Build ZIP download per turnover, PDF evidence report generation using @react-pdf/renderer, and bulk property export. Set maxDuration to 60 in vercel.json for export routes. Check against the "Done When" list before finishing.
```

### Session 6: Polish

```
/add 00_SHARED_CONTEXT.md 06_PHASE_POLISH.md
```

```
Here is the shared context and Phase 6 build instructions. Phases 1 through 5 are complete. Add the terms of use page, data retention logic, mobile UI polish across all pages, consistent error handling, and settings pages. Run through the full end-to-end test checklist. Check against the "Done When" list before finishing.
```

## If a Session Times Out

Resume by uploading the same two files again. Prompt:

```
Phase [N] was partially completed. Here is the current repo state. Continue from where we left off. Check the "Done When" list for what remains and build only the incomplete items.
```

## Credit Usage

Each session should use under 50% of a Max subscription build window. Phase 3 (upload) is the heaviest. If it approaches the limit, stop after presigned URLs and EXIF extraction work, then finish the mobile upload UI in a follow-up session with the same two files.
