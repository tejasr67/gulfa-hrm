import { prisma } from "@/lib/prisma";
import { DOCUMENT_ALERT_DAYS } from "@/lib/utils/constants";

export type DashboardStats = {
  presentToday: number;
  pendingLeave: number;
  expiringDocuments: number;
  monthlyPayroll: number;
};

export async function getDashboardStats(companyId: string): Promise<DashboardStats> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const thirtyDaysOut = new Date(today);
  thirtyDaysOut.setDate(today.getDate() + DOCUMENT_ALERT_DAYS.CRITICAL);

  const [presentToday, pendingLeave, expiringDocs, payrollResult] =
    await prisma.$transaction([
      prisma.attendanceRecord.count({
        where: {
          employee: { companyId, deletedAt: null },
          date: today,
          status: "PRESENT",
        },
      }),
      prisma.leaveRequest.count({
        where: {
          employee: { companyId, deletedAt: null },
          status: "PENDING",
        },
      }),
      prisma.employee.count({
        where: {
          companyId,
          deletedAt: null,
          OR: [
            { emiratesIdExpiry: { gte: today, lte: thirtyDaysOut } },
            { visaExpiry: { gte: today, lte: thirtyDaysOut } },
            { passportExpiry: { gte: today, lte: thirtyDaysOut } },
            { laborCardExpiry: { gte: today, lte: thirtyDaysOut } },
          ],
        },
      }),
      prisma.payrollRun.aggregate({
        where: {
          companyId,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
        _sum: { totalAmount: true },
      }),
    ]);

  return {
    presentToday,
    pendingLeave,
    expiringDocuments: expiringDocs,
    monthlyPayroll: Number(payrollResult._sum.totalAmount ?? 0),
  };
}
