import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getApiSession, isAuthError, isOwner } from "@/lib/auth-helpers";

// GET /api/properties — list properties for user's org
export async function GET() {
  const session = await getApiSession();
  if (isAuthError(session)) return session;

  // Cleaners only see assigned properties
  if (session.role === "cleaner") {
    const assignments = await db
      .select({ propertyId: schema.propertyAssignments.propertyId })
      .from(schema.propertyAssignments)
      .where(eq(schema.propertyAssignments.userId, session.userId));

    if (assignments.length === 0) {
      return NextResponse.json([]);
    }

    const propertyIds = assignments.map((a) => a.propertyId);
    const properties = await db
      .select()
      .from(schema.properties)
      .where(
        and(
          eq(schema.properties.orgId, session.orgId),
          inArray(schema.properties.id, propertyIds)
        )
      )
      .orderBy(schema.properties.name);

    return NextResponse.json(properties);
  }

  // Owners and viewers see all org properties
  const properties = await db
    .select()
    .from(schema.properties)
    .where(eq(schema.properties.orgId, session.orgId))
    .orderBy(schema.properties.name);

  return NextResponse.json(properties);
}

// POST /api/properties — create property (owner only)
export async function POST(req: NextRequest) {
  const session = await getApiSession();
  if (isAuthError(session)) return session;

  if (!isOwner(session)) {
    return NextResponse.json(
      { error: "Only owners can create properties" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { name, address, propertyType, bedrooms, notes } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Property name is required" },
      { status: 400 }
    );
  }

  const [property] = await db
    .insert(schema.properties)
    .values({
      orgId: session.orgId,
      name: name.trim(),
      address: address?.trim() || null,
      propertyType: propertyType?.trim() || null,
      bedrooms: bedrooms ? parseInt(bedrooms, 10) : null,
      notes: notes?.trim() || null,
    })
    .returning();

  return NextResponse.json(property, { status: 201 });
}
