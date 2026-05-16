import { format, formatDistanceToNow, differenceInDays } from "date-fns";

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy");
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy, hh:mm a");
}

export function formatRelativeTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatCurrency(
  amount: number,
  currency = "AED",
  locale = "en-AE"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-AE").format(n);
}

export function daysUntilExpiry(expiryDate: Date | string): number {
  return differenceInDays(new Date(expiryDate), new Date());
}

export function getExpiryStatus(
  expiryDate: Date | string | null | undefined
): "expired" | "critical" | "warning" | "ok" | "none" {
  if (!expiryDate) return "none";
  const days = daysUntilExpiry(expiryDate);
  if (days < 0) return "expired";
  if (days <= 30) return "critical";
  if (days <= 60) return "warning";
  return "ok";
}

export function getFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}

export function generateEmployeeId(sequence: number): string {
  return `EMP-${String(sequence).padStart(4, "0")}`;
}

export function generateAssetCode(sequence: number): string {
  return `AST-${String(sequence).padStart(4, "0")}`;
}
