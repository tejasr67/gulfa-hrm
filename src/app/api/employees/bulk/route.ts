import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { createEmployee } from "@/modules/employees/queries";
import { ok, unauthorized, forbidden, serverError, err } from "@/lib/api/response";

// All fields optional except a useful row identifier
const bulkRowSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  employmentType: z
    .enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN", "FREELANCE"])
    .optional(),
  joiningDate: z.coerce.date().optional(),
  departmentId: z.string().optional(),
  positionId: z.string().optional(),
  locationId: z.string().optional(),
  managerId: z.string().optional(),
  nationality: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]).optional(),
  dateOfBirth: z.coerce.date().optional(),
  emiratesId: z.string().optional(),
  emiratesIdExpiry: z.coerce.date().optional(),
  visaNumber: z.string().optional(),
  visaExpiry: z.coerce.date().optional(),
  passportNumber: z.string().optional(),
  passportExpiry: z.coerce.date().optional(),
  laborCardNumber: z.string().optional(),
  laborCardExpiry: z.coerce.date().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  iban: z.string().optional(),
});

type BulkRow = z.infer<typeof bulkRowSchema>;

function rowHasEnoughData(row: BulkRow): boolean {
  return !!(row.firstName || row.lastName || row.email);
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "EMPLOYEES:CREATE");
    const { rows } = await request.json() as { rows: unknown[] };

    if (!Array.isArray(rows) || rows.length === 0) {
      return err("No rows provided");
    }
    if (rows.length > 500) {
      return err("Maximum 500 rows per import");
    }

    const results: Array<{
      rowIndex: number;
      success: boolean;
      employeeId?: string;
      error?: string;
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const parsed = bulkRowSchema.safeParse(rows[i]);
      if (!parsed.success) {
        results.push({ rowIndex: i, success: false, error: parsed.error.issues.map((x) => x.message).join(", ") });
        continue;
      }

      const row = parsed.data;
      if (!rowHasEnoughData(row)) {
        results.push({ rowIndex: i, success: false, error: "Row skipped — no identifiable data" });
        continue;
      }

      try {
        const emp = await createEmployee(
          session.companyId,
          {
            firstName: row.firstName ?? "Unknown",
            lastName: row.lastName ?? "",
            email: row.email || `import-${Date.now()}-${i}@placeholder.local`,
            phone: row.phone,
            employmentType: row.employmentType ?? "FULL_TIME",
            joiningDate: row.joiningDate ?? new Date(),
            departmentId: row.departmentId,
            positionId: row.positionId,
            locationId: row.locationId,
            managerId: row.managerId,
            nationality: row.nationality,
            gender: row.gender,
            maritalStatus: row.maritalStatus,
            dateOfBirth: row.dateOfBirth,
            emiratesId: row.emiratesId,
            emiratesIdExpiry: row.emiratesIdExpiry,
            visaNumber: row.visaNumber,
            visaExpiry: row.visaExpiry,
            passportNumber: row.passportNumber,
            passportExpiry: row.passportExpiry,
            laborCardNumber: row.laborCardNumber,
            laborCardExpiry: row.laborCardExpiry,
            bankName: row.bankName,
            bankAccount: row.bankAccount,
            iban: row.iban,
          },
          session.userId
        );
        results.push({ rowIndex: i, success: true, employeeId: emp.employeeId });
      } catch (e) {
        results.push({
          rowIndex: i,
          success: false,
          error: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return ok({ results, succeeded, failed });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
