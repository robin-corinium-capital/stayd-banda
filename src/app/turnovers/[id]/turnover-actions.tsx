"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TurnoverActions({
  turnoverId,
  propertyName,
  currentStatus,
}: {
  turnoverId: string;
  propertyName: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleStatusChange(status: string) {
    setLoading(true);
    try {
      await fetch(`/api/turnovers/${turnoverId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } catch {
      // Silently fail
    }
    setLoading(false);
    setOpen(false);
  }

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/turnovers/${turnoverId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/turnovers");
        router.refresh();
      }
    } catch {
      // Silently fail
    }
    setLoading(false);
    setShowDelete(false);
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Actions
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 z-50">
            {currentStatus !== "complete" && (
              <button
                onClick={() => handleStatusChange("complete")}
                disabled={loading}
                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              >
                Mark complete
              </button>
            )}
            {currentStatus === "complete" && (
              <button
                onClick={() => handleStatusChange("open")}
                disabled={loading}
                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              >
                Reopen
              </button>
            )}
            <button
              onClick={() => {
                setOpen(false);
                setShowDelete(true);
              }}
              className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              Delete turnover
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Delete turnover?
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              This will permanently delete this turnover for{" "}
              <strong>{propertyName}</strong> and all its photos. This
              action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowDelete(false)}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function MarkCompleteButton({ turnoverId }: { turnoverId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await fetch(`/api/turnovers/${turnoverId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "complete" }),
      });
      router.refresh();
    } catch {
      // Silently fail
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-btn bg-status-pass px-4 py-2 text-sm font-medium text-gray-900 hover:bg-status-pass/80 disabled:opacity-50"
    >
      {loading ? "Completing..." : "Mark complete"}
    </button>
  );
}
