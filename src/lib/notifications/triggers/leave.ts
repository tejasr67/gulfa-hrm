import "server-only";
import { notify } from "@/lib/notifications/service";
import { buildLeaveStatusEmail } from "@/lib/email/templates/leave";
import { format } from "date-fns";

type LeaveNotifyParams = {
  companyId: string;
  employeeId: string;
  employeeEmail: string;
  employeeName: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  status: "APPROVED" | "REJECTED";
  reason?: string;
  approverName?: string;
};

export async function notifyLeaveDecision(params: LeaveNotifyParams): Promise<void> {
  const { companyId, employeeId, employeeEmail, employeeName, leaveType, startDate, endDate, totalDays, status, reason, approverName } = params;

  const startFmt = format(startDate, "dd MMM yyyy");
  const endFmt = format(endDate, "dd MMM yyyy");
  const isApproved = status === "APPROVED";

  const email = buildLeaveStatusEmail({
    employeeName,
    leaveType,
    startDate: startFmt,
    endDate: endFmt,
    days: totalDays,
    status,
    reason,
    approverName,
  });

  await notify({
    companyId,
    type: isApproved ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
    title: `Leave ${isApproved ? "Approved" : "Rejected"} — ${leaveType}`,
    message: `Your ${leaveType} leave (${startFmt} – ${endFmt}) has been ${isApproved ? "approved" : "rejected"}${approverName ? ` by ${approverName}` : ""}.`,
    employeeId,
    data: { leaveType, startDate: startFmt, endDate: endFmt, totalDays, status, approverName },
    email: {
      to: employeeEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
      recipientId: employeeId,
    },
  });
}
