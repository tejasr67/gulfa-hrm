import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";

type StatusMap = {
  [key: string]: BadgeProps["variant"];
};

const EMPLOYEE_STATUS_MAP: StatusMap = {
  ACTIVE: "success",
  ON_LEAVE: "info",
  SUSPENDED: "warning",
  TERMINATED: "danger",
  PROBATION: "secondary",
};

const LEAVE_STATUS_MAP: StatusMap = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "secondary",
};

const DOCUMENT_STATUS_MAP: StatusMap = {
  ACTIVE: "success",
  EXPIRED: "danger",
  EXPIRING_SOON: "warning",
  CANCELLED: "secondary",
};

const ATTENDANCE_STATUS_MAP: StatusMap = {
  PRESENT: "success",
  ABSENT: "danger",
  HALF_DAY: "warning",
  LATE: "warning",
  ON_LEAVE: "info",
  HOLIDAY: "secondary",
  WEEKEND: "secondary",
  REMOTE: "info",
};

const ASSET_STATUS_MAP: StatusMap = {
  AVAILABLE: "success",
  ASSIGNED: "info",
  UNDER_MAINTENANCE: "warning",
  DISPOSED: "secondary",
  LOST: "danger",
};

const PAYROLL_STATUS_MAP: StatusMap = {
  DRAFT: "secondary",
  PROCESSING: "warning",
  APPROVED: "info",
  PAID: "success",
  CANCELLED: "danger",
};

type StatusType =
  | "employee"
  | "leave"
  | "document"
  | "attendance"
  | "asset"
  | "payroll";

const STATUS_MAPS: Record<StatusType, StatusMap> = {
  employee: EMPLOYEE_STATUS_MAP,
  leave: LEAVE_STATUS_MAP,
  document: DOCUMENT_STATUS_MAP,
  attendance: ATTENDANCE_STATUS_MAP,
  asset: ASSET_STATUS_MAP,
  payroll: PAYROLL_STATUS_MAP,
};

type Props = {
  status: string;
  type: StatusType;
  className?: string;
};

export function StatusBadge({ status, type, className }: Props) {
  const map = STATUS_MAPS[type];
  const variant = map[status] ?? "secondary";
  const label = status.replace(/_/g, " ");

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
