import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { TurnoversListClient } from "./turnovers-list";

export default async function TurnoversPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const orgId = session.user.orgId;
  const role = session.user.role;

  // Get accessible properties for filter dropdown
  let properties: { id: string; name: string }[] = [];

  if (role === "cleaner") {
    const assignments = await db
      .select({ propertyId: schema.propertyAssignments.propertyId })
      .from(schema.propertyAssignments)
      .where(eq(schema.propertyAssignments.userId, session.user.id));

    const propertyIds = assignments.map((a) => a.propertyId);
    if (propertyIds.length > 0) {
      properties = await db
        .select({ id: schema.properties.id, name: schema.properties.name })
        .from(schema.properties)
        .where(inArray(schema.properties.id, propertyIds));
    }
  } else {
    properties = await db
      .select({ id: schema.properties.id, name: schema.properties.name })
      .from(schema.properties)
      .where(eq(schema.properties.orgId, orgId));
  }

  return (
    <Suspense>
      <TurnoversListClient properties={properties} role={role} />
    </Suspense>
  );
}
