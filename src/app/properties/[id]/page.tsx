import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import Link from "next/link";
import { PropertyActions } from "./property-actions";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const orgId = session.user.orgId;
  const role = session.user.role;

  // Fetch property
  const [property] = await db
    .select()
    .from(schema.properties)
    .where(
      and(
        eq(schema.properties.id, id),
        eq(schema.properties.orgId, orgId)
      )
    )
    .limit(1);

  if (!property) notFound();

  // If cleaner, check assignment
  if (role === "cleaner") {
    const [assignment] = await db
      .select()
      .from(schema.propertyAssignments)
      .where(
        and(
          eq(schema.propertyAssignments.propertyId, id),
          eq(schema.propertyAssignments.userId, session.user.id)
        )
      )
      .limit(1);

    if (!assignment) notFound();
  }

  // Fetch areas
  const areas = await db
    .select()
    .from(schema.areas)
    .where(eq(schema.areas.propertyId, id))
    .orderBy(schema.areas.sortOrder, schema.areas.name);

  // Fetch turnover count
  const [turnoverResult] = await db
    .select({ count: count() })
    .from(schema.turnovers)
    .where(eq(schema.turnovers.propertyId, id));
  const turnoverCount = turnoverResult?.count ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link
          href="/properties"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Back to properties
        </Link>

        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {property.name}
            </h1>
            {property.address && (
              <p className="mt-1 text-sm text-gray-500">{property.address}</p>
            )}
            <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
              {property.propertyType && (
                <span className="capitalize">{property.propertyType}</span>
              )}
              {property.bedrooms !== null && (
                <span>
                  {property.bedrooms}{" "}
                  {property.bedrooms === 1 ? "bedroom" : "bedrooms"}
                </span>
              )}
              {!property.isActive && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  Inactive
                </span>
              )}
            </div>
          </div>
          {role === "owner" && (
            <PropertyActions propertyId={id} propertyName={property.name} />
          )}
        </div>

        {property.notes && (
          <div className="mt-4 rounded-md bg-gray-50 p-3 text-sm text-gray-600">
            {property.notes}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Areas section */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Areas</h2>
            {role === "owner" && (
              <Link
                href={`/properties/${id}/areas`}
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Manage areas
              </Link>
            )}
          </div>

          {areas.length === 0 ? (
            <div className="rounded-lg bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
              <p className="text-sm text-gray-500">No areas defined yet.</p>
              {role === "owner" && (
                <Link
                  href={`/properties/${id}/areas`}
                  className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  Add areas like Kitchen, Bedroom 1, Bathroom...
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {areas.map((area, index) => (
                <div
                  key={area.id}
                  className="flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {area.name}
                    </p>
                    {area.description && (
                      <p className="text-xs text-gray-500">
                        {area.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {index + 1} / {areas.length}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar stats */}
        <div className="space-y-4">
          <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h3 className="text-sm font-medium text-gray-500">Areas</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {areas.length}
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h3 className="text-sm font-medium text-gray-500">Turnovers</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {turnoverCount}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {turnoverCount === 0 ? "No turnovers yet" : "total turnovers"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
