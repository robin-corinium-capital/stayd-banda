import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import Link from "next/link";
import { TurnoverActions, MarkCompleteButton } from "./turnover-actions";
import { PhotoSections } from "./photo-sections";
import { ExportButtons } from "./export-buttons";
import { RetentionSection } from "./retention-section";

export default async function TurnoverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const orgId = session.user.orgId;
  const role = session.user.role;

  // Fetch turnover with property
  const [turnover] = await db
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
      retentionExtended: schema.turnovers.retentionExtended,
      propertyName: schema.properties.name,
      propertyOrgId: schema.properties.orgId,
    })
    .from(schema.turnovers)
    .innerJoin(
      schema.properties,
      eq(schema.turnovers.propertyId, schema.properties.id)
    )
    .where(eq(schema.turnovers.id, id))
    .limit(1);

  if (!turnover || turnover.propertyOrgId !== orgId) notFound();

  // Cleaner access check
  if (role === "cleaner") {
    const [assignment] = await db
      .select()
      .from(schema.propertyAssignments)
      .where(
        and(
          eq(schema.propertyAssignments.propertyId, turnover.propertyId),
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
    .where(eq(schema.areas.propertyId, turnover.propertyId))
    .orderBy(schema.areas.sortOrder, schema.areas.name);

  // Fetch photos
  const photos = await db
    .select()
    .from(schema.photos)
    .where(eq(schema.photos.turnoverId, id))
    .orderBy(schema.photos.uploadTimestamp);

  // Count photos per set
  const postCheckoutPhotos = photos.filter(
    (p) => p.photoSet === "post_checkout"
  );
  const preCheckinPhotos = photos.filter(
    (p) => p.photoSet === "pre_checkin"
  );
  const flaggedPhotos = photos.filter((p) => p.isDamageFlagged);

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
      <div className="mb-8">
        <Link
          href="/turnovers"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Back to turnovers
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-bold text-gray-900">
            <Link
              href={`/properties/${turnover.propertyId}`}
              className="hover:text-brand hover:underline"
            >
              {turnover.propertyName}
            </Link>
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
            <span>
              Checkout: {formatDate(turnover.checkoutDate)}
            </span>
            <span>
              Check-in: {formatDate(turnover.checkinDate)}
            </span>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                statusColour[turnover.status || "open"]
              }`}
            >
              {statusLabel[turnover.status || "open"]}
            </span>
          </div>
          {turnover.departingGuestRef && (
            <p className="mt-1 text-xs text-gray-500">
              Departing: {turnover.departingGuestRef}
            </p>
          )}
          {turnover.arrivingGuestRef && (
            <p className="text-xs text-gray-500">
              Arriving: {turnover.arrivingGuestRef}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {turnover.status !== "complete" && role === "owner" && (
              <MarkCompleteButton turnoverId={id} />
            )}
            <Link
              href={`/upload/${turnover.propertyId}/${turnover.id}`}
              className="rounded-btn bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light"
            >
              Upload photos
            </Link>
            <ExportButtons
              turnoverId={id}
              propertyName={turnover.propertyName}
              checkoutDate={turnover.checkoutDate}
              checkinDate={turnover.checkinDate}
              hasPhotos={photos.length > 0}
              hasFlaggedPhotos={flaggedPhotos.length > 0}
            />
            {role === "owner" && (
              <TurnoverActions
                turnoverId={id}
                propertyName={turnover.propertyName}
                currentStatus={turnover.status || "open"}
              />
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-amber-50 p-4 ring-1 ring-amber-200">
          <h3 className="text-xs font-medium uppercase text-amber-700">
            After guest left
          </h3>
          <p className="mt-1 text-2xl font-bold text-amber-900">
            {postCheckoutPhotos.length}
          </p>
          <p className="text-xs text-amber-600">photos</p>
        </div>
        <div className="rounded-lg bg-green-50 p-4 ring-1 ring-green-200">
          <h3 className="text-xs font-medium uppercase text-green-700">
            Before next guest
          </h3>
          <p className="mt-1 text-2xl font-bold text-green-900">
            {preCheckinPhotos.length}
          </p>
          <p className="text-xs text-green-600">photos</p>
        </div>
        <div className="rounded-lg bg-red-50 p-4 ring-1 ring-red-200">
          <h3 className="text-xs font-medium uppercase text-red-700">
            Flagged
          </h3>
          <p className="mt-1 text-2xl font-bold text-red-900">
            {flaggedPhotos.length}
          </p>
          <p className="text-xs text-red-600">damage flags</p>
        </div>
      </div>

      {/* Retention section - owner only, completed turnovers */}
      {turnover.status === "complete" && role === "owner" && (
        <RetentionSection
          turnoverId={id}
          completedAt={turnover.completedAt}
          retentionExtended={turnover.retentionExtended ?? false}
        />
      )}

      {/* Photo sections */}
      {photos.length === 0 ? (
        <div className="rounded-card bg-surface-card p-12 text-center shadow-sm ring-1 ring-surface-border">
          <p className="text-sm text-gray-500">
            No photos uploaded yet.
          </p>
          <Link
            href={`/upload/${turnover.propertyId}/${turnover.id}`}
            className="mt-3 inline-block text-sm font-medium text-brand hover:text-brand-light"
          >
            Upload photos now
          </Link>
        </div>
      ) : (
        <PhotoSections
          turnoverId={id}
          areas={areas}
          postCheckoutPhotos={postCheckoutPhotos}
          preCheckinPhotos={preCheckinPhotos}
          role={role}
        />
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
