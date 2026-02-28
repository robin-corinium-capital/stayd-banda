"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Area = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  propertyId: string;
  createdAt: string;
};

export default function ManageAreasPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;

  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // New area form
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAreas = useCallback(async () => {
    try {
      const res = await fetch(`/api/properties/${propertyId}/areas`);
      if (res.ok) {
        const data = await res.json();
        setAreas(data);
      }
    } catch {
      setError("Failed to load areas");
    }
    setLoading(false);
  }, [propertyId]);

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setError("");

    try {
      const res = await fetch(`/api/properties/${propertyId}/areas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          description: newDescription || undefined,
          sortOrder: areas.length,
        }),
      });

      if (res.ok) {
        setNewName("");
        setNewDescription("");
        await fetchAreas();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to add area");
      }
    } catch {
      setError("Failed to add area");
    }
    setAdding(false);
  }

  function startEdit(area: Area) {
    setEditingId(area.id);
    setEditName(area.name);
    setEditDescription(area.description || "");
  }

  async function handleSaveEdit() {
    if (!editingId || !editName.trim()) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/properties/${propertyId}/areas`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          areaId: editingId,
          name: editName,
          description: editDescription || undefined,
        }),
      });

      if (res.ok) {
        setEditingId(null);
        await fetchAreas();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update area");
      }
    } catch {
      setError("Failed to update area");
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError("");

    try {
      const res = await fetch(
        `/api/properties/${propertyId}/areas?areaId=${deleteTarget.id}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setDeleteTarget(null);
        await fetchAreas();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete area");
      }
    } catch {
      setError("Failed to delete area");
    }
    setDeleting(false);
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return;
    const area = areas[index];
    const prevArea = areas[index - 1];

    // Swap sort orders
    await Promise.all([
      fetch(`/api/properties/${propertyId}/areas`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaId: area.id, sortOrder: prevArea.sortOrder }),
      }),
      fetch(`/api/properties/${propertyId}/areas`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaId: prevArea.id, sortOrder: area.sortOrder }),
      }),
    ]);

    await fetchAreas();
  }

  async function handleMoveDown(index: number) {
    if (index === areas.length - 1) return;
    const area = areas[index];
    const nextArea = areas[index + 1];

    await Promise.all([
      fetch(`/api/properties/${propertyId}/areas`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaId: area.id, sortOrder: nextArea.sortOrder }),
      }),
      fetch(`/api/properties/${propertyId}/areas`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaId: nextArea.id, sortOrder: area.sortOrder }),
      }),
    ]);

    await fetchAreas();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link
          href={`/properties/${propertyId}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Back to property
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          Manage areas
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Define areas like Kitchen, Bedroom 1, Bathroom, etc. Photos are
          organised by area.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button
            onClick={() => setError("")}
            className="ml-2 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Add area form */}
      <div className="mb-6 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-sm font-medium text-gray-900 mb-3">Add area</h2>
        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          <div className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Area name (e.g. Kitchen)"
              required
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {adding ? "Adding..." : "Add"}
            </button>
          </div>
          <input
            type="text"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </form>
      </div>

      {/* Area list */}
      {areas.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
          <p className="text-sm text-gray-500">
            No areas yet. Add your first area above.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {areas.map((area, index) => (
            <div
              key={area.id}
              className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200"
            >
              {editingId === area.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title="Move up"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === areas.length - 1}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title="Move down"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
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
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(area)}
                      className="rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ id: area.id, name: area.name })}
                      className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <button
          onClick={() => {
            router.push(`/properties/${propertyId}`);
            router.refresh();
          }}
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Done
        </button>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Delete area
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete &ldquo;{deleteTarget.name}&rdquo;?
              Any photos in this area will become unassigned.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
