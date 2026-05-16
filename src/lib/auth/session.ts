import "server-only";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export type ServerSession = {
  userId: string;
  companyId: string;
  employeeId: string | null;
  role: string;
};

/**
 * Fetches the authenticated user and their company from the database.
 * Throws if unauthenticated or if no UserProfile exists.
 *
 * Use this in every server action and API route instead of reading
 * user_metadata — user_metadata is client-writable and cannot be trusted
 * for authorization decisions.
 */
export async function requireSession(): Promise<ServerSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
    select: { companyId: true, employeeId: true, role: true, isActive: true },
  });

  if (!profile) {
    throw new Error("No user profile found. Contact your administrator.");
  }

  if (!profile.isActive) {
    throw new Error("Your account has been deactivated.");
  }

  return {
    userId: user.id,
    companyId: profile.companyId,
    employeeId: profile.employeeId,
    role: profile.role,
  };
}

/**
 * Same as requireSession but returns null instead of throwing.
 * Use in middleware or layouts that need to check auth without redirecting.
 */
export async function getSession(): Promise<ServerSession | null> {
  try {
    return await requireSession();
  } catch {
    return null;
  }
}
