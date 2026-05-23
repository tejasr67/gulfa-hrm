export type ProbationEmailData = {
  employeeName: string;
  hrName?: string;
  probationEndDate: string;
  daysUntilEnd: number;
  joiningDate: string;
  position?: string;
  department?: string;
};

export function buildProbationReminderEmail(data: ProbationEmailData): { subject: string; html: string; text: string } {
  const { employeeName, hrName, probationEndDate, daysUntilEnd, joiningDate, position, department } = data;
  const isUrgent = daysUntilEnd <= 7;
  const color = isUrgent ? "#dc2626" : "#d97706";
  const subject = `[Reminder] ${employeeName}'s probation ends in ${daysUntilEnd} day${daysUntilEnd !== 1 ? "s" : ""}`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
<tr><td style="background:${color};padding:24px 32px">
  <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">Probation Period Reminder</h1>
  <p style="margin:4px 0 0;color:rgba(255,255,255,0.9);font-size:14px">Action required in ${daysUntilEnd} day${daysUntilEnd !== 1 ? "s" : ""}</p>
</td></tr>
<tr><td style="padding:32px">
  <p style="margin:0 0 16px;color:#374151;font-size:15px">Dear ${hrName ?? "HR Team"},</p>
  <p style="margin:0 0 24px;color:#374151;font-size:15px">
    The following employee's probation period is ending soon. Please review and take appropriate action.
  </p>
  <table width="100%" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px">
    <tr style="background:#f9fafb"><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#6b7280;width:40%">Employee</td><td style="padding:10px 16px;font-size:14px;color:#111827">${employeeName}</td></tr>
    ${position ? `<tr><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb">Position</td><td style="padding:10px 16px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb">${position}${department ? ` · ${department}` : ""}</td></tr>` : ""}
    <tr ${position ? "" : ""}><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb">Joining Date</td><td style="padding:10px 16px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb">${joiningDate}</td></tr>
    <tr style="background:#f9fafb"><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb">Probation Ends</td><td style="padding:10px 16px;border-top:1px solid #e5e7eb"><span style="background:${color};color:#fff;padding:3px 10px;border-radius:9999px;font-size:12px;font-weight:600">${probationEndDate} (${daysUntilEnd} days)</span></td></tr>
  </table>
  <p style="margin:0;color:#6b7280;font-size:13px">Please confirm employment, extend probation, or initiate termination through the system.</p>
</td></tr>
<tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
  <p style="margin:0;color:#9ca3af;font-size:12px">Gulfa HRM — HR Compliance Reminder</p>
</td></tr>
</table></td></tr></table></body></html>`;

  const text = `Probation Period Reminder\n\nDear ${hrName ?? "HR Team"},\n${employeeName}'s probation ends on ${probationEndDate} (in ${daysUntilEnd} days).\n${position ? `Position: ${position}${department ? ` · ${department}` : ""}\n` : ""}Joining Date: ${joiningDate}\n\nPlease review and take appropriate action.\n\nGulfa HRM`;
  return { subject, html, text };
}
