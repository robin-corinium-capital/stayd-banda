import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql, isNull } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendEmail, retentionWarningEmailHtml } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    let body: { orgId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { orgId } = body;
    if (!orgId) {
      return NextResponse.json({ error: "orgId required" }, { status: 400 });
    }

    // Find turnovers in the 30-day warning window that haven't been notified
    const expiringTurnovers = await db
      .select({
        id: schema.turnovers.id,
        checkoutDate: schema.turnovers.checkoutDate,
        checkinDate: schema.turnovers.checkinDate,
        completedAt: schema.turnovers.completedAt,
        propertyName: schema.properties.name,
      })
      .from(schema.turnovers)
      .innerJoin(
        schema.properties,
        eq(schema.turnovers.propertyId, schema.properties.id)
      )
      .where(
        and(
          eq(schema.properties.orgId, orgId),
          eq(schema.turnovers.status, "complete"),
          eq(schema.turnovers.retentionExtended, false),
          isNull(schema.turnovers.retentionNotifiedAt),
          sql`${schema.turnovers.completedAt} < NOW() - INTERVAL '11 months'`,
          sql`${schema.turnovers.completedAt} >= NOW() - INTERVAL '12 months'`
        )
      );

    if (expiringTurnovers.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    // Get org owner email
    const [owner] = await db
      .select({ email: schema.users.email })
      .from(schema.orgMembers)
      .innerJoin(schema.users, eq(schema.orgMembers.userId, schema.users.id))
      .where(
        and(
          eq(schema.orgMembers.orgId, orgId),
          eq(schema.orgMembers.role, "owner")
        )
      )
      .limit(1);

    if (!owner) {
      return NextResponse.json({ sent: 0 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://banda.stayd-tools.com";
    let sent = 0;

    for (const turnover of expiringTurnovers) {
      try {
        // Count photos
        const [photoCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(schema.photos)
          .where(eq(schema.photos.turnoverId, turnover.id));

        await sendEmail({
          to: owner.email,
          subject: `Turnover evidence expiring soon: ${turnover.propertyName}, ${turnover.checkoutDate}`,
          html: retentionWarningEmailHtml({
            propertyName: turnover.propertyName,
            checkoutDate: turnover.checkoutDate,
            checkinDate: turnover.checkinDate,
            photoCount: photoCount?.count ?? 0,
            downloadUrl: `${appUrl}/api/export/turnover/${turnover.id}`,
            extendUrl: `${appUrl}/turnovers/${turnover.id}`,
          }),
        });

        // Mark as notified
        await db
          .update(schema.turnovers)
          .set({ retentionNotifiedAt: new Date() })
          .where(eq(schema.turnovers.id, turnover.id));

        sent++;
      } catch (err) {
        console.error(`Failed to send retention email for turnover ${turnover.id}:`, err);
      }
    }

    return NextResponse.json({ sent });
  } catch (error) {
    console.error("Retention notify error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
