# Debugging Phase 1 — Deployment & Auth

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
Original secret in `.env.local` was stale. Updated to new secret (`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`) in both `.env.local` and Vercel.

### 3. Google OAuth `invalid_client` Error (IN PROGRESS)
**Symptom:** `Error 401: invalid_client` — "The OAuth client was not found"

**Tests performed:**
- Client ID `465309846060-...` confirmed visible in Google Cloud Console (project `banda-488807`)
- Redirect URIs correctly configured (localhost, banda.stayd-tools.com, stayd-banda.vercel.app)
- OAuth consent screen configured and set to production
- Google Identity Toolkit API enabled
- Direct curl to Google OAuth endpoint: **302 redirect to sign-in** (Google recognises the client ID at initial stage)
- Error occurs AFTER initial redirect, during consent/token flow — not at the client_id lookup stage

**Likely cause:** Consent screen switched to "production" mode requires Google verification for the app. Switching back to **Testing** mode with test users should resolve it.

**Action needed:** In Google Cloud Console > Google Auth Platform > Verification Centre, switch back to Testing mode and add `robin.smith@coriniumcapital.co.uk` as a test user.

## What's Working
- Vercel build and deployment: OK
- Database (Neon Postgres) connection: OK
- NextAuth providers endpoint (`/api/auth/providers`): OK — returns Google + Credentials
- Email/password registration (`/api/auth/register`): OK — successfully created test user
- Middleware (protected routes): OK
- Custom domain alias (`www.stayd-tools.com`): OK

## What's Not Working
- Google OAuth sign-in: blocked by Google (`invalid_client` after consent screen)

## Environment
- Next.js 16.1.6 (Turbopack)
- NextAuth v5 beta 30
- Vercel (region: lhr1)
- Neon Postgres (eu-west-2)
