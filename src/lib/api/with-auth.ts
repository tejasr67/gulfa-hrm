import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { unauthorized, forbidden, serverError } from "@/lib/api/response";
import type { ServerSession } from "@/lib/auth/session";

type RouteHandler = (
  req: NextRequest,
  session: ServerSession,
  params?: Record<string, string>
) => Promise<NextResponse>;

type AuthOptions = {
  permission?: string;
};

/**
 * Wraps an API route handler with session auth, optional permission check,
 * and unified error handling.
 *
 * Eliminates the repeated try/catch + requireSession() boilerplate across 80+ routes.
 *
 * @example
 * export const GET = withAuth(async (req, session) => {
 *   const data = await getEmployees(session.companyId);
 *   return ok(data);
 * });
 *
 * @example with permission
 * export const POST = withAuth(async (req, session) => {
 *   // ...
 * }, { permission: "EMPLOYEES:CREATE" });
 */
export function withAuth(handler: RouteHandler, opts: AuthOptions = {}) {
  return async function (req: NextRequest, ctx?: { params: Promise<Record<string, string>> }) {
    try {
      const session = await requireSession();

      if (opts.permission) {
        const allowed = await requirePermission(session, opts.permission).then(() => true).catch(() => false);
        if (!allowed) return forbidden();
      }

      const params = ctx?.params ? await ctx.params : undefined;
      return await handler(req, session, params);
    } catch (e) {
      if (e instanceof Error) {
        if (e.message === "Unauthorized" || e.message.includes("No user profile")) return unauthorized();
        if (e.message === "Your account has been deactivated.") return unauthorized();
      }
      return serverError(e);
    }
  };
}

/**
 * Same as withAuth but requires a specific permission.
 * Convenience shortcut.
 */
export function withPermission(permission: string, handler: RouteHandler) {
  return withAuth(handler, { permission });
}
