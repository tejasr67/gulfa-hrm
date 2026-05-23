/**
 * One-time import: reads "Employee list.xlsx- Current.xlsx" and seeds the DB.
 * Maps: Staff Name → firstName/lastName, Designation → Position, Department,
 *       DOJ → joiningDate, Contract expires → visaExpiry, Visa Emirate → Location,
 *       Basic + Total Othr Allowance → EmployeeSalary record.
 *
 * Usage:  npx dotenv -e .env -- npx tsx scripts/import-employees-excel.ts
 *     or: npx tsx --env-file=.env scripts/import-employees-excel.ts
 *
 * Safe to run multiple times — skips employees whose trimmed full name already exists.
 */

import * as path from "path";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const EXCEL_PATH = path.resolve(
  process.env.EXCEL_PATH ??
    "C:/Users/tejas/Downloads/Employee list.xlsx- Current.xlsx"
);

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseAmount(raw: string | number | undefined): number {
  if (!raw) return 0;
  const cleaned = String(raw).replace(/[,\s]/g, "").replace(/[^0-9.]/g, "");
  return parseFloat(cleaned) || 0;
}

function parseDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  // Already formatted as YYYY-MM-DD by XLSX dateNF option
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function normalizeDesignation(d: string): string {
  return d.trim().replace(/\s+/g, " ");
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌  DATABASE_URL not set");
    process.exit(1);
  }

  // ── 0. Find company ──────────────────────────────────────────────────────────
  const company = await prisma.company.findFirst({
    select: { id: true, name: true },
  });
  if (!company) {
    console.error("❌  No company found. Run scripts/setup-admin.ts first.");
    process.exit(1);
  }
  const COMPANY_ID = company.id;
  console.log(`\n🏢  Company: ${company.name} (${COMPANY_ID})`);

  // Get admin userId for createdBy
  const adminProfile = await prisma.userProfile.findFirst({
    where: { companyId: COMPANY_ID, role: "SUPER_ADMIN" },
    select: { userId: true },
  });
  if (!adminProfile) {
    console.error("❌  No SUPER_ADMIN profile found.");
    process.exit(1);
  }
  const CREATED_BY = adminProfile.userId;

  // ── 1. Read Excel ────────────────────────────────────────────────────────────
  console.log(`\n📂  Reading: ${EXCEL_PATH}`);
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
    defval: "",
    raw: false,
    dateNF: "YYYY-MM-DD",
  });
  const rows = rawRows.filter((r) => r["Staff Name"]?.trim());
  console.log(`   ✓  ${rows.length} employee rows found`);

  // ── 2. Seed Departments ──────────────────────────────────────────────────────
  console.log(`\n🗂   Seeding departments…`);
  const deptNames = [...new Set(rows.map((r) => r["Department"]?.trim()).filter(Boolean))];
  const deptMap = new Map<string, string>(); // name → id

  for (const name of deptNames) {
    let dept = await prisma.department.findFirst({
      where: { companyId: COMPANY_ID, name },
      select: { id: true },
    });
    if (!dept) {
      dept = await prisma.department.create({
        data: { companyId: COMPANY_ID, name, isActive: true },
        select: { id: true },
      });
      console.log(`   + Created dept: ${name}`);
    }
    deptMap.set(name, dept.id);
  }
  console.log(`   ✓  ${deptMap.size} departments ready`);

  // ── 3. Seed Positions ────────────────────────────────────────────────────────
  console.log(`\n👔  Seeding positions…`);
  const posNames = [
    ...new Set(rows.map((r) => normalizeDesignation(r["Designation"])).filter(Boolean)),
  ];
  const posMap = new Map<string, string>(); // normalized title → id

  for (const title of posNames) {
    let pos = await prisma.position.findFirst({
      where: { companyId: COMPANY_ID, title },
      select: { id: true },
    });
    if (!pos) {
      pos = await prisma.position.create({
        data: { companyId: COMPANY_ID, title, isActive: true },
        select: { id: true },
      });
      console.log(`   + Created position: ${title}`);
    }
    posMap.set(title, pos.id);
  }
  console.log(`   ✓  ${posMap.size} positions ready`);

  // ── 4. Seed Locations ────────────────────────────────────────────────────────
  console.log(`\n📍  Seeding locations…`);
  const locNames = [
    ...new Set(rows.map((r) => r["Visa Emirate"]?.trim()).filter(Boolean)),
  ];
  const locMap = new Map<string, string>(); // name → id

  for (const name of locNames) {
    let loc = await prisma.location.findFirst({
      where: { companyId: COMPANY_ID, name },
      select: { id: true },
    });
    if (!loc) {
      loc = await prisma.location.create({
        data: { companyId: COMPANY_ID, name, isActive: true },
        select: { id: true },
      });
      console.log(`   + Created location: ${name}`);
    }
    locMap.set(name, loc.id);
  }
  console.log(`   ✓  ${locMap.size} locations ready`);

  // ── 5. Import Employees ──────────────────────────────────────────────────────
  console.log(`\n👥  Importing employees…`);

  let created = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const fullName = row["Staff Name"]?.trim();
    if (!fullName) continue;

    // Check duplicate by exact full name match
    const { firstName, lastName } = splitName(fullName);
    const existing = await prisma.employee.findFirst({
      where: {
        companyId: COMPANY_ID,
        firstName,
        lastName,
      },
      select: { id: true, employeeId: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const deptId = deptMap.get(row["Department"]?.trim()) ?? undefined;
    const posTitle = normalizeDesignation(row["Designation"]);
    const posId = posMap.get(posTitle) ?? undefined;
    const locId = locMap.get(row["Visa Emirate"]?.trim()) ?? undefined;
    const joiningDate = parseDate(row["DOJ"]) ?? new Date("2020-09-10");
    const visaExpiry = parseDate(row["Contract expires"]) ?? undefined;
    const nationality = row["Nationality"]?.trim() || undefined;
    const basicSalary = parseAmount(row["Basic"]);
    const otherAllowances = parseAmount(row["Total Othr Allowance"]);

    try {
      // Get last employee ID for sequence
      const last = await prisma.employee.findFirst({
        where: { companyId: COMPANY_ID },
        orderBy: { employeeId: "desc" },
        select: { employeeId: true },
      });
      const seq = last ? parseInt(last.employeeId.replace(/[^0-9]/g, ""), 10) : 0;
      const paddedSeq = String(seq + 1).padStart(4, "0");
      const employeeId = `EMP-${paddedSeq}`;

      const employee = await prisma.employee.create({
        data: {
          companyId: COMPANY_ID,
          employeeId,
          firstName,
          lastName,
          email: `${firstName.toLowerCase().replace(/\s+/g, ".")}.${String(seq + 1)}@gulfahrm.internal`,
          employmentType: "FULL_TIME",
          status: "ACTIVE",
          joiningDate,
          departmentId: deptId,
          positionId: posId,
          locationId: locId,
          nationality,
          visaExpiry: visaExpiry ? visaExpiry : undefined,
          createdBy: CREATED_BY,
        },
        select: { id: true, employeeId: true },
      });

      // Create salary record if we have salary data
      if (basicSalary > 0) {
        await prisma.employeeSalary.create({
          data: {
            employeeId: employee.id,
            basicSalary,
            otherAllowances,
            totalSalary: basicSalary + otherAllowances,
            currency: "AED",
            effectiveFrom: joiningDate,
            isActive: true,
          },
        });
      }

      created++;
      process.stdout.write(`\r   ✓  ${created} created, ${skipped} skipped, ${failed} failed…`);
    } catch (e) {
      failed++;
      errors.push(`${fullName}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  Import complete!

   Created : ${created}
   Skipped : ${skipped} (already exist)
   Failed  : ${failed}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  if (errors.length > 0) {
    console.log("\n❌  Errors:");
    errors.forEach((e) => console.log("  •", e));
  }
}

main()
  .catch((e) => {
    console.error("❌ Fatal:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
