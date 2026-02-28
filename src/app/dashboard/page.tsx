import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import Link from "next/link";
import { FlaggedItemsSection } from "./flagged-items";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const orgId = session.user.orgId;
  const role = session.user.role;

  // Fetch org name
  let orgName = "Your Organisation";
  if (orgId) {
    const [org] = await db
      .select()
      .from(schema.organisations)
      .where(eq(schema.organisations.id, orgId))
      .limit(1);
    if (org) orgName = org.name;
  }

  // Count properties
  let propertyCount = 0;
  if (orgId) {
    const [result] = await db
      .select({ count: count() })
      .from(schema.properties)
      .where(eq(schema.properties.orgId, orgId));
    propertyCount = result?.count ?? 0;
  }

  // Count turnovers
  let turnoverCount = 0;
  if (orgId) {
    const [result] = await db
      .select({ count: count() })
      .from(schema.turnovers)
      .innerJoin(
        schema.properties,
        eq(schema.turnovers.propertyId, schema.properties.id)
      )
      .where(eq(schema.properties.orgId, orgId));
    turnoverCount = result?.count ?? 0;
  }

  // Count flagged photos
  let flaggedCount = 0;
  if (orgId) {
    const [result] = await db
      .select({ count: count() })
      .from(schema.photos)
      .innerJoin(
        schema.turnovers,
        eq(schema.photos.turnoverId, schema.turnovers.id)
      )
      .innerJoin(
        schema.properties,
        eq(schema.turnovers.propertyId, schema.properties.id)
      )
      .where(
        and(
          eq(schema.properties.orgId, orgId),
          eq(schema.photos.isDamageFlagged, true)
        )
      );
    flaggedCount = result?.count ?? 0;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">Welcome to {orgName}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Properties card */}
        <Link
          href="/properties"
          className="rounded-card bg-surface-card p-6 shadow-sm ring-1 ring-surface-border hover:ring-brand/30 transition-all"
        >
          <h3 className="text-sm font-medium text-gray-500">Properties</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {propertyCount}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {propertyCount === 0 ? "No properties yet" : "active properties"}
          </p>
        </Link>

        {/* Recent turnovers card */}
        <Link
          href="/turnovers"
          className="rounded-card bg-surface-card p-6 shadow-sm ring-1 ring-surface-border hover:ring-brand/30 transition-all"
        >
          <h3 className="text-sm font-medium text-gray-500">Turnovers</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {turnoverCount}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {turnoverCount === 0 ? "No turnovers yet" : "total turnovers"}
          </p>
        </Link>

        {/* Flagged items card */}
        <Link
          href="/turnovers?has_damage=true"
          className="rounded-card bg-surface-card p-6 shadow-sm ring-1 ring-surface-border hover:ring-brand/30 transition-all"
        >
          <h3 className="text-sm font-medium text-gray-500">Flagged Items</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {flaggedCount}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {flaggedCount === 0 ? "No flagged items" : "flagged photos"}
          </p>
        </Link>
      </div>

      {/* Flagged items section */}
      <FlaggedItemsSection />

      {/* Quick actions */}
      {propertyCount === 0 && role === "owner" && (
        <div className="mt-8 rounded-card bg-brand-dim p-6 ring-1 ring-brand/20">
          <h3 className="text-sm font-semibold text-brand">Get started</h3>
          <p className="mt-1 text-sm text-brand">
            Add your first property to start documenting turnovers.
          </p>
          <Link
            href="/properties/new"
            className="mt-3 inline-block rounded-btn bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light"
          >
            Add property
          </Link>
        </div>
      )}
    </div>
  );
}
