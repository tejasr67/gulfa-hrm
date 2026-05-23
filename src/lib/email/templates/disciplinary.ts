export type DisciplinaryEmailData = {
  hrName?: string;
  employeeName: string;
  employeeId: string;
  department?: string;
  eventType: "CREATED" | "APPEALED" | "CLOSED";
  disciplinaryType: string;
  severity: string;
  incidentDate: string;
  action: string;
  status: string;
};

const SEVERITY_COLORS: Record<string, string> = {
  MINOR: "#d97706",
  MODERATE: "#ea580c",
  MAJOR: "#dc2626",
  CRITICAL: "#111827",
};

export function buildDisciplinaryAlertEmail(data: DisciplinaryEmailData): { subject: string; html: string; text: string } {
  const { hrName, employeeName, employeeId, department, eventType, disciplinaryType, severity, incidentDate, action, status } = data;
  const color = SEVERITY_COLORS[severity] ?? "#6b7280";
  const eventLabel = eventType === "CREATED" ? "New Record Filed" : eventType === "APPEALED" ? "Appeal Submitted" : "Case Closed";
  const subject = `[HR Alert] Disciplinary ${eventLabel} — ${employeeName} (${severity})`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
<tr><td style="background:${color};padding:24px 32px">
  <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">Disciplinary Alert — ${eventLabel}</h1>
  <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px">Severity: ${severity}</p>
</td></tr>
<tr><td style="padding:32px">
  <p style="margin:0 0 16px;color:#374151;font-size:15px">Dear ${hrName ?? "HR Team"},</p>
  <p style="margin:0 0 24px;color:#374151;font-size:15px">A disciplinary event requires your attention.</p>
  <table width="100%" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px">
    <tr style="background:#f9fafb"><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#6b7280;width:40%">Employee</td><td style="padding:10px 16px;font-size:14px;color:#111827">${employeeName} <span style="color:#6b7280;font-size:12px">(${employeeId})</span></td></tr>
    ${department ? `<tr><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb">Department</td><td style="padding:10px 16px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb">${department}</td></tr>` : ""}
    <tr style="background:#f9fafb"><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb">Violation Type</td><td style="padding:10px 16px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb">${disciplinaryType}</td></tr>
    <tr><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb">Severity</td><td style="padding:10px 16px;border-top:1px solid #e5e7eb"><span style="background:${color};color:#fff;padding:3px 10px;border-radius:9999px;font-size:12px;font-weight:600">${severity}</span></td></tr>
    <tr style="background:#f9fafb"><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb">Incident Date</td><td style="padding:10px 16px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb">${incidentDate}</td></tr>
    <tr><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb">Action Taken</td><td style="padding:10px 16px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb">${action}</td></tr>
    <tr style="background:#f9fafb"><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb">Status</td><td style="padding:10px 16px;font-size:14px;font-weight:600;color:#111827;border-top:1px solid #e5e7eb">${status}</td></tr>
  </table>
  <p style="margin:0;color:#6b7280;font-size:13px">Log in to the HR portal to review and manage this case.</p>
</td></tr>
<tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
  <p style="margin:0;color:#9ca3af;font-size:12px">Gulfa HRM — HR Compliance Alert</p>
</td></tr>
</table></td></tr></table></body></html>`;

  const text = `Disciplinary Alert — ${eventLabel}\n\nDear ${hrName ?? "HR Team"},\nEmployee: ${employeeName} (${employeeId})\nType: ${disciplinaryType} | Severity: ${severity}\nIncident: ${incidentDate} | Action: ${action} | Status: ${status}\n\nGulfa HRM`;
  return { subject, html, text };
}
