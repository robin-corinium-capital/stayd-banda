# RCA: R2 Photo Uploads Failing on Vercel Deployment

**Date:** 2026-03-01
**Duration:** ~2 hours debugging
**Impact:** All photo uploads and exports broken on production (`stayd-banda.vercel.app`)
**Status:** Resolved

---

## Summary

Photo uploads from the Vercel deployment failed silently with "Failed to fetch" on the browser PUT to R2 presigned URLs. Three independent root causes compounded to make diagnosis difficult.

---

## Root Causes

### 1. Trailing newlines in Vercel environment variables

**What happened:** When the R2 credentials were pasted into Vercel's environment variable UI, invisible trailing newlines (`\n`) were included in the values. These newlines got embedded into AWS SigV4 presigned URLs:

- `R2_BUCKET_NAME` → presigned URL path contained `banda-photos%0A/` instead of `banda-photos/`
- `R2_ACCESS_KEY_ID` → presigned URL credential string contained `...9f71d92%0A%2F20260301...`

**Why it was hard to find:** The Vercel UI doesn't visually show trailing newlines in masked values. The presigned URL looked valid at a glance — the `%0A` was buried deep in the credential parameter at character position 351.

**Fix:** Added `.trim()` to all R2 env var reads in `src/lib/r2.ts`:

```ts
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!.trim(),
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
  },
});
const BUCKET = process.env.R2_BUCKET_NAME!.trim();
```

Also manually cleaned the values in the Vercel dashboard.

### 2. R2 bucket is EU-jurisdiction — wrong S3 endpoint

**What happened:** The `banda-photos` R2 bucket was created with EU jurisdiction. The `R2_ENDPOINT` env var was set to `https://<account>.r2.cloudflarestorage.com` (the global endpoint), but EU-jurisdiction buckets require `https://<account>.eu.r2.cloudflarestorage.com`.

**Why it matters:** CORS configuration set via the S3 `PutBucketCors` API only applies to the jurisdiction-specific endpoint. The global endpoint returned 403 on CORS preflight even after CORS was correctly configured.

**Why it was hard to find:** The global endpoint successfully generates presigned URLs and handles server-side operations — it only fails on browser CORS preflight. The Cloudflare dashboard doesn't prominently warn that the S3 endpoint differs by jurisdiction.

**Fix:** Changed `R2_ENDPOINT` from `https://cbdb72b755d06595e06ffaef50bcb4cc.r2.cloudflarestorage.com` to `https://cbdb72b755d06595e06ffaef50bcb4cc.eu.r2.cloudflarestorage.com` in both `.env.local` and Vercel.

### 3. R2 CORS not configured via S3 API

**What happened:** The Cloudflare dashboard has a "CORS Policy" section under R2 bucket settings. This was configured with the correct origins. However, this dashboard CORS policy does **not** apply to the S3-compatible API endpoint (`*.r2.cloudflarestorage.com`). CORS for the S3 endpoint must be set via the S3 `PutBucketCors` API.

**Why it was hard to find:** The dashboard UI gives no indication that its CORS settings don't apply to the S3 API. The curl test against the S3 endpoint returned `<Error><Code>Unauthorized</Code><Message>CORS not configured for this bucket</Message></Error>` even though the dashboard showed CORS was configured.

**Fix:** Created a new R2 API token with Admin Read & Write permissions, then used `PutBucketCorsCommand` from `@aws-sdk/client-s3` to set CORS on the EU endpoint:

```ts
const cmd = new PutBucketCorsCommand({
  Bucket: 'banda-photos',
  CORSConfiguration: {
    CORSRules: [{
      AllowedOrigins: [
        'https://stayd-banda.vercel.app',
        'https://banda.stayd-tools.com',
        'http://localhost:3000',
      ],
      AllowedMethods: ['PUT', 'GET'],
      AllowedHeaders: ['Content-Type', 'Content-Length'],
      MaxAgeSeconds: 3600,
    }],
  },
});
```

---

## Timeline

| Time | Action | Result |
|------|--------|--------|
| T+0 | Discovered `%0A` in presigned URL bucket path | Fixed `R2_BUCKET_NAME` with `.trim()` |
| T+15m | Upload still fails — found `%0A` in credential string | Added `.trim()` to all R2 env vars, pushed commit |
| T+30m | Upload still fails — CORS preflight returns 403 | Discovered dashboard CORS doesn't apply to S3 API |
| T+45m | Tried `PutBucketCors` with existing token | `AccessDenied` — token only has Object Read & Write |
| T+60m | Created new Admin R2 API token | `PutBucketCors` returns "bucket not found" |
| T+75m | Discovered bucket has EU jurisdiction | Used EU endpoint — `PutBucketCors` succeeds (200) |
| T+80m | CORS works on EU endpoint, fails on global | Changed `R2_ENDPOINT` to EU endpoint |
| T+90m | Redeployed Vercel | Upload succeeds, all exports return 200 |

---

## Commits

| Hash | Description |
|------|-------------|
| `927c037` | `fix: trim R2_BUCKET_NAME to prevent trailing newline in presigned URLs` |
| `7eeaa30` | `fix: trim all R2 env vars to prevent newline corruption in presigned URLs` |

---

## Lessons Learned

1. **Always `.trim()` environment variables** — Vercel's paste UI silently preserves trailing newlines. Any env var used in URL construction or cryptographic signing will break.

2. **Cloudflare R2 dashboard CORS ≠ S3 API CORS** — The CORS Policy in the R2 bucket dashboard only applies to public access URLs, not the S3-compatible API endpoint. CORS for presigned URL uploads must be set via `PutBucketCors`.

3. **EU-jurisdiction buckets need EU endpoints** — If an R2 bucket is created with EU jurisdiction, both the S3 API endpoint and CORS configuration must use `*.eu.r2.cloudflarestorage.com`. The global endpoint will silently work for some operations but fail CORS.

4. **R2 Admin operations need Admin tokens** — The standard Object Read & Write token can't set bucket configuration. A separate Admin Read & Write token is needed for `PutBucketCors` and similar operations.

---

## Prevention

- [ ] Add a startup health check that validates R2 connectivity (e.g., `HeadBucket`) and logs the endpoint being used
- [ ] Document the EU endpoint requirement in the project README/setup guide
- [ ] Consider adding a CI check that env var values don't contain whitespace
