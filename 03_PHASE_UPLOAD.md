# stayd-banda: Phase 3 - Turnovers and Photo Upload

Upload 00_SHARED_CONTEXT.md alongside this file.

## What This Session Builds

1. Turnover creation and management
2. Presigned URL generation for direct R2 uploads
3. Mobile-first cleaner upload interface
4. Server-side EXIF extraction on upload confirmation
5. Thumbnail generation
6. Damage flag toggle with note

This is the highest complexity session. The R2 presigned URL pattern and EXIF extraction are the two pieces most likely to need debugging. Take them one at a time.

## Assumes Phases 1-2 Are Complete

- Auth, properties, areas, invites all working
- R2 client utility exists (src/lib/r2.ts)
- Sharp is installed

## Before Starting This Phase

### Sharp on Vercel

Sharp requires native binaries. Vercel handles this if you configure next.config.js:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
};
module.exports = nextConfig;
```

Without this, EXIF extraction and thumbnail generation will work locally but fail on deploy.

### R2 CORS Configuration

The client uploads directly to R2 from the browser. R2 needs CORS configured or every upload will fail. In the Cloudflare dashboard, go to the R2 bucket settings and add a CORS rule:

```json
[
  {
    "AllowedOrigins": ["https://banda.stayd-tools.com", "http://localhost:3000"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

Alternatively, use the Cloudflare API or wrangler CLI. This must be done before testing uploads.

## Step by Step

### 1. Turnover CRUD

**API routes:**

POST /api/turnovers
- Owner or cleaner (both can create)
- Accept: property_id (required), checkout_date (required), checkin_date (required), departing_guest_ref (optional), arriving_guest_ref (optional)
- Validate: checkin_date must be after or equal to checkout_date
- Validate: user has access to the property
- Insert into turnovers table with status "open" and created_by as current user
- Return the created turnover

GET /api/turnovers
- Accept query params: property_id, status, date_from, date_to
- Owner: returns turnovers for all org properties (filterable)
- Cleaner: returns turnovers for assigned properties only
- Order by checkout_date descending
- Include: property name, photo count per set, damage flag count

GET /api/turnovers/[id]
- Check access
- Return turnover with: property details, areas, photo counts per set per area, all photos grouped by set then area

PATCH /api/turnovers/[id]
- Owner or creator can update
- Accept: status, departing_guest_ref, arriving_guest_ref, retention_extended
- If status changes to "complete", set completed_at to NOW()
- If first photo has been uploaded and status is "open", auto-update to "in_progress"

DELETE /api/turnovers/[id]
- Owner only
- IMPORTANT: fetch all photo R2 keys (original + thumbnail) BEFORE deleting the turnover record. The database CASCADE will delete photo rows, so you lose the R2 keys if you delete the turnover first
- Delete R2 objects for each photo
- Then delete the turnover record (cascades to photo rows in database)

**Pages:**

/turnovers (list):
- Filterable by property (dropdown), status (tabs: all/open/in progress/complete), date range
- Each row shows: property name, checkout date, checkin date, status badge, photo count (post-checkout / pre-checkin), damage flag count
- Click to open /turnovers/[id]
- "New turnover" button

/turnovers/new:
- Select property (dropdown, filtered to accessible properties)
- Checkout date (date picker)
- Checkin date (date picker)
- Departing guest reference (text, optional)
- Arriving guest reference (text, optional)
- Submit creates turnover and redirects to /turnovers/[id] or /upload/[propertyId]/[turnoverId]

### 2. Presigned Upload URLs

**API route: POST /api/photos/presign**

- Authenticated users only (owner or cleaner with property access)
- Accept: turnover_id, filename, content_type, file_size
- Validate: turnover exists, user has access to the turnover's property
- Validate: content_type is image/jpeg, image/png, or image/heic
- Validate: file_size is under 20MB (20 * 1024 * 1024 bytes)
- Generate R2 object key: {org_id}/{property_id}/{turnover_id}/{uuid}.{extension}
- Generate presigned PUT URL using @aws-sdk/s3-request-presigner with 15 minute expiry
- Return: { presignedUrl, r2Key, expiresAt }

The client uploads directly to R2 using this presigned URL. The file never touches the Next.js server. This is the most important architectural decision for performance and cost.

### 3. Upload Confirmation and EXIF Extraction

**API route: POST /api/photos/confirm**

This is called by the client AFTER a successful direct upload to R2.

- Accept: r2_key, turnover_id, area_id, photo_set ("post_checkout" or "pre_checkin"), original_filename, file_size_bytes, mime_type, is_damage_flagged (boolean), damage_note (string, optional)
- Validate: turnover exists, user has access
- Validate: photo_set is valid
- Validate: area_id belongs to the turnover's property (or is null for "general")

EXIF extraction (server-side):
- Download the original image from R2 using the r2_key (use GetObjectCommand)
- Pass the image buffer to Sharp
- Extract EXIF data: capture timestamp (DateTimeOriginal), GPS latitude/longitude, device make, device model
- For HEIC images: convert to JPEG using Sharp before further processing
- If HEIC converted, upload the JPEG version to R2 as the primary image and update r2_key_original

Thumbnail generation:
- Resize to 400px wide using Sharp (maintain aspect ratio)
- Output as JPEG at 80% quality
- Upload thumbnail to R2: same path but with _thumb suffix
- Store thumbnail R2 key as r2_key_thumbnail

Database insert:
- Insert into photos table with all fields including extracted EXIF metadata
- Set upload_timestamp to NOW() (server-side, not client-provided)

Auto-update turnover status:
- If turnover status is "open", update to "in_progress"

Return: the created photo record (id, thumbnail URL, metadata)

**Important: EXIF stripping for public access**

When generating presigned download URLs for thumbnails (used in the UI), strip EXIF from the served image. The EXIF data is stored in the database but should not be in the publicly accessible image. Either:
- Strip EXIF when generating the thumbnail (Sharp does this by default unless you pass withMetadata())
- Or serve thumbnails through an API route that strips metadata

For originals downloaded via the evidence pack, keep EXIF intact (it is part of the evidence).

### 4. Cleaner Mobile Upload Interface

This is the most used screen. It must work on a phone, in a browser, standing in a property with variable signal.

**Page: /upload**

If cleaner has only one assigned property with an open turnover, skip selection and go straight to upload.

Otherwise:
- List assigned properties (cards, large tap targets)
- Under each property, show the most recent open/in-progress turnover with dates
- "Start new turnover" option under each property
- Tap a property/turnover to enter upload mode

**Page: /upload/[propertyId]/[turnoverId]**

Layout (mobile portrait, top to bottom):

1. **Header bar**: property name, turnover dates (compact)

2. **Photo set toggle**: two large buttons, full width, stacked or side by side
   - "After guest left" (orange/amber background) = post_checkout
   - "Before next guest" (green background) = pre_checkin
   - Active state: filled colour. Inactive: outlined
   - This must be impossible to confuse. Colour and label both matter

3. **Area selector**: horizontal scrollable row of chips
   - One chip per area from the property's area list
   - Plus a "General" chip for non-area-specific photos
   - Active chip is highlighted
   - Tapping a chip selects it for the next photo

4. **Camera button**: large, centred, obvious
   - Uses: `<input type="file" accept="image/*" capture="environment">`
   - Opens native camera on mobile
   - Below it: "or choose from gallery" text link (same input without capture attribute, with multiple attribute for batch select)

5. **Upload queue / recent uploads**: scrollable grid of thumbnails from this session
   - Each thumbnail shows:
     - Progress indicator during upload (circular or bar)
     - Green tick overlay on success
     - Red X with "tap to retry" on failure
     - Small flag icon in corner (tap to toggle damage flag)
   - Tapping a successful thumbnail opens a mini-detail: larger preview, area label, damage flag toggle, text note input

6. **Damage flag flow**:
   - Tap the flag icon on any thumbnail
   - Flag turns red, text input appears below the thumbnail
   - Type damage note (e.g. "stain on carpet near window")
   - Note saves via PATCH /api/photos/[id]
   - Flag and note can be toggled/edited after upload

**Upload behaviour (critical):**

- After taking or selecting a photo, upload begins IMMEDIATELY in the background
- Do NOT wait for a "submit" or "save" action. Every photo uploads as it is taken
- Upload flow per photo:
  1. Client reads the file, gets filename, content_type, file_size
  2. Client calls POST /api/photos/presign with turnover_id, filename, content_type, file_size
  3. Server returns presignedUrl and r2Key
  4. Client PUTs the file directly to the presigned R2 URL (include Content-Type header)
  5. On successful PUT (HTTP 200), client calls POST /api/photos/confirm with r2_key, turnover_id, area_id, photo_set, etc.
  6. Server extracts EXIF, generates thumbnail, inserts database record
  7. Server returns photo record with thumbnail URL
  8. Client updates the thumbnail grid with the server-generated thumbnail and green tick

- Support batch: if user selects multiple photos from gallery, queue them and upload sequentially (not in parallel, to avoid overwhelming mobile bandwidth)
- If upload fails (network error), show red X and allow tap-to-retry
- If browser is closed mid-upload, queued uploads are lost. This is acceptable for v1

**Connection handling:**
- Check navigator.onLine before attempting upload
- If offline, show "No connection. Photos will upload when you reconnect." message
- Queue photos in memory (array of File objects with metadata)
- Listen for "online" event, resume uploads automatically
- If too many photos queued (10+), warn user about potential data loss if browser is closed

### 5. Photo Management API

GET /api/turnovers/[id]/photos
- Return all photos for the turnover
- Group by photo_set, then by area
- Include thumbnail URLs (presigned, short expiry)
- Order by upload_timestamp within each group

PATCH /api/photos/[id]
- Owner or uploader can update
- Accept: is_damage_flagged, damage_note, area_id (allow reassigning to different area)

DELETE /api/photos/[id]
- Owner only
- Delete R2 objects (original + thumbnail)
- Delete database record

GET /api/photos/[id]/original
- Generate presigned download URL for the original full-size image
- 1 hour expiry
- Return URL (client redirects or opens in new tab)

## Done When

- [ ] Owner or cleaner can create a turnover for a property
- [ ] Turnover list page shows all turnovers with filters
- [ ] Cleaner upload page shows property/turnover selection
- [ ] Photo set toggle (post_checkout / pre_checkin) works and is visually distinct
- [ ] Area selector chips display correctly for the property
- [ ] Taking a photo via camera input triggers immediate background upload
- [ ] Selecting multiple photos from gallery queues and uploads sequentially
- [ ] Upload flow: presign, direct PUT to R2, confirm with server
- [ ] Server extracts EXIF metadata (timestamp, GPS, device) on confirm
- [ ] Server generates 400px thumbnail on confirm
- [ ] HEIC images convert to JPEG
- [ ] Thumbnails display in upload grid with success/failure indicators
- [ ] Damage flag can be toggled per photo with a text note
- [ ] Turnover auto-updates from "open" to "in_progress" on first photo
- [ ] Offline detection shows appropriate message
- [ ] Upload queue resumes when connection returns
- [ ] All uploaded photos visible via GET /api/turnovers/[id]/photos
