import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/utils/constants";

type PermissionCheck = {
  userId: string;
  companyId: string;
  role: string;
};

/**
 * Returns true if the role has unconditional access (no DB lookup needed).
 * SUPER_ADMIN and HR_ADMIN can do everything within their company.
 */
function isPrivilegedRole(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.HR_ADMIN;
}

/**
 * Server-side permission check. Queries the Role/Permission tables.
 * Call this in server actions and API routes — never rely on client-side
 * hasPermission() from auth.store for authorization.
 */
export async function hasPermission(
  session: PermissionCheck,
  permission: string
): Promise<boolean> {
  if (isPrivilegedRole(session.role)) return true;

  const parts = permission.split(":");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid permission format "${permission}" — expected "MODULE:ACTION"`);
  }
  const [module, action] = parts;

  const count = await prisma.rolePermission.count({
    where: {
      role: {
        name: session.role,
        OR: [{ companyId: session.companyId }, { companyId: null }],
      },
      permission: { module, action },
    },
  });

  return count > 0;
}

/**
 * Throws an Unauthorized error if the session does not have the given permission.
 * Use as a guard at the top of server actions.
 *
 * @example
 * await requirePermission(session, "EMPLOYEES:CREATE");
 */
export async function requirePermission(
  session: PermissionCheck,
  permission: string
): Promise<void> {
  const allowed = await hasPermission(session, permission);
  if (!allowed) {
    throw new Error(`Permission denied: ${permission}`);
  }
}
