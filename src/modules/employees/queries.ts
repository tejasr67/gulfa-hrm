import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type {
  EmployeeFilters, CreateEmployeeInput, UpdateEmployeeInput,
  CreateDocumentInput, ProfileCompletenessResult, TimelineEvent,
} from "./types";
import { generateEmployeeId } from "@/lib/utils/formatters";
import { PAGINATION_DEFAULTS } from "@/lib/utils/constants";

// ── Department hierarchy ──────────────────────────────────────────────────

async function getDepartmentSubtree(companyId: string, departmentId: string): Promise<string[]> {
  const all = await prisma.department.findMany({
    where: { companyId, isActive: true },
    select: { id: true, parentId: true },
  });
  const childMap = new Map<string, string[]>();
  for (const d of all) {
    if (d.parentId) {
      const ch = childMap.get(d.parentId) ?? [];
      ch.push(d.id);
      childMap.set(d.parentId, ch);
    }
  }
  const result = [departmentId];
  const queue = [departmentId];
  while (queue.length) {
    const curr = queue.shift()!;
    for (const c of childMap.get(curr) ?? []) {
      result.push(c);
      queue.push(c);
    }
  }
  return result;
}

// ── Where clause builder ──────────────────────────────────────────────────

async function buildEmployeeWhere(companyId: string, filters: EmployeeFilters) {
  const {
    search, departmentId, status, employmentType, locationId, nationality,
    managerId, expiryStatus, joiningDateFrom, joiningDateTo, includeArchived = false,
  } = filters;

  const deptIds = departmentId ? await getDepartmentSubtree(companyId, departmentId) : null;
  const today = new Date();
  const thirtyDaysOut = new Date(today); thirtyDaysOut.setDate(today.getDate() + 30);

  const andConditions: Prisma.EmployeeWhereInput[] = [];

  if (search) {
    andConditions.push({
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { employeeId: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { emiratesId: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (expiryStatus === "expired") {
    andConditions.push({
      OR: [
        { emiratesIdExpiry: { lt: today } },
        { visaExpiry: { lt: today } },
        { passportExpiry: { lt: today } },
        { laborCardExpiry: { lt: today } },
      ],
    });
  } else if (expiryStatus === "expiring_soon") {
    andConditions.push({
      OR: [
        { emiratesIdExpiry: { gte: today, lte: thirtyDaysOut } },
        { visaExpiry: { gte: today, lte: thirtyDaysOut } },
        { passportExpiry: { gte: today, lte: thirtyDaysOut } },
        { laborCardExpiry: { gte: today, lte: thirtyDaysOut } },
      ],
    });
  }

  const joiningDateFilter: Record<string, Date> = {};
  if (joiningDateFrom) joiningDateFilter.gte = joiningDateFrom;
  if (joiningDateTo) joiningDateFilter.lte = joiningDateTo;

  return {
    companyId,
    deletedAt: includeArchived ? undefined : null,
    ...(status && { status }),
    ...(employmentType && { employmentType }),
    ...(locationId && { locationId }),
    ...(nationality && { nationality }),
    ...(managerId && { managerId }),
    ...(deptIds && { departmentId: { in: deptIds } }),
    ...(Object.keys(joiningDateFilter).length && { joiningDate: joiningDateFilter }),
    ...(andConditions.length && { AND: andConditions }),
  } satisfies Prisma.EmployeeWhereInput;
}

// ── Sort order builder ────────────────────────────────────────────────────

function buildEmployeeOrderBy(
  sortBy = "joiningDate",
  sortOrder: "asc" | "desc" = "desc"
): Prisma.EmployeeOrderByWithRelationInput {
  switch (sortBy) {
    case "name": return { firstName: sortOrder };
    case "status": return { status: sortOrder };
    case "employeeId": return { employeeId: sortOrder };
    case "department": return { department: { name: sortOrder } };
    default: return { joiningDate: sortOrder };
  }
}

// ── Profile completeness ──────────────────────────────────────────────────

export function computeProfileCompleteness(
  employee: Prisma.EmployeeGetPayload<{
    include: { _count: { select: { emergencyContacts: true } } };
  }>
): ProfileCompletenessResult {
  const sections = [
    {
      name: "Basic Info",
      maxScore: 25,
      score: [employee.phone, employee.dateOfBirth, employee.gender, employee.nationality, employee.bloodGroup]
        .filter(Boolean).length * 5,
    },
    {
      name: "Work Info",
      maxScore: 25,
      score:
        (employee.departmentId ? 7 : 0) +
        (employee.positionId ? 7 : 0) +
        (employee.locationId ? 5 : 0) +
        (employee.managerId ? 6 : 0),
    },
    {
      name: "UAE Documents",
      maxScore: 25,
      score:
        (employee.emiratesId ? 7 : 0) +
        (employee.passportNumber ? 6 : 0) +
        (employee.visaNumber ? 6 : 0) +
        (employee.laborCardNumber ? 6 : 0),
    },
    {
      name: "Emergency Contact",
      maxScore: 10,
      score: (employee._count.emergencyContacts > 0 ? 10 : 0),
    },
    {
      name: "Banking Info",
      maxScore: 15,
      score:
        (employee.bankName ? 5 : 0) +
        (employee.bankAccount ? 5 : 0) +
        (employee.iban ? 5 : 0),
    },
  ];
  return { score: sections.reduce((s, x) => s + x.score, 0), sections };
}

// ── Main queries ──────────────────────────────────────────────────────────

export async function getEmployees(companyId: string, filters: EmployeeFilters = {}) {
  const {
    page = PAGINATION_DEFAULTS.page,
    limit = PAGINATION_DEFAULTS.limit,
    sortBy,
    sortOrder,
  } = filters;

  const where = await buildEmployeeWhere(companyId, filters);
  const orderBy = buildEmployeeOrderBy(sortBy, sortOrder);

  const [total, employees] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      select: {
        id: true, employeeId: true, firstName: true, lastName: true,
        email: true, phone: true, photo: true, status: true, employmentType: true,
        joiningDate: true, emiratesIdExpiry: true, visaExpiry: true,
        passportExpiry: true, laborCardExpiry: true, nationality: true, deletedAt: true,
        department: { select: { id: true, name: true } },
        position: { select: { title: true } },
        location: { select: { name: true } },
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
    }),
  ]);

  return { data: employees, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getEmployeeById(id: string, companyId: string) {
  const employee = await prisma.employee.findFirst({
    where: { id, companyId },  // allow fetching archived for detail view
    include: {
      department: true, position: true, location: true,
      manager: { select: { id: true, firstName: true, lastName: true, photo: true } },
      subordinates: { select: { id: true, firstName: true, lastName: true, employeeId: true, photo: true } },
      emergencyContacts: { where: { isActive: true } },
      documents: {
        where: { deletedAt: null },
        include: { documentType: true },
        orderBy: { expiryDate: "asc" },
      },
      salaries: { where: { isActive: true }, orderBy: { effectiveFrom: "desc" }, take: 1 },
      careerHistory: { orderBy: { effectiveDate: "desc" } },
      _count: { select: { emergencyContacts: true, documents: true, subordinates: true } },
    },
  });
  if (!employee) return null;
  const completeness = computeProfileCompleteness(employee);
  return { ...employee, completeness };
}

export async function createEmployee(
  companyId: string,
  input: CreateEmployeeInput,
  createdBy: string
) {
  const last = await prisma.employee.findFirst({
    where: { companyId },
    orderBy: { employeeId: "desc" },
    select: { employeeId: true },
  });
  const seq = last ? parseInt(last.employeeId.slice(4), 10) : 0;
  const employeeId = generateEmployeeId(seq + 1);
  return prisma.employee.create({ data: { ...input, companyId, employeeId, createdBy } });
}

export async function updateEmployee(
  id: string, companyId: string, input: UpdateEmployeeInput, updatedBy: string
) {
  return prisma.employee.update({
    where: { id, companyId },
    data: { ...input, updatedBy },
  });
}

export async function changeEmployeeStatus(
  id: string,
  companyId: string,
  newStatus: string,
  notes: string | undefined,
  terminationDate: Date | undefined,
  userId: string
) {
  // Validate transition
  const employee = await prisma.employee.findFirst({
    where: { id, companyId, deletedAt: null },
    select: { status: true, firstName: true, lastName: true },
  });
  if (!employee) throw new Error("Employee not found");

  const VALID_TRANSITIONS: Record<string, string[]> = {
    PROBATION: ["ACTIVE", "TERMINATED"],
    ACTIVE: ["ON_LEAVE", "SUSPENDED", "TERMINATED", "PROBATION"],
    ON_LEAVE: ["ACTIVE", "TERMINATED"],
    SUSPENDED: ["ACTIVE", "TERMINATED"],
    TERMINATED: [],
  };

  const allowed = VALID_TRANSITIONS[employee.status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Cannot transition from ${employee.status} to ${newStatus}`);
  }

  return prisma.employee.update({
    where: { id, companyId },
    data: {
      status: newStatus as any,
      ...(newStatus === "TERMINATED" && terminationDate && { terminationDate }),
      updatedBy: userId,
    },
  });
}

export async function softDeleteEmployee(id: string, companyId: string) {
  return prisma.employee.update({
    where: { id, companyId },
    data: { deletedAt: new Date(), status: "TERMINATED" },
  });
}

export async function archiveEmployee(id: string, companyId: string, userId: string) {
  const emp = await prisma.employee.findFirst({
    where: { id, companyId, deletedAt: null },
    select: { id: true },
  });
  if (!emp) throw new Error("Employee not found");
  return prisma.employee.update({
    where: { id, companyId },
    data: { deletedAt: new Date(), updatedBy: userId },
  });
}

export async function restoreEmployee(id: string, companyId: string, userId: string) {
  const emp = await prisma.employee.findFirst({
    where: { id, companyId, deletedAt: { not: null } },
    select: { id: true },
  });
  if (!emp) throw new Error("Archived employee not found");
  return prisma.employee.update({
    where: { id, companyId },
    data: { deletedAt: null, updatedBy: userId },
  });
}

export async function getEmployeeStats(companyId: string) {
  const [total, active, onLeave, terminated] = await Promise.all([
    prisma.employee.count({ where: { companyId, deletedAt: null } }),
    prisma.employee.count({ where: { companyId, deletedAt: null, status: "ACTIVE" } }),
    prisma.employee.count({ where: { companyId, deletedAt: null, status: "ON_LEAVE" } }),
    prisma.employee.count({ where: { companyId, deletedAt: null, status: "TERMINATED" } }),
  ]);
  return { total, active, onLeave, terminated };
}

// ── Document queries ──────────────────────────────────────────────────────

export async function getEmployeeDocuments(id: string, companyId: string) {
  // Verify employee ownership
  const emp = await prisma.employee.findFirst({
    where: { id, companyId },
    select: { id: true },
  });
  if (!emp) throw new Error("Employee not found");

  return prisma.employeeDocument.findMany({
    where: { employeeId: id, deletedAt: null },
    include: { documentType: true },
    orderBy: [{ documentType: { name: "asc" } }, { expiryDate: "asc" }],
  });
}

export async function createEmployeeDocument(
  employeeId: string,
  companyId: string,
  input: CreateDocumentInput,
  uploadedBy: string
) {
  const emp = await prisma.employee.findFirst({
    where: { id: employeeId, companyId, deletedAt: null },
    select: { id: true },
  });
  if (!emp) throw new Error("Employee not found");

  return prisma.employeeDocument.create({
    data: {
      employeeId,
      documentTypeId: input.documentTypeId,
      documentNumber: input.documentNumber,
      issueDate: input.issueDate,
      expiryDate: input.expiryDate,
      issuedBy: input.issuedBy,
      fileUrl: input.storagePath ?? null,
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      storagePath: input.storagePath,
      notes: input.notes,
      createdBy: uploadedBy,
      uploadedBy: uploadedBy,
    } as any,
    include: { documentType: true },
  });
}

export async function deleteEmployeeDocument(
  docId: string,
  employeeId: string,
  companyId: string
) {
  const doc = await prisma.employeeDocument.findFirst({
    where: { id: docId, employeeId, employee: { companyId } },
  });
  if (!doc) throw new Error("Document not found");

  await prisma.employeeDocument.update({
    where: { id: docId },
    data: { deletedAt: new Date() },
  });

  return doc;
}

// ── Timeline ──────────────────────────────────────────────────────────────

export async function getEmployeeTimeline(id: string, companyId: string): Promise<TimelineEvent[]> {
  const emp = await prisma.employee.findFirst({
    where: { id, companyId },
    select: { id: true },
  });
  if (!emp) throw new Error("Employee not found");

  const [auditLogs, careerHistory] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        OR: [
          { entityId: id, entityType: "Employee" },
          { employeeId: id },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.careerHistory.findMany({
      where: { employeeId: id },
      orderBy: { effectiveDate: "desc" },
    }),
  ]);

  const events: TimelineEvent[] = [
    ...auditLogs.map((log) => ({
      id: log.id,
      type: (log.action === "STATUS_CHANGE" ? "STATUS_CHANGE" : "AUDIT") as TimelineEvent["type"],
      action: log.action,
      description: buildAuditDescription(log.action, log.entityType ?? "", log.newValues),
      performedBy: log.userId,
      createdAt: log.createdAt.toISOString(),
      metadata: log.newValues as Record<string, unknown> | null,
    })),
    ...careerHistory.map((ch) => ({
      id: ch.id,
      type: "CAREER" as const,
      action: ch.type,
      description: buildCareerDescription(ch),
      performedBy: ch.createdBy,
      createdAt: ch.effectiveDate.toISOString(),
      metadata: null,
    })),
  ];

  return events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function buildAuditDescription(action: string, entityType: string, newValues: unknown): string {
  const labels: Record<string, string> = {
    CREATE: `${entityType} record created`,
    UPDATE: `${entityType} record updated`,
    DELETE: `${entityType} record deleted`,
    STATUS_CHANGE: `Status changed to ${(newValues as any)?.status ?? "unknown"}`,
    DOCUMENT_UPLOAD: "Document uploaded",
    DOCUMENT_DELETE: "Document deleted",
    ARCHIVE: "Employee archived",
    RESTORE: "Employee restored",
  };
  return labels[action] ?? action;
}

function buildCareerDescription(ch: { type: string; toPosition?: string | null; toDepartment?: string | null; reason?: string | null }): string {
  const parts: string[] = [];
  if (ch.toPosition) parts.push(`→ ${ch.toPosition}`);
  if (ch.toDepartment) parts.push(`(${ch.toDepartment})`);
  if (ch.reason) parts.push(`· ${ch.reason}`);
  return parts.join(" ") || ch.type;
}

// ── Departments for filters ────────────────────────────────────────────────

export async function getDepartmentsForCompany(companyId: string) {
  return prisma.department.findMany({
    where: { companyId, isActive: true },
    select: { id: true, name: true, parentId: true },
    orderBy: { name: "asc" },
  });
}

export async function getLocationsForCompany(companyId: string) {
  return prisma.location.findMany({
    where: { companyId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getPositionsForCompany(companyId: string) {
  return prisma.position.findMany({
    where: { companyId, isActive: true },
    select: { id: true, title: true, departmentId: true },
    orderBy: { title: "asc" },
  });
}

export async function getManagersForCompany(companyId: string) {
  return prisma.employee.findMany({
    where: { companyId, deletedAt: null, status: { not: "TERMINATED" } },
    select: { id: true, firstName: true, lastName: true, employeeId: true },
    orderBy: { firstName: "asc" },
  });
}
