import type { Prisma } from "@prisma/client";

export type ExpiryRisk = "expired" | "critical" | "warning" | "ok";

export type DocumentExpiryItem = {
  documentId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string | null;
  location: string | null;
  documentTypeName: string;
  documentNumber: string | null;
  expiryDate: string; // ISO
  daysUntilExpiry: number; // negative = already expired
  risk: ExpiryRisk;
  storagePath: string | null;
};

export type ComplianceStat = {
  total: number;
  expired: number;
  critical: number; // ≤ 30 days
  warning: number;  // 31–90 days
  ok: number;
};

export type ComplianceByDocType = {
  documentType: string;
  expired: number;
  critical: number;
  warning: number;
  ok: number;
  total: number;
};

export type ComplianceByDepartment = {
  department: string;
  complianceRate: number; // 0–100
  atRisk: number;
  total: number;
};

export type ExpiryForecastPoint = {
  month: string; // "2026-06"
  expiring: number;
};

export type ReminderConfig = Prisma.DocumentReminderConfigGetPayload<object>;

export type ReminderLog = Prisma.DocumentReminderLogGetPayload<object>;
