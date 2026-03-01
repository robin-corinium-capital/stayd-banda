"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect, Suspense } from "react";
import { useToast } from "@/components/ui/toast";

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const token = searchParams.get("token");

  const [inviteInfo, setInviteInfo] = useState<{
    orgName: string;
    role: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No invite token provided");
      setLoading(false);
      return;
    }

    async function validateInvite() {
      try {
        const res = await fetch(`/api/invite/validate?token=${token}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error);
        } else {
          setInviteInfo(data);
        }
      } catch {
        setError("Failed to validate invite");
      }
      setLoading(false);
    }

    validateInvite();
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    try {
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setAccepting(false);
        return;
      }
      toast("You've joined the team!");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong");
      setAccepting(false);
    }
  }

  if (loading || status === "loading") {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-card bg-surface-card p-8 shadow-sm ring-1 ring-surface-border">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-2/3 rounded bg-gray-200" />
            <div className="h-4 w-full rounded bg-gray-200" />
            <div className="h-10 w-full rounded bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-card bg-surface-card p-8 text-center shadow-sm ring-1 ring-surface-border">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-gray-900">Invite unavailable</h2>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block text-sm font-medium text-brand hover:text-brand-light"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Not logged in — redirect to login with callback
  if (!session) {
    const callbackUrl = `/invite/accept?token=${token}`;
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-card bg-surface-card p-8 text-center shadow-sm ring-1 ring-surface-border">
          <h2 className="text-lg font-semibold text-gray-900">
            You&apos;ve been invited to {inviteInfo?.orgName}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in or create an account to accept this invitation.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="rounded-btn bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-light"
            >
              Sign in
            </Link>
            <Link
              href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="rounded-btn border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-card bg-surface-card p-8 text-center shadow-sm ring-1 ring-surface-border">
        <h2 className="text-lg font-semibold text-gray-900">
          Join {inviteInfo?.orgName}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          You&apos;ve been invited to join as a{" "}
          <span className="inline-block rounded-badge bg-accent-dim px-2 py-0.5 text-xs font-medium text-brand">
            {inviteInfo?.role}
          </span>
        </p>

        <button
          onClick={handleAccept}
          disabled={accepting}
          className="mt-6 w-full rounded-btn bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50"
        >
          {accepting ? "Joining..." : "Accept invitation"}
        </button>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteForm />
    </Suspense>
  );
}
