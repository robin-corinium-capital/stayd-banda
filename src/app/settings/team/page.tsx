"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/ui/toast";

interface Member {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  assignedProperties?: string[];
}

interface PendingInvite {
  id: string;
  token: string;
  role: string;
  createdAt: string;
  expiresAt: string;
}

export default function TeamSettingsPage() {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/team");
      if (!res.ok) {
        toast("Failed to load team data", "error");
        return;
      }
      const data = await res.json();
      setMembers(data.members);
      setInvites(data.invites);
    } catch {
      toast("Something went wrong", "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  async function removeMember(memberId: string, memberName: string | null) {
    if (!confirm(`Remove ${memberName || "this member"} from the team?`)) return;

    try {
      const res = await fetch("/api/settings/team", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error, "error");
        return;
      }
      toast("Member removed");
      fetchTeam();
    } catch {
      toast("Something went wrong", "error");
    }
  }

  async function revokeInvite(inviteId: string) {
    if (!confirm("Revoke this invite?")) return;

    try {
      const res = await fetch("/api/settings/team/revoke-invite", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId }),
      });
      if (!res.ok) {
        toast("Failed to revoke invite", "error");
        return;
      }
      toast("Invite revoked");
      fetchTeam();
    } catch {
      toast("Something went wrong", "error");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-32 rounded-card bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/settings" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Settings
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Team</h1>
        </div>
        <Link
          href="/invite"
          className="rounded-btn bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light"
        >
          Create invite
        </Link>
      </div>

      {/* Members */}
      <div className="rounded-card bg-surface-card shadow-sm ring-1 ring-surface-border">
        <div className="border-b border-surface-border px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            Members ({members.length})
          </h2>
        </div>
        <ul className="divide-y divide-surface-border">
          {members.map((member) => (
            <li key={member.id} className="flex items-center justify-between px-6 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {member.name || member.email}
                </p>
                <p className="text-xs text-gray-500">{member.email}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-block rounded-badge px-2 py-0.5 text-xs font-medium ${
                      member.role === "owner"
                        ? "bg-brand-dim text-brand"
                        : "bg-accent-dim text-brand"
                    }`}
                  >
                    {member.role}
                  </span>
                  {member.assignedProperties && member.assignedProperties.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {member.assignedProperties.join(", ")}
                    </span>
                  )}
                </div>
              </div>
              {member.role !== "owner" && (
                <button
                  onClick={() => removeMember(member.id, member.name)}
                  className="ml-4 shrink-0 rounded-btn px-3 py-1.5 text-xs font-medium text-status-critical hover:bg-red-50"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="mt-6 rounded-card bg-surface-card shadow-sm ring-1 ring-surface-border">
          <div className="border-b border-surface-border px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">
              Pending Invites ({invites.length})
            </h2>
          </div>
          <ul className="divide-y divide-surface-border">
            {invites.map((invite) => (
              <li key={invite.id} className="flex items-center justify-between px-6 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-mono text-gray-700">{invite.token}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                    <span className="rounded-badge bg-accent-dim px-2 py-0.5 font-medium text-brand">
                      {invite.role}
                    </span>
                    <span>
                      Expires{" "}
                      {new Date(invite.expiresAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => revokeInvite(invite.id)}
                  className="ml-4 shrink-0 rounded-btn px-3 py-1.5 text-xs font-medium text-status-critical hover:bg-red-50"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
