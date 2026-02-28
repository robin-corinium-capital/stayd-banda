import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, count } from "drizzle-orm";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const orgId = session.user.orgId;

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">Welcome to {orgName}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Properties card */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Properties</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{propertyCount}</p>
          <p className="mt-1 text-sm text-gray-500">
            {propertyCount === 0 ? "No properties yet" : "active properties"}
          </p>
        </div>

        {/* Recent turnovers card */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Recent Turnovers</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">0</p>
          <p className="mt-1 text-sm text-gray-500">No turnovers yet</p>
        </div>

        {/* Flagged items card */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Flagged Items</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">0</p>
          <p className="mt-1 text-sm text-gray-500">No flagged items</p>
        </div>
      </div>
    </div>
  );
}
