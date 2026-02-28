# stayd-banda: Phase 2 - Property Admin and Invites

Upload 00_SHARED_CONTEXT.md alongside this file.

## What This Session Builds

1. Property CRUD pages (create, list, view, edit, delete)
2. Area management with auto-generation from bedroom count
3. Cleaner invite system (generate link, accept link, assign to properties)
4. Role-based access control middleware

## Assumes Phase 1 Is Complete

- Auth working (email/password + Google SSO)
- Database schema deployed
- Dashboard shell rendering
- User has an organisation after registration

## Step by Step

### 1. Role-Based Access Helpers

**src/lib/auth-helpers.ts**

Create helper functions used throughout the app:

- getCurrentUser(session): returns user ID, org ID, role from session
- requireRole(session, roles: string[]): throws 403 if user's role is not in the allowed list
- canAccessProperty(userId, propertyId): checks property_assignments table (for cleaners) or org membership (for owners). Returns boolean
- isOrgOwner(userId, orgId): checks org_members for owner role

All database queries use Drizzle ORM (db.select(), db.insert(), db.update(), db.delete() with schema references). Never raw SQL.

### 2. Property CRUD

**API routes:**

POST /api/properties
- Owner only
- Accept: name (required), address, property_type, bedrooms, notes
- Insert into properties table with the user's org_id
- If bedrooms is provided, auto-generate areas (see area templates below)
- Return the created property

GET /api/properties
- Owner: returns all properties for their org
- Cleaner: returns only assigned properties (JOIN with property_assignments)
- Include counts: number of areas, number of turnovers, number of flagged photos

GET /api/properties/[id]
- Check access (owner of org, or cleaner assigned to property)
- Return property with areas, assigned cleaners, and recent turnovers (last 5)

PATCH /api/properties/[id]
- Owner only
- Update name, address, property_type, bedrooms, notes, is_active

DELETE /api/properties/[id]
- Owner only
- Soft consideration: this cascades to areas, turnovers, and photos. Confirm in the UI before allowing. For v1, hard delete is acceptable since there is no billing

**Pages:**

/properties (list):
- Card grid of properties
- Each card shows: name, address, bedroom count, active/inactive badge, area count, turnover count
- "Add property" button (owner only)
- Search/filter by name
- Inactive properties shown with reduced opacity

/properties/new (create form):
- Name (text input, required)
- Address (text input)
- Property type (dropdown: house, flat, cottage, lodge, apartment, cabin, barn, other)
- Bedrooms (number input)
- Notes (textarea)
- Submit creates property and redirects to /properties/[id]

/properties/[id] (detail):
- Property info at top (editable inline or via edit button)
- Tabs or sections:
  1. Areas: list with drag-to-reorder, add/edit/delete
  2. Team: assigned cleaners with remove button, "Invite cleaner" button
  3. Turnovers: recent turnovers for this property, "New turnover" button

/properties/[id]/areas (manage areas):
- List of areas with sort_order
- Drag to reorder (or up/down arrows for simplicity in v1)
- Inline edit: click area name to rename
- Add area: text input at bottom of list
- Delete area: X button with confirmation
- Each area shows description field (expandable)

### 3. Area Templates

When a property is created with a bedroom count, auto-generate these areas:

Default areas (always created):
- Kitchen
- Living room
- Hallway/entrance
- Exterior/garden

Per bedroom (generated based on count):
- Bedroom 1, Bedroom 2, ... Bedroom N

Bathrooms (heuristic):
- 1 bedroom: 1 bathroom
- 2-3 bedrooms: 2 bathrooms (Bathroom 1, Bathroom 2)
- 4+ bedrooms: 3 bathrooms

Additional for 3+ bedrooms:
- Utility room

Set sort_order sequentially: hallway first, then kitchen, living room, bedrooms, bathrooms, utility, exterior.

The owner can always add, remove, rename, or reorder after creation.

### 4. Invite System

**Important v1 restriction:** A user can only belong to one organisation. If a user who already has an org accepts an invite to a different org, show an error: "You already belong to an organisation. Please contact support to switch." This avoids building an org switcher for v1. The JWT stores a single org_id and the whole auth flow assumes one org per user. Revisit in v2 if agencies need to share cleaners across organisations.

**API routes:**

POST /api/invites
- Owner only
- Accept: role ("cleaner" or "viewer"), property_ids (array of UUIDs, optional, null means all properties)
- Generate a random token (use crypto.randomUUID())
- Set expires_at to 7 days from now
- Insert into invites table
- Send invite email via Resend with a link: {APP_URL}/invite/{token}
- Return the invite link

GET /api/invites
- Owner only
- Return all pending invites for the org (where used_by is null and expires_at is in the future)

DELETE /api/invites/[id]
- Owner only
- Delete the invite (revoke before use)

GET /api/invites/[token]
- Public (no auth required)
- Look up invite by token
- Check: not expired, not already used
- Return: org name, role, property names (for display on the accept page)
- If invalid/expired, return appropriate error

POST /api/invites/[token]
- Authenticated user required (they must be logged in or create an account first)
- Validate invite: not expired, not used
- Add user to org_members with the specified role
- If property_ids specified, create property_assignments for each
- If property_ids is null, create property_assignments for all current properties in the org
- Mark invite as used (set used_by and used_at)
- Return success with redirect URL to /dashboard

**Pages:**

/invite/[token]:
- Fetch invite details (GET /api/invites/[token])
- If invalid/expired: show error message with link to register
- If valid: show "You've been invited to join [org name] as a [role]"
- If not logged in: show login/register options. After auth, redirect back to this page to complete acceptance
- If logged in: show "Accept invitation" button. On click, POST to accept the invite
- After acceptance: redirect to /dashboard

**Team management on property detail page:**

/properties/[id] team section:
- List assigned cleaners: name, email, role, date assigned
- Remove button next to each (removes property_assignment, not org membership)
- "Invite cleaner" button: opens a modal/form to create an invite scoped to this property
- "Copy invite link" button for sharing via WhatsApp/text (cleaners often prefer this over email)

### 5. Property Assignment Management

POST /api/properties/[id]/assign
- Owner only
- Accept: user_id
- Check user is a member of the org with cleaner role
- Create property_assignment
- Return success

DELETE /api/properties/[id]/assign
- Owner only
- Accept: user_id
- Delete the property_assignment
- Return success

Also allow assigning existing org members to additional properties from the property detail page.

## Done When

- [ ] Owner can create a property with name, address, bedrooms
- [ ] Areas auto-generate based on bedroom count
- [ ] Owner can add, rename, reorder, and delete areas
- [ ] Owner can view property list with counts
- [ ] Owner can view property detail with areas, team, and turnovers sections
- [ ] Owner can generate an invite link for a cleaner role
- [ ] Invite link can be opened, shows org name and role
- [ ] New user can register and accept invite in one flow
- [ ] Existing user can accept invite
- [ ] Accepted invite creates org membership and property assignments
- [ ] Cleaner can only see assigned properties in their property list
- [ ] Owner can remove a cleaner from a property
- [ ] Invite expires after 7 days
- [ ] Invite email sends via Resend
