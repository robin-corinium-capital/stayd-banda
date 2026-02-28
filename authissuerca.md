# RCA: Google OAuth `invalid_client` Error

**Date:** 28 February 2026
**Severity:** P1 — blocked all Google OAuth sign-in
**Duration:** ~4 hours (from first deployment to fix)
**Status:** Fix deployed, pending verification

---

## Incident Summary

Google OAuth sign-in on the production deployment (`stayd-banda.vercel.app`) returned `Error 401: invalid_client — "The OAuth client was not found"` for all users, despite the OAuth client being correctly configured in Google Cloud Console.

## Root Cause

**Trailing newline characters (`\n`) in Vercel environment variables.**

When `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` were pasted into the Vercel dashboard, each value included a trailing newline character (`%0A` when URL-encoded). This caused Google's OAuth endpoint to receive:

```
client_id=465309846060-...googleusercontent.com%0A
```

instead of:

```
client_id=465309846060-...googleusercontent.com
```

Google could not match `...googleusercontent.com\n` to any registered client, returning "The OAuth client was not found."

## Evidence

- The Google error URL contained `client_id=...googleusercontent.com%0A` — the `%0A` is a URL-encoded newline
- Editing the env vars in Vercel's UI revealed a visible `↵` (return) character at the end of both values
- Vercel displayed an orange warning triangle on affected fields
- The OAuth client itself was confirmed valid, enabled, and correctly configured in Google Cloud Console (project `banda-488807`)

## Misleading Signals

Several red herrings consumed investigation time:

1. **"Client secret mismatch"** — Session 1 debugging doc referenced a different secret (`GOCSPX-oYKH...5DTP`) than what was in `.env.local` (`GOCSPX-zlYq...gPqP`). Investigation confirmed the `.env.local` value matched Google Console. The doc was simply out of date.

2. **"Consent screen in production mode"** — Initially suspected that switching the consent screen to "Production" (unverified) was causing the error. Investigation confirmed it was actually in "Testing" mode with both test users correctly listed.

3. **"Deployment timing"** — The `GOOGLE_CLIENT_SECRET` was updated 23 minutes ago but the live deployment was 25 minutes old. While true that Vercel doesn't auto-redeploy on env var changes, this alone wasn't the root cause — the trailing newline was.

## Timeline

| Time | Event |
|------|-------|
| ~4h ago | Initial Vercel deployment with all env vars added |
| ~4h ago | Google OAuth tested — `invalid_client` error observed |
| ~3h ago | Session 1 debugging: checked client ID, redirect URIs, consent screen, APIs. Incorrectly concluded consent screen mode was the issue |
| ~40m ago | Session 2 begins. Browser automation of Google Cloud Console |
| ~35m ago | Confirmed: client exists, enabled, secret matches, consent screen in Testing, test users listed |
| ~30m ago | Confirmed: Vercel env vars match `.env.local` and Google Console (values correct) |
| ~15m ago | Redeployed — error persists |
| ~10m ago | Inspected Google error URL — spotted `%0A` (newline) appended to `client_id` |
| ~5m ago | Edited both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel to remove trailing newlines |
| Now | Redeployed with clean env vars — pending verification |

## Fix Applied

1. Edited `GOOGLE_CLIENT_ID` in Vercel — removed trailing `\n`
2. Edited `GOOGLE_CLIENT_SECRET` in Vercel — removed trailing `\n`
3. Triggered production redeploy to pick up clean values

## Prevention

- **Always trim env var values** when pasting into Vercel (or any hosting dashboard). Copying from terminals, editors, or password managers often includes trailing newlines.
- **Check for Vercel's warning indicators** — the orange triangle icon on env var fields signals whitespace/formatting issues.
- **Inspect the OAuth redirect URL** when debugging Google OAuth errors. The `client_id` parameter in the URL reveals exactly what value is being sent, including invisible characters.
- **Consider using Vercel CLI** (`vercel env add`) which is less prone to clipboard whitespace issues than the web UI.
