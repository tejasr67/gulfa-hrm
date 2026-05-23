import "server-only";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications/service";
import { buildDisciplinaryAlertEmail } from "@/lib/email/templates/disciplinary";
import { format } from "date-fns";

type DisciplinaryNotifyParams = {
  companyId: string;
  recordId: string;
  employeeId: string;
  employeeName: string;
  employeeIdCode: string;
  department?: string;
  eventType: "CREATED" | "APPEALED" | "CLOSED";
  disciplinaryType: string;
  severity: string;
  incidentDate: Date;
  action: string;
  status: string;
};

export async function notifyDisciplinaryEvent(params: DisciplinaryNotifyParams): Promise<void> {
  const {
    companyId, recordId, employeeId, employeeName, employeeIdCode, department,
    eventType, disciplinaryType, severity, incidentDate, action, status,
  } = params;

  // Find HR admin to notify
  const hrProfile = await prisma.userProfile.findFirst({
    where: { companyId, role: { in: ["HR_ADMIN", "HR_MANAGER", "SUPER_ADMIN"] }, isActive: true },
  });

  const incidentFmt = format(incidentDate, "dd MMM yyyy");
  const eventLabel = eventType === "CREATED" ? "New Record Filed" : eventType === "APPEALED" ? "Appeal Submitted" : "Case Closed";

  const emailData = buildDisciplinaryAlertEmail({
    employeeName,
    employeeId: employeeIdCode,
    department,
    eventType,
    disciplinaryType,
    severity,
    incidentDate: incidentFmt,
    action,
    status,
  });

  await notify({
    companyId,
    type: "DISCIPLINARY",
    title: `Disciplinary ${eventLabel} — ${employeeName}`,
    message: `${eventLabel}: ${disciplinaryType} (${severity}) for ${employeeName} on ${incidentFmt}.`,
    employeeId,
    data: { recordId, eventType, disciplinaryType, severity, status },
    email: hrProfile ? {
      to: hrProfile.userId, // placeholder: resolve to real HR email
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    } : undefined,
  });
}
