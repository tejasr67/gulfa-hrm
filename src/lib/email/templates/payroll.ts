export type PayslipEmailData = {
  employeeName: string;
  month: string;
  year: number;
  basicSalary: number;
  totalSalary: number;
  currency: string;
  netPay?: number;
};

export function buildPayslipReadyEmail(data: PayslipEmailData): { subject: string; html: string; text: string } {
  const { employeeName, month, year, basicSalary, totalSalary, currency, netPay } = data;
  const subject = `Your payslip for ${month} ${year} is ready`;
  const fmt = (n: number) => n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
<tr><td style="background:#2563eb;padding:24px 32px">
  <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">Payslip Ready</h1>
  <p style="margin:4px 0 0;color:rgba(255,255,255,0.9);font-size:14px">${month} ${year}</p>
</td></tr>
<tr><td style="padding:32px">
  <p style="margin:0 0 24px;color:#374151;font-size:15px">Dear ${employeeName},</p>
  <p style="margin:0 0 24px;color:#374151;font-size:15px">Your payslip for <strong>${month} ${year}</strong> has been processed and is now available.</p>
  <table width="100%" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px">
    <tr style="background:#f9fafb"><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#6b7280;width:50%">Basic Salary</td><td style="padding:10px 16px;font-size:14px;color:#111827;text-align:right">${currency} ${fmt(basicSalary)}</td></tr>
    <tr><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb">Total Package</td><td style="padding:10px 16px;font-size:14px;color:#111827;text-align:right;border-top:1px solid #e5e7eb">${currency} ${fmt(totalSalary)}</td></tr>
    ${netPay !== undefined ? `<tr style="background:#f0fdf4"><td style="padding:12px 16px;font-size:14px;font-weight:700;color:#15803d;border-top:1px solid #e5e7eb">Net Pay</td><td style="padding:12px 16px;font-size:16px;font-weight:700;color:#15803d;text-align:right;border-top:1px solid #e5e7eb">${currency} ${fmt(netPay)}</td></tr>` : ""}
  </table>
  <p style="margin:0;color:#6b7280;font-size:13px">Log in to the HR portal to view and download your full payslip.</p>
</td></tr>
<tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
  <p style="margin:0;color:#9ca3af;font-size:12px">Gulfa HRM — Payroll Notification</p>
</td></tr>
</table></td></tr></table></body></html>`;

  const text = `Payslip Ready — ${month} ${year}\n\nDear ${employeeName},\nYour payslip for ${month} ${year} is ready.\nBasic: ${currency} ${fmt(basicSalary)} | Total: ${currency} ${fmt(totalSalary)}${netPay !== undefined ? ` | Net Pay: ${currency} ${fmt(netPay)}` : ""}\n\nLog in to the HR portal to view your payslip.\n\nGulfa HRM`;
  return { subject, html, text };
}

export type PayrollCompleteEmailData = {
  hrName?: string;
  month: string;
  year: number;
  totalEmployees: number;
  totalAmount: number;
  currency: string;
};

export function buildPayrollCompleteEmail(data: PayrollCompleteEmailData): { subject: string; html: string; text: string } {
  const { hrName, month, year, totalEmployees, totalAmount, currency } = data;
  const subject = `Payroll completed — ${month} ${year}`;
  const fmt = (n: number) => n.toLocaleString("en-AE", { minimumFractionDigits: 2 });

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
<tr><td style="background:#16a34a;padding:24px 32px">
  <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">Payroll Run Completed</h1>
  <p style="margin:4px 0 0;color:rgba(255,255,255,0.9);font-size:14px">${month} ${year}</p>
</td></tr>
<tr><td style="padding:32px">
  <p style="margin:0 0 24px;color:#374151;font-size:15px">Dear ${hrName ?? "HR Team"},</p>
  <p style="margin:0 0 24px;color:#374151;font-size:15px">The payroll run for <strong>${month} ${year}</strong> has been completed successfully.</p>
  <table width="100%" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px">
    <tr style="background:#f9fafb"><td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;width:50%">Employees Processed</td><td style="padding:12px 16px;font-size:14px;font-weight:700;color:#111827;text-align:right">${totalEmployees}</td></tr>
    <tr><td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb">Total Payroll</td><td style="padding:12px 16px;font-size:14px;font-weight:700;color:#111827;text-align:right;border-top:1px solid #e5e7eb">${currency} ${fmt(totalAmount)}</td></tr>
  </table>
  <p style="margin:0;color:#6b7280;font-size:13px">Individual payslips have been sent to all employees. Log in to the HR portal to review the full payroll report.</p>
</td></tr>
<tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
  <p style="margin:0;color:#9ca3af;font-size:12px">Gulfa HRM — Payroll Automation</p>
</td></tr>
</table></td></tr></table></body></html>`;

  const text = `Payroll Completed — ${month} ${year}\n\nDear ${hrName ?? "HR Team"},\nPayroll for ${month} ${year} is complete.\nEmployees: ${totalEmployees} | Total: ${currency} ${fmt(totalAmount)}\n\nGulfa HRM`;
  return { subject, html, text };
}
