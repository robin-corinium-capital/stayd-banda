"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

type Property = {
  id: string;
  name: string;
};

export default function NewTurnoverPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [checkoutDate, setCheckoutDate] = useState("");
  const [checkinDate, setCheckinDate] = useState("");
  const [departingRef, setDepartingRef] = useState("");
  const [arrivingRef, setArrivingRef] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProps, setLoadingProps] = useState(true);

  useEffect(() => {
    fetch("/api/properties")
      .then((res) => res.json())
      .then((data) => {
        setProperties(data);
        if (data.length === 1) {
          setPropertyId(data[0].id);
        }
        setLoadingProps(false);
      })
      .catch(() => {
        setError("Failed to load properties");
        setLoadingProps(false);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!propertyId) {
      setError("Please select a property");
      setLoading(false);
      return;
    }

    if (!checkoutDate || !checkinDate) {
      setError("Both dates are required");
      setLoading(false);
      return;
    }

    if (checkinDate < checkoutDate) {
      setError("Check-in date must be on or after checkout date");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/turnovers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: propertyId,
          checkout_date: checkoutDate,
          checkin_date: checkinDate,
          departing_guest_ref: departingRef || undefined,
          arriving_guest_ref: arrivingRef || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create turnover");
        setLoading(false);
        return;
      }

      router.push(`/turnovers/${data.id}`);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link
          href="/turnovers"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Back to turnovers
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          New turnover
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Create a turnover record for a guest changeover.
        </p>
      </div>

      <div className="rounded-card bg-surface-card p-6 shadow-sm ring-1 ring-surface-border">
        {loadingProps ? (
          <p className="text-sm text-gray-500">Loading properties...</p>
        ) : properties.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">
              No properties available. Add a property first.
            </p>
            <Link
              href="/properties/new"
              className="mt-3 inline-block text-sm font-medium text-brand hover:text-brand-light"
            >
              Add property
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="property"
                className="block text-sm font-medium text-gray-700"
              >
                Property *
              </label>
              <select
                id="property"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="">Select property...</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="checkoutDate"
                  className="block text-sm font-medium text-gray-700"
                >
                  Checkout date *
                </label>
                <input
                  id="checkoutDate"
                  type="date"
                  value={checkoutDate}
                  onChange={(e) => setCheckoutDate(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              <div>
                <label
                  htmlFor="checkinDate"
                  className="block text-sm font-medium text-gray-700"
                >
                  Check-in date *
                </label>
                <input
                  id="checkinDate"
                  type="date"
                  value={checkinDate}
                  onChange={(e) => setCheckinDate(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="departingRef"
                className="block text-sm font-medium text-gray-700"
              >
                Departing guest reference
              </label>
              <input
                id="departingRef"
                type="text"
                value={departingRef}
                onChange={(e) => setDepartingRef(e.target.value)}
                placeholder="e.g. booking ref or guest name"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div>
              <label
                htmlFor="arrivingRef"
                className="block text-sm font-medium text-gray-700"
              >
                Arriving guest reference
              </label>
              <input
                id="arrivingRef"
                type="text"
                value={arrivingRef}
                onChange={(e) => setArrivingRef(e.target.value)}
                placeholder="e.g. booking ref or guest name"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                href="/turnovers"
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="rounded-btn bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create turnover"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
