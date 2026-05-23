import "server-only";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications/service";
import { buildProbationReminderEmail } from "@/lib/email/templates/probation";
import { addDays, format, differenceInDays } from "date-fns";

const REMINDER_DAYS = [30, 14, 7];

export type ProbationRunResult = {
  checked: number;
  notified: number;
  skipped: number;
  errors: number;
};

/**
 * Finds employees whose probation ends within reminder thresholds.
 * Probation end = joiningDate + 90 days (or confirmationDate if set).
 * Skips if a notification was already sent for this threshold.
 */
export async function runProbationReminders(companyId: string): Promise<ProbationRunResult> {
  const result: ProbationRunResult = { checked: 0, notified: 0, skipped: 0, errors: 0 };

  // Employees on probation = status ACTIVE, no confirmationDate yet, joined within last 180 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 180);

  const employees = await prisma.employee.findMany({
    where: {
      companyId,
      deletedAt: null,
      status: "ACTIVE",
      confirmationDate: null,
      joiningDate: { gte: cutoff },
    },
    include: {
      position: { select: { title: true } },
      department: { select: { name: true } },
    },
  });

  result.checked = employees.length;

  // Find HR admin email to notify
  const hrProfile = await prisma.userProfile.findFirst({
    where: { companyId, role: { in: ["HR_ADMIN", "HR_MANAGER", "SUPER_ADMIN"] }, isActive: true },
  });

  for (const emp of employees) {
    try {
      // Probation end = joining date + 90 days
      const probationEnd = addDays(emp.joiningDate, 90);
      const daysUntilEnd = differenceInDays(probationEnd, new Date());

      const matchedThreshold = REMINDER_DAYS.find((d) => Math.abs(daysUntilEnd - d) < 1);
      if (!matchedThreshold) { result.skipped++; continue; }

      // Dedup: check if we already sent this reminder
      const alreadySent = await prisma.notification.findFirst({
        where: {
          employeeId: emp.id,
          type: "PROBATION_REMINDER",
          createdAt: { gte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }, // within 48h
          message: { contains: `${matchedThreshold} day` },
        },
      });
      if (alreadySent) { result.skipped++; continue; }

      const probationEndFmt = format(probationEnd, "dd MMM yyyy");
      const joiningFmt = format(emp.joiningDate, "dd MMM yyyy");
      const empName = `${emp.firstName} ${emp.lastName}`;

      // In-app + email to HR
      const emailData = buildProbationReminderEmail({
        employeeName: empName,
        probationEndDate: probationEndFmt,
        daysUntilEnd: matchedThreshold,
        joiningDate: joiningFmt,
        position: emp.position?.title,
        department: emp.department?.name,
      });

      await notify({
        companyId,
        type: "PROBATION_REMINDER",
        title: `Probation ending — ${empName}`,
        message: `${empName}'s probation period ends in ${matchedThreshold} day${matchedThreshold !== 1 ? "s" : ""} (${probationEndFmt}).`,
        employeeId: emp.id,
        data: { employeeId: emp.id, probationEndDate: probationEndFmt, daysUntilEnd: matchedThreshold },
        email: hrProfile ? {
          to: hrProfile.userId, // NOTE: in real use, look up auth email; placeholder
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        } : undefined,
      });

      result.notified++;
    } catch (e) {
      console.error("[probation] notify failed:", emp.id, e);
      result.errors++;
    }
  }

  return result;
}

export async function runProbationRemindersAllCompanies(): Promise<Record<string, ProbationRunResult>> {
  const companies = await prisma.company.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true },
  });
  const results: Record<string, ProbationRunResult> = {};
  for (const c of companies) {
    results[c.id] = await runProbationReminders(c.id);
  }
  return results;
}
