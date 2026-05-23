import "server-only";
import { notify, notifyBulk } from "@/lib/notifications/service";
import { buildPayslipReadyEmail, buildPayrollCompleteEmail } from "@/lib/email/templates/payroll";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type PayslipNotifyParams = {
  companyId: string;
  employeeId: string;
  employeeEmail: string;
  employeeName: string;
  month: number;
  year: number;
  basicSalary: number;
  totalSalary: number;
  currency?: string;
  netPay?: number;
};

export async function notifyPayslipReady(params: PayslipNotifyParams): Promise<void> {
  const { companyId, employeeId, employeeEmail, employeeName, month, year, basicSalary, totalSalary, currency = "AED", netPay } = params;
  const monthName = MONTH_NAMES[month - 1] ?? `Month ${month}`;

  const emailData = buildPayslipReadyEmail({ employeeName, month: monthName, year, basicSalary, totalSalary, currency, netPay });

  await notify({
    companyId,
    type: "PAYSLIP_READY",
    title: `Payslip ready — ${monthName} ${year}`,
    message: `Your payslip for ${monthName} ${year} is ready. Net pay: ${currency} ${(netPay ?? totalSalary).toLocaleString()}.`,
    employeeId,
    data: { month, year, totalSalary, currency },
    email: {
      to: employeeEmail,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      recipientId: employeeId,
    },
  });
}

export async function notifyPayslipsBulk(employees: PayslipNotifyParams[]): Promise<void> {
  const MONTH_NAMES_LOCAL = MONTH_NAMES;
  const payloads = employees.map((p) => {
    const monthName = MONTH_NAMES_LOCAL[p.month - 1] ?? `Month ${p.month}`;
    const currency = p.currency ?? "AED";
    const emailData = buildPayslipReadyEmail({ employeeName: p.employeeName, month: monthName, year: p.year, basicSalary: p.basicSalary, totalSalary: p.totalSalary, currency, netPay: p.netPay });
    return {
      companyId: p.companyId,
      type: "PAYSLIP_READY" as const,
      title: `Payslip ready — ${monthName} ${p.year}`,
      message: `Your payslip for ${monthName} ${p.year} is ready.`,
      employeeId: p.employeeId,
      data: { month: p.month, year: p.year, totalSalary: p.totalSalary, currency },
      email: {
        to: p.employeeEmail,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        recipientId: p.employeeId,
      },
    };
  });
  await notifyBulk(payloads);
}

type PayrollCompleteParams = {
  companyId: string;
  hrEmail: string;
  hrName?: string;
  month: number;
  year: number;
  totalEmployees: number;
  totalAmount: number;
  currency?: string;
};

export async function notifyPayrollComplete(params: PayrollCompleteParams): Promise<void> {
  const { companyId, hrEmail, hrName, month, year, totalEmployees, totalAmount, currency = "AED" } = params;
  const monthName = MONTH_NAMES[month - 1] ?? `Month ${month}`;

  const emailData = buildPayrollCompleteEmail({ hrName, month: monthName, year, totalEmployees, totalAmount, currency });

  await notify({
    companyId,
    type: "PAYROLL_COMPLETE",
    title: `Payroll run complete — ${monthName} ${year}`,
    message: `Payroll for ${monthName} ${year} processed: ${totalEmployees} employees, ${currency} ${totalAmount.toLocaleString()} total.`,
    data: { month, year, totalEmployees, totalAmount, currency },
    email: {
      to: hrEmail,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    },
  });
}
