"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Turnover = {
  id: string;
  propertyId: string;
  checkoutDate: string;
  checkinDate: string;
  departingGuestRef: string | null;
  arrivingGuestRef: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
  propertyName: string;
  photoCountPostCheckout: number;
  photoCountPreCheckin: number;
  flaggedCount: number;
};

type TurnoversListClientProps = {
  properties: { id: string; name: string }[];
  role: string;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

import { formatDate, STATUS_COLOUR, STATUS_LABEL } from "@/lib/format";

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Open", value: "open" },
  { label: "In progress", value: "in_progress" },
  { label: "Complete", value: "complete" },
];

const PAGE_SIZE = 20;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TurnoversListClient({
  properties,
  role,
}: TurnoversListClientProps) {
  /* — Read initial filter values from URL search params — */
  const searchParams = useSearchParams();

  /* — Filter / sort / pagination state — */
  const [propertyId, setPropertyId] = useState(searchParams.get("property_id") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [dateFrom, setDateFrom] = useState(searchParams.get("date_from") ?? "");
  const [dateTo, setDateTo] = useState(searchParams.get("date_to") ?? "");
  const [hasDamage, setHasDamage] = useState(searchParams.get("has_damage") === "true");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("checkout_desc");

  /* — Data state — */
  const [turnovers, setTurnovers] = useState<Turnover[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  /* — Debounce ref for search — */
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* — Fetch function — */
  const fetchTurnovers = useCallback(
    async (searchOverride?: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (propertyId) params.set("property_id", propertyId);
        if (status) params.set("status", status);
        if (dateFrom) params.set("date_from", dateFrom);
        if (dateTo) params.set("date_to", dateTo);
        if (hasDamage) params.set("has_damage", "true");
        const searchVal =
          searchOverride !== undefined ? searchOverride : search;
        if (searchVal.trim()) params.set("search", searchVal.trim());
        params.set("page", String(page));
        params.set("limit", String(PAGE_SIZE));
        params.set("sort", sort);

        const res = await fetch(`/api/turnovers?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch turnovers");

        const data = await res.json();
        setTurnovers(data.turnovers ?? []);
        setTotalCount(data.totalCount ?? 0);
        setTotalPages(data.totalPages ?? 0);
      } catch {
        setTurnovers([]);
        setTotalCount(0);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    },
    [propertyId, status, dateFrom, dateTo, hasDamage, search, page, sort],
  );

  /* — Refetch on filter / sort / page change (non-search) — */
  useEffect(() => {
    fetchTurnovers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, status, dateFrom, dateTo, hasDamage, page, sort]);

  /* — Debounced search — */
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setPage(1);
      fetchTurnovers(search);
    }, 300);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  /* — Helpers to reset page on filter change — */
  const changeFilter = <T,>(setter: React.Dispatch<React.SetStateAction<T>>) => {
    return (val: T) => {
      setter(val);
      setPage(1);
    };
  };

  /* — Count active filters — */
  const activeFilterCount = [
    propertyId,
    status,
    dateFrom,
    dateTo,
    hasDamage,
    search.trim(),
  ].filter(Boolean).length;

  const clearFilters = () => {
    setPropertyId("");
    setStatus("");
    setDateFrom("");
    setDateTo("");
    setHasDamage(false);
    setSearch("");
    setPage(1);
  };

  /* — Sort toggle — */
  const toggleSort = (column: "checkout" | "checkin") => {
    setSort((prev) => {
      if (prev === `${column}_desc`) return `${column}_asc`;
      return `${column}_desc`;
    });
    setPage(1);
  };

  const sortArrow = (column: "checkout" | "checkin") => {
    if (sort === `${column}_asc`) return " \u25B2";
    if (sort === `${column}_desc`) return " \u25BC";
    return "";
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
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

      {/* ── Filter bar ── */}
      <div className="mb-6 rounded-card bg-surface-card p-4 shadow-sm ring-1 ring-surface-border">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Property select */}
          <select
            value={propertyId}
            onChange={(e) => changeFilter(setPropertyId)(e.target.value)}
            className="rounded-btn border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="">All properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Status buttons */}
          <div className="flex gap-1">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => changeFilter(setStatus)(s.value)}
                className={`rounded-btn px-3 py-2 text-xs font-medium transition-colors ${
                  status === s.value
                    ? "bg-brand text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Date from */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => changeFilter(setDateFrom)(e.target.value)}
            placeholder="From date"
            className="rounded-btn border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />

          {/* Date to */}
          <input
            type="date"
            value={dateTo}
            onChange={(e) => changeFilter(setDateTo)(e.target.value)}
            placeholder="To date"
            className="rounded-btn border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />

          {/* Search */}
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search guest refs..."
              className="w-full rounded-btn border border-gray-300 bg-white py-2 pl-8 pr-3 text-sm text-gray-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        {/* Has damage toggle + clear */}
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => {
              setHasDamage((prev) => !prev);
              setPage(1);
            }}
            className={`rounded-btn px-3 py-1.5 text-xs font-medium transition-colors ${
              hasDamage
                ? "bg-status-critical/20 text-status-critical ring-1 ring-status-critical/30"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Has damage flags
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-xs text-gray-500 underline hover:text-gray-700"
            >
              Clear filters ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {/* ── Results ── */}
      {loading ? (
        <div className="flex justify-center py-12">
          <svg
            className="h-8 w-8 animate-spin text-brand"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      ) : turnovers.length === 0 ? (
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
            No turnovers found
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {activeFilterCount > 0
              ? "Try adjusting your filters or search terms."
              : "Create your first turnover to start documenting guest changeovers."}
          </p>
          {activeFilterCount === 0 && (
            <Link
              href="/turnovers/new"
              className="mt-4 inline-block rounded-btn bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light"
            >
              New turnover
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* ── Desktop table ── */}
          <div className="hidden overflow-hidden rounded-card bg-surface-card shadow-sm ring-1 ring-surface-border sm:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Property
                  </th>
                  <th
                    className="cursor-pointer select-none px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 hover:text-gray-700"
                    onClick={() => toggleSort("checkout")}
                  >
                    Checkout{sortArrow("checkout")}
                  </th>
                  <th
                    className="cursor-pointer select-none px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 hover:text-gray-700"
                    onClick={() => toggleSort("checkin")}
                  >
                    Check-in{sortArrow("checkin")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Post / Pre
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Flagged
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {turnovers.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/turnovers/${t.id}`}
                        className="text-sm font-medium text-brand hover:text-brand-light"
                      >
                        {t.propertyName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(t.checkoutDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(t.checkinDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_COLOUR[t.status || "open"]
                        }`}
                      >
                        {STATUS_LABEL[t.status || "open"]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {t.photoCountPostCheckout} / {t.photoCountPreCheckin}
                    </td>
                    <td className="px-4 py-3">
                      {t.flaggedCount > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-status-critical/20 px-2 py-0.5 text-xs font-medium text-status-critical">
                          {t.flaggedCount}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards ── */}
          <div className="space-y-3 sm:hidden">
            {turnovers.map((t) => (
              <Link
                key={t.id}
                href={`/turnovers/${t.id}`}
                className="block rounded-card bg-surface-card p-4 shadow-sm ring-1 ring-surface-border"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-brand">
                    {t.propertyName}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_COLOUR[t.status || "open"]
                    }`}
                  >
                    {STATUS_LABEL[t.status || "open"]}
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {formatDate(t.checkoutDate)} &rarr;{" "}
                  {formatDate(t.checkinDate)}
                </div>
                <div className="mt-1 flex gap-4 text-xs text-gray-500">
                  <span>
                    Photos: {t.photoCountPostCheckout} /{" "}
                    {t.photoCountPreCheckin}
                  </span>
                  {t.flaggedCount > 0 && (
                    <span className="text-status-critical">
                      {t.flaggedCount} flagged
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* ── Pagination ── */}
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {(page - 1) * PAGE_SIZE + 1}&ndash;
              {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-btn border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-btn border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
