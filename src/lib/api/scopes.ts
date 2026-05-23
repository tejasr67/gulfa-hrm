export const AVAILABLE_SCOPES = [
  { value: "employees:read", label: "Read employees" },
  { value: "employees:write", label: "Create / update employees" },
  { value: "payroll:read", label: "Read payroll runs & payslips" },
  { value: "attendance:read", label: "Read attendance records" },
  { value: "attendance:write", label: "Write attendance records" },
  { value: "leave:read", label: "Read leave requests" },
  { value: "leave:write", label: "Create / update leave requests" },
  { value: "webhooks:manage", label: "Manage webhook endpoints" },
] as const;

export type Scope = (typeof AVAILABLE_SCOPES)[number]["value"];
