import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, inArray, desc, count, sql } from "drizzle-orm";
import Link from "next/link";

export default async function TurnoversPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const orgId = session.user.orgId;
  const role = session.user.role;

  // Get accessible property IDs
  let accessiblePropertyIds: string[];

  if (role === "cleaner") {
    const assignments = await db
      .select({ propertyId: schema.propertyAssignments.propertyId })
      .from(schema.propertyAssignments)
      .where(eq(schema.propertyAssignments.userId, session.user.id));
    accessiblePropertyIds = assignments.map((a) => a.propertyId);
  } else {
    const props = await db
      .select({ id: schema.properties.id })
      .from(schema.properties)
      .where(eq(schema.properties.orgId, orgId));
    accessiblePropertyIds = props.map((p) => p.id);
  }

  // Fetch turnovers
  let turnovers: {
    id: string;
    propertyId: string;
    checkoutDate: string;
    checkinDate: string;
    status: string | null;
    createdAt: Date | null;
    propertyName: string;
  }[] = [];

  if (accessiblePropertyIds.length > 0) {
    turnovers = await db
      .select({
        id: schema.turnovers.id,
        propertyId: schema.turnovers.propertyId,
        checkoutDate: schema.turnovers.checkoutDate,
        checkinDate: schema.turnovers.checkinDate,
        status: schema.turnovers.status,
        createdAt: schema.turnovers.createdAt,
        propertyName: schema.properties.name,
      })
      .from(schema.turnovers)
      .innerJoin(
        schema.properties,
        eq(schema.turnovers.propertyId, schema.properties.id)
      )
      .where(inArray(schema.turnovers.propertyId, accessiblePropertyIds))
      .orderBy(desc(schema.turnovers.checkoutDate));
  }

  // Get photo counts per turnover
  const turnoverIds = turnovers.map((t) => t.id);
  let photoCounts: Record<
    string,
    { postCheckout: number; preCheckin: number; flagged: number }
  > = {};

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
        photoCounts[row.turnoverId] = {
          postCheckout: 0,
          preCheckin: 0,
          flagged: 0,
        };
      }
      if (row.photoSet === "post_checkout") {
        photoCounts[row.turnoverId].postCheckout = row.count;
      } else {
        photoCounts[row.turnoverId].preCheckin = row.count;
      }
      photoCounts[row.turnoverId].flagged += Number(row.flagged);
    }
  }

  const statusColour: Record<string, string> = {
    open: "bg-status-flag/20 text-status-flag",
    in_progress: "bg-brand-dim text-brand",
    complete: "bg-status-pass/20 text-status-pass",
  };

  const statusLabel: Record<string, string> = {
    open: "Open",
    in_progress: "In progress",
    complete: "Complete",
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Turnovers</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage turnover inspections and photo documentation.
          </p>
        </div>
        <Link
          href="/turnovers/new"
          className="rounded-btn bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light"
        >
          New turnover
        </Link>
      </div>

      {turnovers.length === 0 ? (
        <div className="rounded-card bg-surface-card p-12 text-center shadow-sm ring-1 ring-surface-border">
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
              d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
            />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-gray-900">
            No turnovers yet
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Create your first turnover to start documenting guest changeovers.
          </p>
          <Link
            href="/turnovers/new"
            className="mt-4 inline-block rounded-btn bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light"
          >
            New turnover
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-card bg-surface-card shadow-sm ring-1 ring-surface-border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Property
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Checkout
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Check-in
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Status
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 sm:table-cell">
                  Photos
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 sm:table-cell">
                  Flagged
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {turnovers.map((turnover) => {
                const counts = photoCounts[turnover.id];
                return (
                  <tr key={turnover.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/turnovers/${turnover.id}`}
                        className="text-sm font-medium text-brand hover:text-brand-light"
                      >
                        {turnover.propertyName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(turnover.checkoutDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(turnover.checkinDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          statusColour[turnover.status || "open"]
                        }`}
                      >
                        {statusLabel[turnover.status || "open"]}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-gray-600 sm:table-cell">
                      {counts
                        ? `${counts.postCheckout} / ${counts.preCheckin}`
                        : "0 / 0"}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      {counts && counts.flagged > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-status-critical/20 px-2 py-0.5 text-xs font-medium text-status-critical">
                          {counts.flagged}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
