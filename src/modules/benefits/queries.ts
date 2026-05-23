import "server-only";
import { prisma } from "@/lib/prisma";
import type { CreateBenefitTypeInput, AssignBenefitInput, UpdateBenefitInput } from "./schema";

export async function getBenefitTypes(companyId: string) {
  return prisma.benefitType.findMany({
    where: { companyId, isActive: true },
    include: {
      _count: { select: { employeeBenefits: { where: { isActive: true } } } },
    },
    orderBy: { name: "asc" },
  });
}

export async function createBenefitType(companyId: string, data: CreateBenefitTypeInput) {
  return prisma.benefitType.create({ data: { companyId, ...data } });
}

export async function getBenefitStats(companyId: string) {
  const [types, benefits] = await Promise.all([
    prisma.benefitType.count({ where: { companyId, isActive: true } }),
    prisma.employeeBenefit.findMany({
      where: { benefitType: { companyId }, isActive: true },
      select: { value: true },
    }),
  ]);

  const activeCount = benefits.length;
  const totalValue = benefits.reduce((s, b) => s + (b.value ?? 0), 0);

  return { types, activeCount, totalValue };
}

export async function getEmployeeBenefits(
  companyId: string,
  filters: { employeeId?: string; typeId?: string; isActive?: boolean } = {}
) {
  const { employeeId, typeId, isActive } = filters;

  return prisma.employeeBenefit.findMany({
    where: {
      benefitType: { companyId },
      ...(employeeId ? { employeeId } : {}),
      ...(typeId ? { benefitTypeId: typeId } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
    include: {
      employee: {
        select: {
          id: true, firstName: true, lastName: true, employeeId: true,
          department: { select: { name: true } },
        },
      },
      benefitType: { select: { id: true, name: true } },
    },
    orderBy: { startDate: "desc" },
  });
}

export async function assignBenefit(companyId: string, data: AssignBenefitInput) {
  const employee = await prisma.employee.findFirst({ where: { id: data.employeeId, companyId, deletedAt: null } });
  if (!employee) throw new Error("Employee not found");
  const type = await prisma.benefitType.findFirst({ where: { id: data.benefitTypeId, companyId } });
  if (!type) throw new Error("Benefit type not found");

  return prisma.employeeBenefit.create({
    data: {
      employeeId: data.employeeId,
      benefitTypeId: data.benefitTypeId,
      value: data.value,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      notes: data.notes,
    },
  });
}

export async function updateBenefit(id: string, companyId: string, data: UpdateBenefitInput) {
  const benefit = await prisma.employeeBenefit.findFirst({
    where: { id, benefitType: { companyId } },
  });
  if (!benefit) throw new Error("Benefit not found");

  return prisma.employeeBenefit.update({
    where: { id },
    data: {
      ...(data.value !== undefined ? { value: data.value } : {}),
      ...(data.endDate !== undefined ? { endDate: data.endDate ? new Date(data.endDate) : null } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
}

export async function terminateBenefit(id: string, companyId: string) {
  return updateBenefit(id, companyId, { isActive: false, endDate: new Date().toISOString() });
}
