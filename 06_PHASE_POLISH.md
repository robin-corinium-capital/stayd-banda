# stayd-banda: Phase 6 - Polish and Deploy

Upload 00_SHARED_CONTEXT.md alongside this file.

## What This Session Builds

1. Terms of use page
2. Data retention logic and notifications
3. Mobile UI polish
4. Error handling and edge cases
5. Final deployment and verification

## Assumes Phases 1-5 Are Complete

- Full upload, retrieval, and export flow working
- All pages rendering
- Auth, invites, properties, turnovers, photos all functional

## Step by Step

### 1. Terms of Use Page

**Page: /terms**

Static page with the following content. Style it cleanly with Tailwind prose classes.

```
TERMS OF USE

Last updated: [current date]

1. SERVICE DESCRIPTION
This tool ("the Service") is provided by Corinium Capital Limited ("we", "us") for the purpose of documenting property condition during holiday let turnovers. The Service allows users to upload, store, retrieve, and export timestamped photographs and associated metadata.

2. NO WARRANTIES
The Service is provided "as is" and "as available" without warranties of any kind, whether express or implied. We do not warrant that the Service will be uninterrupted, error-free, or free from harmful components. We make no guarantees regarding the availability, reliability, or accuracy of the Service.

3. NO SUPPORT
The Service is provided without technical support. We may, at our sole discretion, provide assistance or updates but are under no obligation to do so.

4. DATA STORAGE AND RESIDENCY
All data uploaded to the Service, including photographs and associated metadata, is stored on servers located within the European Economic Area. We use Cloudflare R2 (European region) for file storage and Vercel Postgres (EU region) for database storage.

5. DATA RETENTION
Uploaded data is retained for 12 months from the date the associated turnover is marked as complete. Users will be notified by email 30 days before scheduled deletion. Users may export their data at any time using the built-in download functionality. Users may request deletion of their data at any time.

6. DATA PROTECTION
We process personal data in accordance with applicable data protection laws, including the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018. Personal data collected includes: email address, name, uploaded photographs, photograph metadata (including GPS coordinates and device information where available). The lawful basis for processing is legitimate interest (providing the Service) and consent (where applicable). Users have the right to access, rectify, erase, restrict processing, and port their data. Contact privacy@stayd-tools.com for data protection queries.

7. USER RESPONSIBILITIES
Users are responsible for ensuring they have the right to upload photographs and that uploaded content does not infringe the rights of any third party. Users must not upload AI generated or AI enhanced images. The Service is designed to store genuine, unmodified photographic evidence.

8. LIMITATION OF LIABILITY
To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of the Service. Our total liability for any claim arising from or related to the Service shall not exceed the amount paid by you (if any) for access to the Service in the 12 months preceding the claim.

9. INTELLECTUAL PROPERTY
You retain all rights to photographs and content you upload. By uploading content, you grant us a limited licence to store, process, and display that content solely for the purpose of providing the Service to you.

10. MODIFICATIONS
We reserve the right to modify or discontinue the Service at any time, with or without notice. We will make reasonable efforts to notify users of material changes via email.

11. GOVERNING LAW
These terms are governed by the laws of England and Wales.

12. CONTACT
Corinium Capital Limited
[registered address]
hello@stayd-tools.com
```

Add a link to /terms in:
- Footer of every page
- Registration page (checkbox: "I agree to the Terms of Use")
- Landing page footer

### 2. Data Retention Logic

**Retention check (on turnovers list page load):**

For v1, run this check when the /turnovers or /dashboard page loads (not as a background job):

```sql
-- Find turnovers due for deletion in the next 30 days
SELECT t.*, p.name as property_name, o.id as org_id
FROM turnovers t
JOIN properties p ON t.property_id = p.id
JOIN organisations o ON p.org_id = o.id
WHERE t.status = 'complete'
AND t.retention_extended = false
AND t.completed_at < NOW() - INTERVAL '11 months'
AND t.completed_at >= NOW() - INTERVAL '12 months'
```

For turnovers in this window:
- Show a warning banner on the dashboard: "[X] turnovers will be deleted in [Y] days. Download evidence packs before deletion."
- Link each warning to the turnover detail page

**Deletion notification email:**

Send once when a turnover enters the 30-day warning window. To avoid sending duplicates, use the retention_notified_at column on the turnovers table (already in the base schema).

On page load check: if turnovers are in the warning window and retention_notified_at is null, send the email and set the timestamp.

Email content:
- Subject: "Turnover evidence expiring soon: [property name], [checkout date]"
- Body: property name, turnover dates, photo count, link to download evidence pack, link to extend retention
- "Extend retention" link goes to the turnover detail page where the owner can toggle retention_extended

**Actual deletion:**

For v1, do not auto-delete. Show a "Delete expired data" button on the settings page that the owner can trigger manually. This avoids building a cron job for now.

The button should:
1. Find all complete turnovers where completed_at < NOW() - INTERVAL '12 months' AND retention_extended = false
2. For each: delete R2 objects (original + thumbnail for every photo), then delete the turnover record (cascades to photos)
3. Show confirmation with count of deleted turnovers

### 3. Extend Retention

On /turnovers/[id]:
- If turnover is complete, show "Retention" section
- Show: "This turnover's evidence will be retained until [completed_at + 12 months]"
- If in the 30-day warning window: show warning with "Extend retention" button
- "Extend retention" sets retention_extended = true via PATCH /api/turnovers/[id]
- Extended turnovers show "Retention extended (no expiry)" label. They are excluded from deletion until manually deleted by the owner

### 4. Mobile UI Polish

Go through every page on a mobile viewport (375px width) and fix:

**Navigation:**
- Hamburger menu working correctly
- Menu items have large enough tap targets (minimum 44px)
- Active page highlighted in nav
- Smooth open/close animation

**Property list:**
- Cards stack vertically on mobile
- Card content does not overflow
- "Add property" button accessible without scrolling (sticky or at top)

**Turnover list:**
- Filters collapse into an expandable section on mobile
- Table converts to card layout on mobile
- Dates readable without truncation

**Upload interface (most critical):**
- Photo set toggle buttons are full width and tall (minimum 56px)
- Area chips scroll horizontally without breaking layout
- Camera button is large and centred (minimum 64px)
- Thumbnail grid uses 3 columns on mobile, 4 on tablet
- Damage flag tap target is large enough to hit accurately
- Note input does not get hidden behind the keyboard (scroll into view on focus)

**Turnover detail:**
- Photo set tabs work smoothly
- Thumbnails in a responsive grid (3 columns mobile, 4 tablet, 6 desktop)
- Photo viewer is truly full-screen on mobile with no scroll bleed
- Swipe gestures work for photo navigation

**General:**
- No horizontal scroll on any page
- All form inputs have appropriate mobile keyboard types (email, number, date, text)
- Date pickers use native mobile date inputs where possible
- Loading states on all async operations (spinners or skeleton screens)
- Toast notifications for success/error (use a simple toast library or build a basic one)

### 5. Error Handling

**API error responses:**
- All API routes return consistent error format: { error: string, code?: string }
- 400 for validation errors (include which field failed)
- 401 for unauthenticated
- 403 for forbidden (no access to this resource)
- 404 for not found
- 500 for server errors (log the actual error server-side, return generic message to client)

**Client error handling:**
- Wrap all fetch calls in try/catch
- Show user-friendly error messages (not raw error codes)
- "Something went wrong. Please try again." for unexpected errors
- "You don't have access to this resource." for 403
- "This item was not found." for 404
- Network errors: "Could not connect. Check your internet connection."

**Edge cases to handle:**
- User tries to upload to a completed turnover: block with message "This turnover is complete. Create a new turnover to upload photos."
- User tries to access a property they are not assigned to: 403
- Invite link expired: show friendly message with option to ask the owner for a new link
- Invite link already used: show message with link to dashboard
- Photo upload fails mid-batch: already handled in Phase 3 (retry per photo), but verify error states display correctly
- R2 presigned URL expired: if upload takes longer than 15 minutes, generate a new presigned URL and retry
- Very large images (20MB+): reject at the presign stage with "Image too large. Maximum 20MB."
- Unsupported format: reject with "Unsupported format. Please upload JPEG, PNG, or HEIC."

### 6. Settings Pages

**Page: /settings**

Account settings:
- Name (editable)
- Email (display only for v1, changing email requires verification flow)
- Password change (current password, new password, confirm)
- Sign out of all devices (invalidate all sessions)

**Page: /settings/team**

Organisation settings:
- Organisation name (editable)
- Members list: name, email, role, date joined
- For each cleaner: list of assigned properties
- "Remove member" button (removes org_members record and all property_assignments)
- "Create invite" button (links to invite creation)
- Pending invites: show token (truncated), role, created date, expires date, "Revoke" button

### 7. Final Deploy

- Run through every user flow end-to-end:
  1. Register new account
  2. Create a property with 3 bedrooms
  3. Verify areas auto-generated
  4. Create a turnover
  5. Upload photos (test on actual mobile phone if possible)
  6. Flag a photo with damage note
  7. View turnover detail with side-by-side sets
  8. Download ZIP
  9. Download PDF report
  10. Invite a cleaner via link
  11. Accept invite in a different browser/incognito
  12. Verify cleaner can only see assigned property
  13. Verify cleaner can upload photos
  14. Verify cleaner cannot delete properties
  15. Mark turnover complete
  16. Check retention warning logic

- Verify European data residency:
  - Vercel Postgres: check database region in Vercel dashboard (should show EU/Frankfurt)
  - R2: verify bucket jurisdiction in Cloudflare dashboard
  - Vercel: check deployment region in project settings (lhr1 London)

- Push final code to GitHub
- Deploy to Vercel
- Verify custom domain (banda.stayd-tools.com) is configured and SSL working

## Done When

- [ ] Terms of use page renders at /terms
- [ ] Terms checkbox on registration
- [ ] Terms link in footer on all pages
- [ ] Retention warning banner shows on dashboard for expiring turnovers
- [ ] Retention notification email sends (once per turnover)
- [ ] "Extend retention" toggle works on turnover detail
- [ ] "Delete expired data" button on settings works
- [ ] All pages render correctly on 375px mobile viewport
- [ ] Upload interface is usable on a real phone
- [ ] Photo viewer supports swipe on mobile
- [ ] No horizontal scroll on any page
- [ ] All API routes return consistent error format
- [ ] User-friendly error messages in the UI
- [ ] Edge cases handled (expired invites, completed turnovers, expired presigned URLs)
- [ ] Settings page: name editable, password changeable
- [ ] Team management: member list, remove member, pending invites
- [ ] Full end-to-end flow tested
- [ ] Deployed to Vercel EU region with custom domain (banda.stayd-tools.com)
- [ ] European data residency verified for all services (Vercel Postgres EU, R2 EU, Vercel lhr1)

## Success Metrics for v1

Once deployed, track:
- 5+ owners/agencies sign up and use it for real turnovers in the first month
- At least one user generates a PDF evidence report for an actual damage claim
- Feedback on whether area-based organisation works
- Feedback on whether cleaners adopt it or revert to WhatsApp photos
- Upload success rate on mobile (target: 95%+ without connection drops)
