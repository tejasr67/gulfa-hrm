export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
} as const;

export const UAE_NATIONALITIES = [
  "Emirati",
  "Indian",
  "Pakistani",
  "Bangladeshi",
  "Filipino",
  "Egyptian",
  "Jordanian",
  "Lebanese",
  "Syrian",
  "British",
  "American",
  "Other",
] as const;

export const UAE_EMIRATES = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Umm Al Quwain",
  "Ras Al Khaimah",
  "Fujairah",
] as const;

export const BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
] as const;

export const DOCUMENT_ALERT_DAYS = {
  CRITICAL: 30,
  WARNING: 60,
} as const;

export const LEAVE_TYPES_DEFAULT = [
  { code: "AL", name: "Annual Leave", maxDaysPerYear: 30, isPaid: true },
  { code: "SL", name: "Sick Leave", maxDaysPerYear: 15, isPaid: true },
  { code: "EL", name: "Emergency Leave", maxDaysPerYear: 5, isPaid: true },
  { code: "ML", name: "Maternity Leave", maxDaysPerYear: 60, isPaid: true },
  { code: "PL", name: "Paternity Leave", maxDaysPerYear: 5, isPaid: true },
  { code: "UL", name: "Unpaid Leave", maxDaysPerYear: 30, isPaid: false },
] as const;

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  HR_ADMIN: "HR_ADMIN",
  HR_MANAGER: "HR_MANAGER",
  MANAGER: "MANAGER",
  EMPLOYEE: "EMPLOYEE",
} as const;

export const PERMISSIONS = {
  EMPLOYEES: {
    CREATE: "EMPLOYEES:CREATE",
    READ: "EMPLOYEES:READ",
    UPDATE: "EMPLOYEES:UPDATE",
    DELETE: "EMPLOYEES:DELETE",
  },
  ATTENDANCE: {
    CREATE: "ATTENDANCE:CREATE",
    READ: "ATTENDANCE:READ",
    UPDATE: "ATTENDANCE:UPDATE",
    APPROVE: "ATTENDANCE:APPROVE",
  },
  LEAVE: {
    CREATE: "LEAVE:CREATE",
    READ: "LEAVE:READ",
    UPDATE: "LEAVE:UPDATE",
    APPROVE: "LEAVE:APPROVE",
  },
  PAYROLL: {
    CREATE: "PAYROLL:CREATE",
    READ: "PAYROLL:READ",
    PROCESS: "PAYROLL:PROCESS",
    APPROVE: "PAYROLL:APPROVE",
  },
  DOCUMENTS: {
    CREATE: "DOCUMENTS:CREATE",
    READ: "DOCUMENTS:READ",
    UPDATE: "DOCUMENTS:UPDATE",
    DELETE: "DOCUMENTS:DELETE",
  },
  ASSETS: {
    CREATE: "ASSETS:CREATE",
    READ: "ASSETS:READ",
    UPDATE: "ASSETS:UPDATE",
    ASSIGN: "ASSETS:ASSIGN",
    DELETE: "ASSETS:DELETE",
  },
  ACCOMMODATION: {
    CREATE: "ACCOMMODATION:CREATE",
    READ: "ACCOMMODATION:READ",
    UPDATE: "ACCOMMODATION:UPDATE",
    ASSIGN: "ACCOMMODATION:ASSIGN",
    DELETE: "ACCOMMODATION:DELETE",
  },
  BENEFITS: {
    CREATE: "BENEFITS:CREATE",
    READ: "BENEFITS:READ",
    UPDATE: "BENEFITS:UPDATE",
    DELETE: "BENEFITS:DELETE",
  },
  DISCIPLINARY: {
    CREATE: "DISCIPLINARY:CREATE",
    READ: "DISCIPLINARY:READ",
    UPDATE: "DISCIPLINARY:UPDATE",
    DELETE: "DISCIPLINARY:DELETE",
  },
  CAREER: {
    CREATE: "CAREER:CREATE",
    READ: "CAREER:READ",
    UPDATE: "CAREER:UPDATE",
  },
  REPORTS: {
    READ: "REPORTS:READ",
    EXPORT: "REPORTS:EXPORT",
  },
  SETTINGS: {
    READ: "SETTINGS:READ",
    UPDATE: "SETTINGS:UPDATE",
  },
  NOTIFICATIONS: {
    READ: "NOTIFICATIONS:READ",
    MANAGE: "NOTIFICATIONS:MANAGE",
  },
} as const;

export const CURRENCY = "AED";
export const TIMEZONE = "Asia/Dubai";
export const DATE_FORMAT = "dd/MM/yyyy";
