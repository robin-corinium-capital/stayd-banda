import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, inArray, count } from "drizzle-orm";
import Link from "next/link";

export default async function PropertiesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const orgId = session.user.orgId;
  const role = session.user.role;

  let propertiesList: (typeof schema.properties.$inferSelect & {
    areaCount: number;
  })[] = [];

  if (role === "cleaner") {
    // Cleaners see only assigned properties
    const assignments = await db
      .select({ propertyId: schema.propertyAssignments.propertyId })
      .from(schema.propertyAssignments)
      .where(eq(schema.propertyAssignments.userId, session.user.id));

    if (assignments.length > 0) {
      const propertyIds = assignments.map((a) => a.propertyId);
      const rows = await db
        .select()
        .from(schema.properties)
        .where(
          and(
            eq(schema.properties.orgId, orgId),
            inArray(schema.properties.id, propertyIds)
          )
        )
        .orderBy(schema.properties.name);

      // Get area counts
      for (const p of rows) {
        const [result] = await db
          .select({ count: count() })
          .from(schema.areas)
          .where(eq(schema.areas.propertyId, p.id));
        propertiesList.push({ ...p, areaCount: result?.count ?? 0 });
      }
    }
  } else {
    const rows = await db
      .select()
      .from(schema.properties)
      .where(eq(schema.properties.orgId, orgId))
      .orderBy(schema.properties.name);

    for (const p of rows) {
      const [result] = await db
        .select({ count: count() })
        .from(schema.areas)
        .where(eq(schema.areas.propertyId, p.id));
      propertiesList.push({ ...p, areaCount: result?.count ?? 0 });
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="mt-1 text-sm text-gray-600">
            {propertiesList.length === 0
              ? "No properties yet"
              : `${propertiesList.length} ${propertiesList.length === 1 ? "property" : "properties"}`}
          </p>
        </div>
        {role === "owner" && (
          <Link
            href="/properties/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add property
          </Link>
        )}
      </div>

      {propertiesList.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
            />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-gray-900">
            No properties
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {role === "owner"
              ? "Get started by adding your first property."
              : "You haven't been assigned to any properties yet."}
          </p>
          {role === "owner" && (
            <Link
              href="/properties/new"
              className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add property
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {propertiesList.map((property) => (
            <Link
              key={property.id}
              href={`/properties/${property.id}`}
              className="block rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200 hover:ring-blue-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <h3 className="text-base font-semibold text-gray-900">
                  {property.name}
                </h3>
                {!property.isActive && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    Inactive
                  </span>
                )}
              </div>
              {property.address && (
                <p className="mt-1 text-sm text-gray-500">{property.address}</p>
              )}
              <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                {property.propertyType && (
                  <span className="capitalize">{property.propertyType}</span>
                )}
                {property.bedrooms !== null && (
                  <span>
                    {property.bedrooms} {property.bedrooms === 1 ? "bedroom" : "bedrooms"}
                  </span>
                )}
                <span>
                  {property.areaCount} {property.areaCount === 1 ? "area" : "areas"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
