# stayd-banda: Phase 4 - Retrieval and Search

Upload 00_SHARED_CONTEXT.md alongside this file.

## What This Session Builds

1. Turnover detail view with side-by-side photo sets
2. Search and filter across turnovers and photos
3. Full-size photo viewer with metadata overlay
4. Damage flag management from the owner view

## Assumes Phases 1-3 Are Complete

- Properties, areas, turnovers, photo upload all working
- Photos exist in R2 with thumbnails and EXIF metadata in the database

## Step by Step

### 1. Turnover Detail View

**Page: /turnovers/[id]**

This is the primary evidence review screen. Layout:

**Header section:**
- Property name (linked to /properties/[id])
- Turnover dates: "Checkout: [date] / Checkin: [date]"
- Guest references (if provided)
- Status badge (open / in progress / complete)
- Action buttons: "Mark complete" (if not complete), "Download ZIP", "Download report" (these connect to Phase 5, add disabled placeholders for now)

**Photo sets section:**

Desktop layout: two columns side by side
- Left column header: "After guest left" (post_checkout) with photo count
- Right column header: "Before next guest" (pre_checkin) with photo count

Mobile layout: tabbed view
- Tab 1: "After guest left" with count badge
- Tab 2: "Before next guest" with count badge

Within each column/tab, photos are grouped by area:

```
Kitchen (3 photos)
  [thumb] [thumb] [thumb]

Bedroom 1 (2 photos)
  [thumb] [thumb]

Bathroom (4 photos)
  [thumb] [thumb] [thumb] [thumb]

General (1 photo)
  [thumb]
```

Each thumbnail shows:
- The image (400px thumbnail from R2)
- Damage flag indicator (red dot or border if flagged)
- Capture timestamp below

If a photo is flagged:
- Red border around thumbnail
- Damage note displayed below the timestamp
- Flag icon visible

Areas with no photos for that set should still appear with "No photos" placeholder (this makes it obvious which areas were missed).

**Side-by-side comparison (desktop):**
When the user clicks an area header, expand to show post_checkout and pre_checkin photos for that area in a two-column layout. This is the comparison view that makes damage claims obvious: "here is what it looked like when the guest left, here is what it looked like when we set it up for the next guest."

### 2. Full-Size Photo Viewer

Clicking any thumbnail opens a full-screen photo viewer.

**Viewer features:**
- Full-size image (loaded via presigned URL from GET /api/photos/[id]/original)
- Swipe left/right (mobile) or arrow keys (desktop) to navigate between photos in the same set and area
- Pinch to zoom on mobile
- Metadata overlay (tap to show/hide on mobile, always visible in sidebar on desktop):
  - Upload timestamp (server UTC, formatted to local time)
  - Capture timestamp (from EXIF, if available)
  - GPS coordinates (if available, with "Open in Maps" link)
  - Device: make and model
  - Uploader name
  - Area name
  - Photo set type
  - File size
  - Original filename
- Damage flag toggle: button to flag/unflag directly from the viewer
- Damage note: editable text field if flagged
- Close button (X) returns to turnover detail

**Implementation notes:**
- Use presigned URLs with 1-hour expiry for full-size images
- Lazy load: only fetch the presigned URL for the currently viewed photo and one ahead/behind
- Show loading spinner while full-size image loads
- Keep the viewer as a modal/overlay so the turnover detail page state is preserved

### 3. Search and Filter

**Page: /turnovers (enhanced from Phase 3)**

Add comprehensive filtering:

Filters (top of page, collapsible on mobile):
- Property: dropdown of all accessible properties (or search for orgs with many)
- Status: all / open / in progress / complete (tabs or dropdown)
- Date range: from date and to date (filters on checkout_date)
- Has damage: toggle to show only turnovers with flagged photos
- Search: free text search on guest references

Results:
- Table on desktop, card list on mobile
- Columns: property name, checkout date, checkin date, status, post-checkout photos (count), pre-checkin photos (count), flagged (count)
- Click row to open /turnovers/[id]
- Sort by checkout date (default descending), clickable column headers to change sort
- Pagination: 20 per page

**Flagged items view:**

Add to the dashboard (/dashboard):
- "Flagged items" section shows all photos with is_damage_flagged = true across all properties
- Each flagged item shows: thumbnail, property name, area, turnover dates, damage note
- Click to open the turnover detail at that photo

Query for dashboard flagged items (use Drizzle's query builder, this SQL shows the logic):
```sql
SELECT p.*, t.checkout_date, t.checkin_date, pr.name as property_name, a.name as area_name
FROM photos p
JOIN turnovers t ON p.turnover_id = t.id
JOIN properties pr ON t.property_id = pr.id
LEFT JOIN areas a ON p.area_id = a.id
WHERE p.is_damage_flagged = true
AND pr.org_id = [user's org_id]
ORDER BY p.upload_timestamp DESC
LIMIT 10
```

Implement this with Drizzle's relational query API or db.select().from().innerJoin().where() chain.

### 4. Photo Notes and Annotations

**Owner can add notes to photos after upload:**

From the turnover detail view or the photo viewer, the owner can:
- Add or edit a text note on any photo (not just flagged ones)
- This uses PATCH /api/photos/[id] with a "note" field
- Add a separate owner_note column to photos table if you want to distinguish uploader notes from owner notes. For v1, a single damage_note field is sufficient

**Owner can reassign photos to different areas:**

If a cleaner uploads a photo to the wrong area:
- From the photo viewer, owner can change the area assignment
- Dropdown of areas for that property
- PATCH /api/photos/[id] with new area_id

### 5. Turnover Completion

**Mark complete flow:**

From /turnovers/[id]:
- "Mark complete" button (visible to owner when status is not "complete")
- On click: PATCH /api/turnovers/[id] with status "complete"
- Server sets completed_at to NOW()
- Completed turnovers show differently in the list (greyed out or with a checkmark)

**Auto-complete:**
- Add a check (can be a simple cron-like function or checked on page load):
- If a turnover's checkin_date was more than 24 hours ago and status is still "in_progress", auto-complete it
- For v1, do this check when the turnovers list is loaded (not a background job). Query for turnovers where checkin_date < NOW() - interval '24 hours' AND status = 'in_progress', update them to 'complete'

## Done When

- [ ] Turnover detail shows post-checkout and pre-checkin photos grouped by area
- [ ] Desktop: side-by-side columns for the two photo sets
- [ ] Mobile: tabbed view for the two photo sets
- [ ] Areas with no photos show "No photos" placeholder
- [ ] Clicking a thumbnail opens full-size photo viewer
- [ ] Viewer supports swipe/arrow navigation between photos
- [ ] Viewer shows metadata overlay (timestamps, GPS, device, uploader)
- [ ] GPS coordinates link to maps
- [ ] Damage flag can be toggled from the viewer
- [ ] Damage note editable from the viewer
- [ ] Turnovers list has working filters: property, status, date range, has-damage
- [ ] Turnovers list supports sorting and pagination
- [ ] Dashboard shows flagged items across all properties
- [ ] Owner can reassign a photo to a different area
- [ ] "Mark complete" updates turnover status
- [ ] Auto-complete triggers for overdue turnovers
