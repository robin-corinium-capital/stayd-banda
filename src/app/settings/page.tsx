"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const { toast } = useToast();

  const [name, setName] = useState(session?.user?.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletingExpired, setDeletingExpired] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleNameSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error, "error");
      } else {
        toast("Name updated");
        await update();
      }
    } catch {
      toast("Something went wrong. Please try again.", "error");
    }
    setSaving(false);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast("Passwords do not match", "error");
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error, "error");
      } else {
        toast("Password changed");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      toast("Something went wrong. Please try again.", "error");
    }
    setChangingPassword(false);
  }

  async function handleDeleteExpired() {
    if (!confirm("This will permanently delete all expired turnover data and photos. This cannot be undone. Continue?")) {
      return;
    }
    setDeletingExpired(true);
    setDeleteResult(null);
    try {
      const res = await fetch("/api/settings/delete-expired", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error, "error");
      } else {
        setDeleteResult(`Deleted ${data.count} expired turnover(s) and their photos.`);
        toast(`Deleted ${data.count} expired turnover(s)`);
      }
    } catch {
      toast("Something went wrong. Please try again.", "error");
    }
    setDeletingExpired(false);
  }

  async function handleExportData() {
    setExporting(true);
    try {
      const res = await fetch("/api/settings/export-data");
      if (!res.ok) {
        toast("Failed to export data", "error");
        setExporting(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "banda-data-export.json";
      a.click();
      URL.revokeObjectURL(url);
      toast("Data exported");
    } catch {
      toast("Something went wrong", "error");
    }
    setExporting(false);
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/settings/delete-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error, "error");
        setDeleting(false);
        return;
      }
      const { signOut } = await import("next-auth/react");
      await signOut({ callbackUrl: "/" });
    } catch {
      toast("Something went wrong", "error");
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        {session?.user?.role === "owner" && (
          <Link
            href="/settings/team"
            className="rounded-btn bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light"
          >
            Manage team
          </Link>
        )}
      </div>

      {/* Name */}
      <div className="rounded-card bg-surface-card p-6 shadow-sm ring-1 ring-surface-border">
        <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
        <form onSubmit={handleNameSave} className="mt-4 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-sm text-gray-500">{session?.user?.email}</p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-btn bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save name"}
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="mt-6 rounded-card bg-surface-card p-6 shadow-sm ring-1 ring-surface-border">
        <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
        <form onSubmit={handlePasswordChange} className="mt-4 space-y-4">
          <div>
            <label htmlFor="current-password" className="block text-sm font-medium text-gray-700">
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <button
            type="submit"
            disabled={changingPassword}
            className="rounded-btn bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50"
          >
            {changingPassword ? "Changing..." : "Change password"}
          </button>
        </form>
      </div>

      {/* Data retention - owner only */}
      {session?.user?.role === "owner" && (
        <div className="mt-6 rounded-card bg-surface-card p-6 shadow-sm ring-1 ring-surface-border">
          <h2 className="text-lg font-semibold text-gray-900">Data Retention</h2>
          <p className="mt-2 text-sm text-gray-600">
            Completed turnovers are retained for 12 months. After that, photos and
            turnover data can be deleted. Turnovers with extended retention are excluded.
          </p>
          {deleteResult && (
            <div className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-700">
              {deleteResult}
            </div>
          )}
          <button
            onClick={handleDeleteExpired}
            disabled={deletingExpired}
            className="mt-4 rounded-btn bg-status-critical px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {deletingExpired ? "Deleting..." : "Delete expired data"}
          </button>
        </div>
      )}

      {/* Your Data */}
      <div className="mt-6 rounded-card bg-surface-card p-6 shadow-sm ring-1 ring-surface-border">
        <h2 className="text-lg font-semibold text-gray-900">Your Data</h2>
        <p className="mt-2 text-sm text-gray-600">
          Export or delete your data in accordance with GDPR.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={handleExportData}
            disabled={exporting}
            className="rounded-btn border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {exporting ? "Exporting..." : "Export my data"}
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="rounded-btn bg-status-critical px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Delete my account
          </button>
        </div>

        {showDeleteModal && (
          <div className="mt-4 rounded-btn border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">
              This will permanently delete your account, all properties, turnovers, and photos.
              This cannot be undone.
            </p>
            <div className="mt-3">
              <label htmlFor="confirm-email-delete" className="block text-sm font-medium text-red-700">
                Type your email to confirm: {session?.user?.email}
              </label>
              <input
                id="confirm-email-delete"
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={session?.user?.email || ""}
                className="mt-1 block w-full rounded-md border border-red-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div className="mt-3 flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || confirmEmail !== session?.user?.email}
                className="rounded-btn bg-status-critical px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Permanently delete"}
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setConfirmEmail("");
                }}
                className="rounded-btn border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
