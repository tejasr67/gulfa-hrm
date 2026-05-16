import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const employeeQuerySchema = paginationSchema.extend({
  search: z.string().max(100).optional(),
  departmentId: z.string().cuid().optional(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED", "PROBATION"]).optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN", "FREELANCE"]).optional(),
});

export const advancedEmployeeQuerySchema = employeeQuerySchema.extend({
  locationId: z.string().cuid().optional(),
  nationality: z.string().max(50).optional(),
  managerId: z.string().cuid().optional(),
  expiryStatus: z.enum(["expired", "expiring_soon"]).optional(),
  joiningDateFrom: z.coerce.date().optional(),
  joiningDateTo: z.coerce.date().optional(),
  includeArchived: z.coerce.boolean().optional().default(false),
  sortBy: z.enum(["name", "joiningDate", "status", "employeeId", "department"]).optional().default("joiningDate"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type EmployeeQueryParams = z.infer<typeof employeeQuerySchema>;
export type AdvancedEmployeeQueryParams = z.infer<typeof advancedEmployeeQuerySchema>;

export function parseQueryParams<T extends z.ZodTypeAny>(
  schema: T,
  searchParams: URLSearchParams
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const raw = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }
  return { success: true, data: result.data };
}
