import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export type AuthSession = {
  userId: string;
  orgId: string;
  role: string;
  email: string;
  name?: string | null;
};

/**
 * Get the current session for server components.
 * Returns null if unauthenticated or missing org membership.
 */
export async function getSessionOrNull(): Promise<AuthSession | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.orgId) return null;

  return {
    userId: session.user.id,
    orgId: session.user.orgId,
    role: session.user.role,
    email: session.user.email,
    name: session.user.name,
  };
}

/**
 * Get session for API routes. Returns session or a 401 NextResponse.
 */
export async function getApiSession(): Promise<
  AuthSession | NextResponse
> {
  const session = await getSessionOrNull();
  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  return session;
}

/**
 * Check if the session result is an error response (NextResponse).
 */
export function isAuthError(
  result: AuthSession | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}

/**
 * Check if the user is an owner in their org.
 */
export function isOwner(session: AuthSession): boolean {
  return session.role === "owner";
}
