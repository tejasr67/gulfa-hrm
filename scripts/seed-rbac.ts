/**
 * Seed Role, Permission, and RolePermission tables.
 *
 * Safe to re-run — uses upserts throughout.
 *
 * Usage:
 *   npx tsx scripts/seed-rbac.ts
 *
 * SUPER_ADMIN and HR_ADMIN bypass the permission table entirely (see
 * src/lib/auth/permissions.ts:isPrivilegedRole). Their rows are still
 * created here for completeness but their RolePermission rows are skipped.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

// ── Permission catalogue ───────────────────────────────────────────────────────

const ALL_PERMISSIONS = [
  // Employees
  { module: "EMPLOYEES", action: "CREATE" },
  { module: "EMPLOYEES", action: "READ" },
  { module: "EMPLOYEES", action: "UPDATE" },
  { module: "EMPLOYEES", action: "DELETE" },
  // Attendance
  { module: "ATTENDANCE", action: "CREATE" },
  { module: "ATTENDANCE", action: "READ" },
  { module: "ATTENDANCE", action: "UPDATE" },
  { module: "ATTENDANCE", action: "APPROVE" },
  // Leave
  { module: "LEAVE", action: "CREATE" },
  { module: "LEAVE", action: "READ" },
  { module: "LEAVE", action: "UPDATE" },
  { module: "LEAVE", action: "APPROVE" },
  { module: "LEAVE", action: "MANAGE" },
  // Payroll
  { module: "PAYROLL", action: "CREATE" },
  { module: "PAYROLL", action: "READ" },
  { module: "PAYROLL", action: "VIEW" },
  { module: "PAYROLL", action: "PROCESS" },
  { module: "PAYROLL", action: "APPROVE" },
  { module: "PAYROLL", action: "PAY" },
  { module: "PAYROLL", action: "CANCEL" },
  // Documents
  { module: "DOCUMENTS", action: "CREATE" },
  { module: "DOCUMENTS", action: "READ" },
  { module: "DOCUMENTS", action: "UPDATE" },
  { module: "DOCUMENTS", action: "DELETE" },
  // Assets
  { module: "ASSETS", action: "CREATE" },
  { module: "ASSETS", action: "READ" },
  { module: "ASSETS", action: "UPDATE" },
  { module: "ASSETS", action: "ASSIGN" },
  { module: "ASSETS", action: "DELETE" },
  // Accommodation
  { module: "ACCOMMODATION", action: "CREATE" },
  { module: "ACCOMMODATION", action: "READ" },
  { module: "ACCOMMODATION", action: "UPDATE" },
  { module: "ACCOMMODATION", action: "ASSIGN" },
  { module: "ACCOMMODATION", action: "DELETE" },
  // Benefits
  { module: "BENEFITS", action: "CREATE" },
  { module: "BENEFITS", action: "READ" },
  { module: "BENEFITS", action: "UPDATE" },
  { module: "BENEFITS", action: "DELETE" },
  // Disciplinary
  { module: "DISCIPLINARY", action: "CREATE" },
  { module: "DISCIPLINARY", action: "READ" },
  { module: "DISCIPLINARY", action: "UPDATE" },
  { module: "DISCIPLINARY", action: "DELETE" },
  // Career
  { module: "CAREER", action: "CREATE" },
  { module: "CAREER", action: "READ" },
  { module: "CAREER", action: "UPDATE" },
  // Reports
  { module: "REPORTS", action: "READ" },
  { module: "REPORTS", action: "EXPORT" },
  // Settings
  { module: "SETTINGS", action: "READ" },
  { module: "SETTINGS", action: "UPDATE" },
  // Notifications
  { module: "NOTIFICATIONS", action: "READ" },
  { module: "NOTIFICATIONS", action: "MANAGE" },
  // Uniforms
  { module: "UNIFORMS", action: "READ" },
  { module: "UNIFORMS", action: "CREATE" },
  { module: "UNIFORMS", action: "UPDATE" },
  { module: "UNIFORMS", action: "DELETE" },
] as const;

// ── Role permission matrix ────────────────────────────────────────────────────
//
// SUPER_ADMIN and HR_ADMIN bypass DB lookup (isPrivilegedRole) so their
// permission rows are intentionally empty here.

type ModuleAction = { module: string; action: string };

const ROLE_PERMISSIONS: Record<string, ModuleAction[]> = {
  SUPER_ADMIN: [],  // bypasses DB lookup
  HR_ADMIN:    [],  // bypasses DB lookup

  HR_MANAGER: [
    { module: "EMPLOYEES",     action: "READ" },
    { module: "EMPLOYEES",     action: "UPDATE" },
    { module: "ATTENDANCE",    action: "READ" },
    { module: "ATTENDANCE",    action: "UPDATE" },
    { module: "ATTENDANCE",    action: "APPROVE" },
    { module: "LEAVE",         action: "CREATE" },
    { module: "LEAVE",         action: "READ" },
    { module: "LEAVE",         action: "UPDATE" },
    { module: "LEAVE",         action: "APPROVE" },
    { module: "LEAVE",         action: "MANAGE" },
    { module: "PAYROLL",       action: "READ" },
    { module: "PAYROLL",       action: "VIEW" },
    { module: "DOCUMENTS",     action: "CREATE" },
    { module: "DOCUMENTS",     action: "READ" },
    { module: "DOCUMENTS",     action: "UPDATE" },
    { module: "ASSETS",        action: "READ" },
    { module: "ASSETS",        action: "ASSIGN" },
    { module: "ACCOMMODATION", action: "READ" },
    { module: "ACCOMMODATION", action: "ASSIGN" },
    { module: "BENEFITS",      action: "READ" },
    { module: "BENEFITS",      action: "CREATE" },
    { module: "BENEFITS",      action: "UPDATE" },
    { module: "DISCIPLINARY",  action: "READ" },
    { module: "DISCIPLINARY",  action: "CREATE" },
    { module: "DISCIPLINARY",  action: "UPDATE" },
    { module: "CAREER",        action: "READ" },
    { module: "CAREER",        action: "CREATE" },
    { module: "CAREER",        action: "UPDATE" },
    { module: "REPORTS",       action: "READ" },
    { module: "REPORTS",       action: "EXPORT" },
    { module: "SETTINGS",      action: "READ" },
    { module: "NOTIFICATIONS", action: "READ" },
    { module: "NOTIFICATIONS", action: "MANAGE" },
    { module: "UNIFORMS",      action: "READ" },
    { module: "UNIFORMS",      action: "CREATE" },
    { module: "UNIFORMS",      action: "UPDATE" },
  ],

  MANAGER: [
    { module: "EMPLOYEES",     action: "READ" },
    { module: "ATTENDANCE",    action: "READ" },
    { module: "ATTENDANCE",    action: "APPROVE" },
    { module: "LEAVE",         action: "READ" },
    { module: "LEAVE",         action: "APPROVE" },
    { module: "PAYROLL",       action: "READ" },
    { module: "PAYROLL",       action: "VIEW" },
    { module: "DOCUMENTS",     action: "READ" },
    { module: "ASSETS",        action: "READ" },
    { module: "ACCOMMODATION", action: "READ" },
    { module: "BENEFITS",      action: "READ" },
    { module: "DISCIPLINARY",  action: "READ" },
    { module: "CAREER",        action: "READ" },
    { module: "REPORTS",       action: "READ" },
    { module: "NOTIFICATIONS", action: "READ" },
    { module: "UNIFORMS",      action: "READ" },
  ],

  EMPLOYEE: [
    { module: "EMPLOYEES",     action: "READ" },   // needed for reliever lookup
    { module: "LEAVE",         action: "CREATE" },
    { module: "LEAVE",         action: "READ" },
    { module: "ATTENDANCE",    action: "READ" },
    { module: "PAYROLL",       action: "READ" },
    { module: "PAYROLL",       action: "VIEW" },
    { module: "DOCUMENTS",     action: "READ" },
    { module: "NOTIFICATIONS", action: "READ" },
    { module: "UNIFORMS",      action: "READ" },
  ],
};

// ── Seed ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding RBAC…");

  // 1. Upsert permissions
  console.log("  Upserting permissions…");
  const permMap = new Map<string, string>(); // "MODULE:ACTION" → id

  for (const { module, action } of ALL_PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: { module_action: { module, action } },
      create: { module, action, description: `${module} — ${action}` },
      update: {},
    });
    permMap.set(`${module}:${action}`, perm.id);
  }
  console.log(`  ${permMap.size} permissions ready.`);

  // 2. Upsert system roles (companyId = null → global)
  console.log("  Upserting roles…");
  const roleMap = new Map<string, string>(); // roleName → id

  for (const roleName of Object.keys(ROLE_PERMISSIONS)) {
    // Prisma upsert doesn't support null in composite unique keys — use findFirst + create
    let role = await prisma.role.findFirst({ where: { name: roleName, companyId: null } });
    if (!role) {
      role = await prisma.role.create({ data: { name: roleName, isSystem: true } });
    }
    roleMap.set(roleName, role.id);
  }
  console.log(`  ${roleMap.size} roles ready.`);

  // 3. Upsert role permissions
  console.log("  Upserting role–permission mappings…");
  let mapped = 0;

  for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleMap.get(roleName)!;
    for (const { module, action } of perms) {
      const permId = permMap.get(`${module}:${action}`);
      if (!permId) {
        console.warn(`  ⚠  Permission ${module}:${action} not found — skipping`);
        continue;
      }
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId: permId } },
        create: { roleId, permissionId: permId },
        update: {},
      });
      mapped++;
    }
  }

  console.log(`  ${mapped} role–permission rows ready.`);
  console.log("RBAC seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
