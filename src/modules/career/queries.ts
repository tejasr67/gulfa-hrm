import "server-only";
import { prisma } from "@/lib/prisma";
import { differenceInMonths } from "date-fns";
import type { CreateCareerEventInput } from "./schema";

export async function getCareerStats(companyId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const events = await prisma.careerHistory.findMany({
    where: { employee: { companyId, deletedAt: null } },
    select: { type: true, effectiveDate: true },
  });

  const recent = events.filter((e) => e.effectiveDate >= thirtyDaysAgo).length;
  const promotions = events.filter((e) => e.type === "PROMOTION").length;
  const transfers = events.filter((e) => e.type === "TRANSFER").length;
  const salaryRevisions = events.filter((e) => e.type === "SALARY_REVISION").length;

  return { total: events.length, recent, promotions, transfers, salaryRevisions };
}

export type CareerStats = Awaited<ReturnType<typeof getCareerStats>>;

export async function getRecentCareerEvents(companyId: string, limit = 20) {
  return prisma.careerHistory.findMany({
    where: { employee: { companyId, deletedAt: null } },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: { effectiveDate: "desc" },
    take: limit,
  });
}

export type CareerEventItem = Awaited<ReturnType<typeof getRecentCareerEvents>>[number];

export async function getEmployeeCareerHistory(employeeId: string, companyId: string) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, employeeId: true },
  });
  if (!employee) return null;

  const events = await prisma.careerHistory.findMany({
    where: { employeeId },
    orderBy: { effectiveDate: "desc" },
  });

  return { employee, events };
}

export type EmployeeCareerHistory = Awaited<ReturnType<typeof getEmployeeCareerHistory>>;

export async function createCareerEvent(
  companyId: string,
  data: CreateCareerEventInput,
  createdBy: string
) {
  const employee = await prisma.employee.findFirst({
    where: { id: data.employeeId, companyId, deletedAt: null },
    include: {
      position: { select: { title: true } },
      department: { select: { name: true } },
      manager: { select: { id: true, firstName: true, lastName: true } },
      location: { select: { id: true, name: true } },
      salaries: { where: { isActive: true }, orderBy: { effectiveFrom: "desc" }, take: 1 },
    },
  });
  if (!employee) throw new Error("Employee not found");

  if (data.type === "PROMOTION") {
    const lastPromotion = await prisma.careerHistory.findFirst({
      where: { employeeId: data.employeeId, type: "PROMOTION" },
      orderBy: { effectiveDate: "desc" },
    });
    if (lastPromotion) {
      const monthsSince = differenceInMonths(new Date(data.effectiveDate), lastPromotion.effectiveDate);
      if (monthsSince < 6) {
        throw new Error(`Promotions require a minimum 6-month interval. Last promotion was ${monthsSince} month(s) ago.`);
      }
    }
  }

  return prisma.$transaction(async (tx) => {
    const event = await tx.careerHistory.create({
      data: {
        employeeId: data.employeeId,
        type: data.type as "PROMOTION" | "DEMOTION" | "TRANSFER" | "ROLE_CHANGE" | "SALARY_REVISION" | "PROBATION_COMPLETION" | "MANAGER_CHANGE",
        effectiveDate: new Date(data.effectiveDate),
        fromPosition: data.fromPosition ?? employee.position?.title ?? null,
        toPosition: data.toPosition ?? null,
        fromDepartment: data.fromDepartment ?? employee.department?.name ?? null,
        toDepartment: data.toDepartment ?? null,
        fromManagerId: data.fromManagerId ?? employee.managerId ?? null,
        toManagerId: data.toManagerId ?? null,
        fromLocationId: data.fromLocationId ?? employee.locationId ?? null,
        toLocationId: data.toLocationId ?? null,
        fromSalary: data.fromSalary ?? (employee.salaries[0]?.totalSalary ?? null),
        toSalary: data.toSalary ?? null,
        reason: data.reason ?? null,
        notes: data.notes ?? null,
        approvedBy: data.approvedBy ?? null,
        createdBy,
      },
    });

    const employeeUpdate: Record<string, unknown> = {};
    if (data.toDepartment) {
      const dept = await tx.department.findFirst({ where: { companyId, name: data.toDepartment, deletedAt: null } });
      if (dept) employeeUpdate.departmentId = dept.id;
    }
    if (data.toManagerId) employeeUpdate.managerId = data.toManagerId;
    if (data.toLocationId) employeeUpdate.locationId = data.toLocationId;

    if (data.type === "SALARY_REVISION" && data.toSalary) {
      if (employee.salaries[0]) {
        await tx.employeeSalary.update({
          where: { id: employee.salaries[0].id },
          data: { isActive: false, effectiveTo: new Date(data.effectiveDate) },
        });
      }
      await tx.employeeSalary.create({
        data: {
          employeeId: data.employeeId,
          basicSalary: data.toSalary,
          totalSalary: data.toSalary,
          effectiveFrom: new Date(data.effectiveDate),
          isActive: true,
          createdBy,
        },
      });
    }

    if (Object.keys(employeeUpdate).length > 0) {
      await tx.employee.update({ where: { id: data.employeeId }, data: employeeUpdate });
    }

    return event;
  });
}
