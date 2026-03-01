import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, inArray, desc, asc, gte, lte, sql, count, ilike, or, exists } from "drizzle-orm";
import { getApiSession, isAuthError } from "@/lib/auth-helpers";

// GET /api/turnovers — list turnovers for user's org
export async function GET(req: NextRequest) {
  const session = await getApiSession();
  if (isAuthError(session)) return session;

  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("property_id");
  const status = searchParams.get("status");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const search = searchParams.get("search");
  const hasDamage = searchParams.get("has_damage");
  const sort = searchParams.get("sort") || "checkout_desc";
  const pageRaw = parseInt(searchParams.get("page") || "1", 10);
  const page = isNaN(pageRaw) ? 1 : Math.max(1, pageRaw);
  const limitRaw = parseInt(searchParams.get("limit") || "20", 10);
  const limit = isNaN(limitRaw) ? 20 : Math.min(100, Math.max(1, limitRaw));

  // Get accessible property IDs
  let accessiblePropertyIds: string[];

  if (session.role === "cleaner") {
    const assignments = await db
      .select({ propertyId: schema.propertyAssignments.propertyId })
      .from(schema.propertyAssignments)
      .where(eq(schema.propertyAssignments.userId, session.userId));

    if (assignments.length === 0) {
      return NextResponse.json({ turnovers: [], totalCount: 0, page, limit, totalPages: 0 });
    }
    accessiblePropertyIds = assignments.map((a) => a.propertyId);
  } else {
    const props = await db
      .select({ id: schema.properties.id })
      .from(schema.properties)
      .where(eq(schema.properties.orgId, session.orgId));
    accessiblePropertyIds = props.map((p) => p.id);
  }

  if (accessiblePropertyIds.length === 0) {
    return NextResponse.json({ turnovers: [], totalCount: 0, page, limit, totalPages: 0 });
  }

  // Auto-complete overdue turnovers: checkinDate < today - 24h AND status = 'in_progress'
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const oneDayAgoDate = oneDayAgo.toISOString().split("T")[0];

  await db
    .update(schema.turnovers)
    .set({ status: "complete", completedAt: new Date() })
    .where(
      and(
        inArray(schema.turnovers.propertyId, accessiblePropertyIds),
        eq(schema.turnovers.status, "in_progress"),
        lte(schema.turnovers.checkinDate, oneDayAgoDate)
      )
    );

  // If filtering by property, validate access
  if (propertyId && !accessiblePropertyIds.includes(propertyId)) {
    return NextResponse.json(
      { error: "Property not found or not accessible" },
      { status: 404 }
    );
  }

  const targetPropertyIds = propertyId
    ? [propertyId]
    : accessiblePropertyIds;

  // Build conditions
  const conditions = [inArray(schema.turnovers.propertyId, targetPropertyIds)];

  if (status && ["open", "in_progress", "complete"].includes(status)) {
    conditions.push(eq(schema.turnovers.status, status as "open" | "in_progress" | "complete"));
  }

  if (dateFrom) {
    conditions.push(gte(schema.turnovers.checkoutDate, dateFrom));
  }

  if (dateTo) {
    conditions.push(lte(schema.turnovers.checkoutDate, dateTo));
  }

  if (search && search.trim()) {
    const searchPattern = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(schema.turnovers.departingGuestRef, searchPattern),
        ilike(schema.turnovers.arrivingGuestRef, searchPattern)
      )!
    );
  }

  if (hasDamage === "true") {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(schema.photos)
          .where(
            and(
              eq(schema.photos.turnoverId, schema.turnovers.id),
              eq(schema.photos.isDamageFlagged, true)
            )
          )
      )
    );
  }

  // Determine sort order
  const orderByClause = (() => {
    switch (sort) {
      case "checkout_asc":
        return asc(schema.turnovers.checkoutDate);
      case "checkin_desc":
        return desc(schema.turnovers.checkinDate);
      case "checkin_asc":
        return asc(schema.turnovers.checkinDate);
      default:
        return desc(schema.turnovers.checkoutDate);
    }
  })();

  // Count total matching turnovers
  const [{ totalCount }] = await db
    .select({ totalCount: count() })
    .from(schema.turnovers)
    .innerJoin(
      schema.properties,
      eq(schema.turnovers.propertyId, schema.properties.id)
    )
    .where(and(...conditions));

  const totalPages = Math.ceil(totalCount / limit);

  // Fetch paginated turnovers
  const turnovers = await db
    .select({
      id: schema.turnovers.id,
      propertyId: schema.turnovers.propertyId,
      checkoutDate: schema.turnovers.checkoutDate,
      checkinDate: schema.turnovers.checkinDate,
      departingGuestRef: schema.turnovers.departingGuestRef,
      arrivingGuestRef: schema.turnovers.arrivingGuestRef,
      status: schema.turnovers.status,
      createdAt: schema.turnovers.createdAt,
      completedAt: schema.turnovers.completedAt,
      propertyName: schema.properties.name,
    })
    .from(schema.turnovers)
    .innerJoin(
      schema.properties,
      eq(schema.turnovers.propertyId, schema.properties.id)
    )
    .where(and(...conditions))
    .orderBy(orderByClause)
    .limit(limit)
    .offset((page - 1) * limit);

  // Get photo counts and damage flag counts per turnover
  const turnoverIds = turnovers.map((t) => t.id);

  let photoCounts: Record<string, { postCheckout: number; preCheckin: number; flagged: number }> = {};

  if (turnoverIds.length > 0) {
    const counts = await db
      .select({
        turnoverId: schema.photos.turnoverId,
        photoSet: schema.photos.photoSet,
        count: count(),
        flagged: sql<number>`count(*) filter (where ${schema.photos.isDamageFlagged} = true)`,
      })
      .from(schema.photos)
      .where(inArray(schema.photos.turnoverId, turnoverIds))
      .groupBy(schema.photos.turnoverId, schema.photos.photoSet);

    for (const row of counts) {
      if (!photoCounts[row.turnoverId]) {
        photoCounts[row.turnoverId] = { postCheckout: 0, preCheckin: 0, flagged: 0 };
      }
      if (row.photoSet === "post_checkout") {
        photoCounts[row.turnoverId].postCheckout = row.count;
      } else {
        photoCounts[row.turnoverId].preCheckin = row.count;
      }
      photoCounts[row.turnoverId].flagged += Number(row.flagged);
    }
  }

  const result = turnovers.map((t) => ({
    ...t,
    photoCountPostCheckout: photoCounts[t.id]?.postCheckout ?? 0,
    photoCountPreCheckin: photoCounts[t.id]?.preCheckin ?? 0,
    flaggedCount: photoCounts[t.id]?.flagged ?? 0,
  }));

  return NextResponse.json({ turnovers: result, totalCount, page, limit, totalPages });
}

// POST /api/turnovers — create turnover
export async function POST(req: NextRequest) {
  const session = await getApiSession();
  if (isAuthError(session)) return session;

  const body = await req.json();
  const { property_id, checkout_date, checkin_date, departing_guest_ref, arriving_guest_ref } = body;

  if (!property_id || !checkout_date || !checkin_date) {
    return NextResponse.json(
      { error: "property_id, checkout_date, and checkin_date are required" },
      { status: 400 }
    );
  }

  // Validate dates
  if (checkin_date < checkout_date) {
    return NextResponse.json(
      { error: "Check-in date must be on or after checkout date" },
      { status: 400 }
    );
  }

  // Validate property access
  const [property] = await db
    .select()
    .from(schema.properties)
    .where(
      and(
        eq(schema.properties.id, property_id),
        eq(schema.properties.orgId, session.orgId)
      )
    )
    .limit(1);

  if (!property) {
    return NextResponse.json(
      { error: "Property not found" },
      { status: 404 }
    );
  }

  // Cleaner must be assigned
  if (session.role === "cleaner") {
    const [assignment] = await db
      .select()
      .from(schema.propertyAssignments)
      .where(
        and(
          eq(schema.propertyAssignments.propertyId, property_id),
          eq(schema.propertyAssignments.userId, session.userId)
        )
      )
      .limit(1);

    if (!assignment) {
      return NextResponse.json(
        { error: "You are not assigned to this property" },
        { status: 403 }
      );
    }
  }

  const [turnover] = await db
    .insert(schema.turnovers)
    .values({
      propertyId: property_id,
      checkoutDate: checkout_date,
      checkinDate: checkin_date,
      departingGuestRef: departing_guest_ref?.trim() || null,
      arrivingGuestRef: arriving_guest_ref?.trim() || null,
      status: "open",
      createdBy: session.userId,
    })
    .returning();

  return NextResponse.json(turnover, { status: 201 });
}
