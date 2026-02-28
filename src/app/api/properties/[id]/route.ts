import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getApiSession, isAuthError, isOwner } from "@/lib/auth-helpers";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/properties/[id] — get property with areas
export async function GET(req: NextRequest, context: RouteContext) {
  const session = await getApiSession();
  if (isAuthError(session)) return session;

  const { id } = await context.params;

  const [property] = await db
    .select()
    .from(schema.properties)
    .where(
      and(
        eq(schema.properties.id, id),
        eq(schema.properties.orgId, session.orgId)
      )
    )
    .limit(1);

  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  // If cleaner, check assignment
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

  // Fetch areas
  const areas = await db
    .select()
    .from(schema.areas)
    .where(eq(schema.areas.propertyId, id))
    .orderBy(schema.areas.sortOrder, schema.areas.name);

  return NextResponse.json({ ...property, areas });
}

// PATCH /api/properties/[id] — update property (owner only)
export async function PATCH(req: NextRequest, context: RouteContext) {
  const session = await getApiSession();
  if (isAuthError(session)) return session;

  if (!isOwner(session)) {
    return NextResponse.json(
      { error: "Only owners can update properties" },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const body = await req.json();

  // Verify property belongs to org
  const [existing] = await db
    .select()
    .from(schema.properties)
    .where(
      and(
        eq(schema.properties.id, id),
        eq(schema.properties.orgId, session.orgId)
      )
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (body.name !== undefined) {
    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: "Property name cannot be empty" },
        { status: 400 }
      );
    }
    updates.name = body.name.trim();
  }
  if (body.address !== undefined) updates.address = body.address?.trim() || null;
  if (body.propertyType !== undefined) updates.propertyType = body.propertyType?.trim() || null;
  if (body.bedrooms !== undefined) updates.bedrooms = body.bedrooms ? parseInt(body.bedrooms, 10) : null;
  if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;
  if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);

  const [updated] = await db
    .update(schema.properties)
    .set(updates)
    .where(eq(schema.properties.id, id))
    .returning();

  return NextResponse.json(updated);
}

// DELETE /api/properties/[id] — delete property (owner only)
export async function DELETE(req: NextRequest, context: RouteContext) {
  const session = await getApiSession();
  if (isAuthError(session)) return session;

  if (!isOwner(session)) {
    return NextResponse.json(
      { error: "Only owners can delete properties" },
      { status: 403 }
    );
  }

  const { id } = await context.params;

  // Verify property belongs to org
  const [existing] = await db
    .select()
    .from(schema.properties)
    .where(
      and(
        eq(schema.properties.id, id),
        eq(schema.properties.orgId, session.orgId)
      )
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  await db.delete(schema.properties).where(eq(schema.properties.id, id));

  return NextResponse.json({ success: true });
}
