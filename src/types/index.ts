export type ApiResponse<T> = {
  data: T | null;
  error: string | null;
  success: boolean;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PaginationParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type FilterParams = PaginationParams & {
  [key: string]: string | number | boolean | undefined;
};

export type SelectOption = {
  label: string;
  value: string;
};

export type StatusVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "secondary";

export type UserSession = {
  id: string;
  email: string;
  companyId: string;
  employeeId: string | null;
  role: string;
  permissions: string[];
};

export type NavigationItem = {
  title: string;
  href: string;
  icon: string;
  badge?: number;
  children?: NavigationItem[];
};

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "VIEW"
  | "APPROVE"
  | "REJECT";

export type Module =
  | "EMPLOYEES"
  | "ATTENDANCE"
  | "LEAVE"
  | "PAYROLL"
  | "DOCUMENTS"
  | "ASSETS"
  | "ACCOMMODATION"
  | "BENEFITS"
  | "DISCIPLINARY"
  | "CAREER"
  | "SETTINGS";
