import "server-only";
import { prisma } from "@/lib/prisma";
import type {
  CreateDisciplinaryTypeInput,
  CreateDisciplinaryRecordInput,
  UpdateDisciplinaryRecordInput,
} from "./schema";

export async function getDisciplinaryTypes(companyId: string) {
  return prisma.disciplinaryType.findMany({
    where: { companyId, isActive: true },
    include: { _count: { select: { records: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createDisciplinaryType(companyId: string, data: CreateDisciplinaryTypeInput) {
  return prisma.disciplinaryType.create({
    data: { companyId, name: data.name, severity: data.severity as "MINOR" | "MODERATE" | "MAJOR" | "CRITICAL" },
  });
}

export async function getDisciplinaryStats(companyId: string) {
  const records = await prisma.disciplinaryRecord.findMany({
    where: { employee: { companyId, deletedAt: null } },
    select: { status: true, disciplinaryType: { select: { severity: true } } },
  });

  const open = records.filter((r) => r.status === "OPEN").length;
  const closed = records.filter((r) => r.status === "CLOSED").length;
  const appealed = records.filter((r) => r.status === "APPEALED").length;
  const terminations = records.filter((r) => r.disciplinaryType.severity === "CRITICAL").length;

  return { total: records.length, open, closed, appealed, terminations };
}

export async function getDisciplinaryRecords(
  companyId: string,
  filters: { status?: string; employeeId?: string; typeId?: string; search?: string } = {}
) {
  const { status, employeeId, typeId, search } = filters;

  return prisma.disciplinaryRecord.findMany({
    where: {
      employee: {
        companyId,
        deletedAt: null,
        ...(employeeId ? { id: employeeId } : {}),
        ...(search ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { employeeId: { contains: search, mode: "insensitive" } },
          ],
        } : {}),
      },
      ...(status ? { status: status as "OPEN" | "CLOSED" | "APPEALED" } : {}),
      ...(typeId ? { typeId } : {}),
    },
    include: {
      employee: {
        select: {
          id: true, firstName: true, lastName: true, employeeId: true,
          department: { select: { name: true } },
        },
      },
      disciplinaryType: { select: { id: true, name: true, severity: true } },
    },
    orderBy: { incidentDate: "desc" },
  });
}

export async function createDisciplinaryRecord(
  companyId: string,
  data: CreateDisciplinaryRecordInput,
  issuedBy: string
) {
  const employee = await prisma.employee.findFirst({ where: { id: data.employeeId, companyId, deletedAt: null } });
  if (!employee) throw new Error("Employee not found");
  const type = await prisma.disciplinaryType.findFirst({ where: { id: data.typeId, companyId } });
  if (!type) throw new Error("Disciplinary type not found");

  return prisma.disciplinaryRecord.create({
    data: {
      employeeId: data.employeeId,
      typeId: data.typeId,
      incidentDate: new Date(data.incidentDate),
      description: data.description,
      action: data.action,
      actionDate: data.actionDate ? new Date(data.actionDate) : null,
      issuedBy,
    },
  });
}

export async function updateDisciplinaryRecord(
  id: string,
  companyId: string,
  data: UpdateDisciplinaryRecordInput
) {
  const record = await prisma.disciplinaryRecord.findFirst({
    where: { id, employee: { companyId } },
  });
  if (!record) throw new Error("Record not found");

  return prisma.disciplinaryRecord.update({
    where: { id },
    data: {
      ...(data.status ? { status: data.status } : {}),
      ...(data.status === "CLOSED" ? { closedAt: new Date() } : {}),
      ...(data.appealStatus !== undefined ? { appealStatus: data.appealStatus as "PENDING" | "ACCEPTED" | "REJECTED" | null } : {}),
      ...(data.appealReason ? { appealReason: data.appealReason } : {}),
      ...(data.appealDate ? { appealDate: new Date(data.appealDate) } : {}),
      ...(data.action ? { action: data.action } : {}),
      ...(data.actionDate ? { actionDate: new Date(data.actionDate) } : {}),
    },
  });
}
