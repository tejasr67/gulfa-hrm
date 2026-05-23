export type LeaveEmailData = {
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: "APPROVED" | "REJECTED";
  reason?: string;
  approverName?: string;
};

export function buildLeaveStatusEmail(data: LeaveEmailData): { subject: string; html: string; text: string } {
  const { employeeName, leaveType, startDate, endDate, days, status, reason, approverName } = data;
  const isApproved = status === "APPROVED";
  const color = isApproved ? "#16a34a" : "#dc2626";
  const label = isApproved ? "Approved" : "Rejected";
  const subject = `Leave Request ${label} — ${leaveType} (${startDate} – ${endDate})`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
<tr><td style="background:${color};padding:24px 32px">
  <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">Leave Request ${label}</h1>
</td></tr>
<tr><td style="padding:32px">
  <p style="margin:0 0 16px;color:#374151;font-size:15px">Dear ${employeeName},</p>
  <p style="margin:0 0 24px;color:#374151;font-size:15px">
    Your leave request has been <strong>${label.toLowerCase()}</strong>${approverName ? ` by ${approverName}` : ""}.
  </p>
  <table width="100%" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px">
    <tr style="background:#f9fafb"><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#6b7280;width:40%">Leave Type</td><td style="padding:10px 16px;font-size:14px;color:#111827">${leaveType}</td></tr>
    <tr><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb">Period</td><td style="padding:10px 16px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb">${startDate} – ${endDate} (${days} day${days !== 1 ? "s" : ""})</td></tr>
    <tr style="background:#f9fafb"><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb">Status</td><td style="padding:10px 16px;border-top:1px solid #e5e7eb"><span style="background:${color};color:#fff;padding:3px 10px;border-radius:9999px;font-size:12px;font-weight:600">${label}</span></td></tr>
    ${reason ? `<tr><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb">Reason</td><td style="padding:10px 16px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb">${reason}</td></tr>` : ""}
  </table>
</td></tr>
<tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
  <p style="margin:0;color:#9ca3af;font-size:12px">Gulfa HRM — Leave Management</p>
</td></tr>
</table></td></tr></table></body></html>`;

  const text = `Leave Request ${label}\n\nDear ${employeeName},\nYour ${leaveType} leave (${startDate} – ${endDate}, ${days} day${days !== 1 ? "s" : ""}) has been ${label.toLowerCase()}${approverName ? ` by ${approverName}` : ""}${reason ? `.\nReason: ${reason}` : "."}\n\nGulfa HRM`;
  return { subject, html, text };
}
