import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getApiSession, isAuthError, isOwner } from "@/lib/auth-helpers";

type RouteContext = { params: Promise<{ id: string }> };

/** Verify the property exists and belongs to user's org */
async function verifyPropertyAccess(propertyId: string, orgId: string) {
  const [property] = await db
    .select()
    .from(schema.properties)
    .where(
      and(
        eq(schema.properties.id, propertyId),
        eq(schema.properties.orgId, orgId)
      )
    )
    .limit(1);
  return property;
}

// GET /api/properties/[id]/areas — list areas for a property
export async function GET(req: NextRequest, context: RouteContext) {
  const session = await getApiSession();
  if (isAuthError(session)) return session;

  const { id } = await context.params;
  const property = await verifyPropertyAccess(id, session.orgId);
  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  // Cleaners: check assignment
  if (session.role === "cleaner") {
    const [assignment] = await db
      .select()
      .from(schema.propertyAssignments)
      .where(
        and(
          eq(schema.propertyAssignments.propertyId, id),
          eq(schema.propertyAssignments.userId, session.userId)
        )
      )
      .limit(1);

    if (!assignment) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }
  }

  const areas = await db
    .select()
    .from(schema.areas)
    .where(eq(schema.areas.propertyId, id))
    .orderBy(schema.areas.sortOrder, schema.areas.name);

  return NextResponse.json(areas);
}

// POST /api/properties/[id]/areas — create area (owner only)
export async function POST(req: NextRequest, context: RouteContext) {
  const session = await getApiSession();
  if (isAuthError(session)) return session;

  if (!isOwner(session)) {
    return NextResponse.json(
      { error: "Only owners can create areas" },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const property = await verifyPropertyAccess(id, session.orgId);
  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const body = await req.json();
  const { name, description, sortOrder } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Area name is required" },
      { status: 400 }
    );
  }

  const [area] = await db
    .insert(schema.areas)
    .values({
      propertyId: id,
      name: name.trim(),
      description: description?.trim() || null,
      sortOrder: sortOrder !== undefined ? parseInt(sortOrder, 10) : 0,
    })
    .returning();

  return NextResponse.json(area, { status: 201 });
}

// PATCH /api/properties/[id]/areas — update area (owner only)
// Body: { areaId, name?, description?, sortOrder? }
export async function PATCH(req: NextRequest, context: RouteContext) {
  const session = await getApiSession();
  if (isAuthError(session)) return session;

  if (!isOwner(session)) {
    return NextResponse.json(
      { error: "Only owners can update areas" },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const property = await verifyPropertyAccess(id, session.orgId);
  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const body = await req.json();
  const { areaId, name, description, sortOrder } = body;

  if (!areaId) {
    return NextResponse.json(
      { error: "areaId is required" },
      { status: 400 }
    );
  }

  // Verify area belongs to this property
  const [existing] = await db
    .select()
    .from(schema.areas)
    .where(
      and(eq(schema.areas.id, areaId), eq(schema.areas.propertyId, id))
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Area not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) {
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Area name cannot be empty" },
        { status: 400 }
      );
    }
    updates.name = name.trim();
  }
  if (description !== undefined) updates.description = description?.trim() || null;
  if (sortOrder !== undefined) updates.sortOrder = parseInt(sortOrder, 10);

  const [updated] = await db
    .update(schema.areas)
    .set(updates)
    .where(eq(schema.areas.id, areaId))
    .returning();

  return NextResponse.json(updated);
}

// DELETE /api/properties/[id]/areas — delete area (owner only)
// Query param: ?areaId=xxx
export async function DELETE(req: NextRequest, context: RouteContext) {
  const session = await getApiSession();
  if (isAuthError(session)) return session;

  if (!isOwner(session)) {
    return NextResponse.json(
      { error: "Only owners can delete areas" },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const property = await verifyPropertyAccess(id, session.orgId);
  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const areaId = searchParams.get("areaId");

  if (!areaId) {
    return NextResponse.json(
      { error: "areaId query parameter is required" },
      { status: 400 }
    );
  }

  // Verify area belongs to this property
  const [existing] = await db
    .select()
    .from(schema.areas)
    .where(
      and(eq(schema.areas.id, areaId), eq(schema.areas.propertyId, id))
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Area not found" }, { status: 404 });
  }

  await db.delete(schema.areas).where(eq(schema.areas.id, areaId));

  return NextResponse.json({ success: true });
}
