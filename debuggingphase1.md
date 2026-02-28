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
Original secret in `.env.local` was stale. Updated to new secret in both `.env.local` and Vercel.

### 3. Google OAuth `invalid_client` Error (IN PROGRESS — Session 2)
**Symptom:** `Error 401: invalid_client` — "The OAuth client was not found"
**User:** `shamu1982@gmail.com` (personal Gmail)
**Flow:** `GeneralOAuthFlow`

**Tests performed (session 1):**
- Client ID confirmed visible in Google Cloud Console (project `banda-488807`)
- Redirect URIs correctly configured (localhost, banda.stayd-tools.com, stayd-banda.vercel.app)
- OAuth consent screen configured and set to production
- Google Identity Toolkit API enabled
- Direct curl to Google OAuth endpoint: **302 redirect to sign-in** (Google recognises the client ID at initial stage)
- Error occurs AFTER initial redirect, during consent/token flow

**Session 2 investigation (browser automation of Google Cloud Console + Vercel):**

#### Step 1: Google Cloud Console — Client ✅
- [x] Client ID `465309846060-...googleusercontent.com` **exists and is enabled**
- [x] Client name: `banda`, created 28 Feb 2026 10:50:38 GMT+0
- [x] Single client secret ending `****gPqP`, status: Enabled
- [x] `.env.local` secret ends with `gPqP` — **matches Google**
- [x] Session 1 doc referenced wrong secret — that was stale/incorrect

#### Step 2: Google Cloud Console — Redirect URIs ✅
- [x] URI 1: `https://stayd-banda.vercel.app/api/auth/callback/google`
- [x] URI 2: `https://banda.stayd-tools.com/api/auth/callback/google`
- [x] URI 3: `http://localhost:3000/api/auth/callback/google`
- [x] No Authorised JavaScript origins set (not needed for server-side flow)

#### Step 3: Google Cloud Console — Consent Screen ✅
- [x] Publishing status: **Testing** (not production)
- [x] User type: **External**
- [x] Test users (2): `robin.smith@coriniumcapital.co.uk`, `shamu1982@gmail.com`
- [x] Consent screen is NOT the issue — test users are correctly listed

#### Step 4: Vercel Environment Variables ✅
- [x] `GOOGLE_CLIENT_SECRET` on Vercel = `GOCSPX-zlYqCzdr02ctYHo1W10gs7jvg...` — **matches Google + .env.local**
- [x] `GOOGLE_CLIENT_ID` set (added 24m ago)
- [x] `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `AUTH_TRUST_HOST` all present
- [x] All R2 and RESEND vars present

#### Step 5: First redeploy — still failing
- [x] Redeployed to pick up env var timing mismatch — error persisted
- [x] Inspected Google OAuth error URL in browser

#### Step 6: ACTUAL ROOT CAUSE FOUND — Trailing newline in env vars
- [x] Google error URL revealed `client_id=...googleusercontent.com%0A` — a `%0A` (newline) appended
- [x] Opened `GOOGLE_CLIENT_ID` in Vercel edit UI — visible `↵` character at end + orange warning triangle
- [x] Opened `GOOGLE_CLIENT_SECRET` — same trailing newline issue
- [x] **Both env vars had trailing `\n` from copy-paste into Vercel dashboard**
- [x] Removed trailing newlines from both vars, saved, redeployed

**Full RCA:** See [authissuerca.md](./authissuerca.md)

#### Step 7: Verification — OAuth flow now works ✅
- [x] Google sign-in on `https://stayd-banda.vercel.app` — OAuth flow completes, Google consent works

### 4. Post-sign-in "Configuration" Error (FIXED)
**Symptom:** After successful Google OAuth consent, redirected to `/api/auth/error?error=Configuration` with "Server error — There is a problem with the server configuration."

**Root cause:** In `src/lib/auth.ts`, the `jwt` callback used `user.id` to query `orgMembers.userId`. For Google OAuth, `user.id` is Google's numeric string ID (e.g. `"107530004286756160000"`), NOT a UUID. The `orgMembers.userId` column is `uuid`, so Postgres threw `invalid input syntax for type uuid`, crashing the callback.

**Fix:** Changed the `jwt` callback to look up the DB user by email instead of by `user.id`. This returns the correct DB UUID, which is then used for the orgMembers query.

```diff
- token.id = user.id;
- const [membership] = await db.select()...
-   .where(eq(schema.orgMembers.userId, user.id as string))
+ const [dbUser] = await db.select()...
+   .where(eq(schema.users.email, email))
+ token.id = dbUser.id;
+ const [membership] = await db.select()...
+   .where(eq(schema.orgMembers.userId, dbUser.id))
```

**Status:** Code fix applied, needs redeploy to verify.

## What's Working
- Vercel build and deployment: OK
- Database (Neon Postgres) connection: OK
- NextAuth providers endpoint (`/api/auth/providers`): OK — returns Google + Credentials
- Email/password registration (`/api/auth/register`): OK — successfully created test user
- Middleware (protected routes): OK
- Custom domain alias (`www.stayd-tools.com`): OK
- Google OAuth flow (consent + token exchange): OK

## What's Not Working
- Post-sign-in session: fix applied locally, pending deploy + verification

## Environment
- Next.js 16.1.6 (Turbopack)
- NextAuth v5 beta 30
- Vercel (region: lhr1)
- Neon Postgres (eu-west-2)
