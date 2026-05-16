import "server-only";
import { prisma } from "@/lib/prisma";
import { addDays, format } from "date-fns";
import type {
  ComplianceStat, ComplianceByDocType, ComplianceByDepartment,
  ExpiryForecastPoint, DocumentExpiryItem, ExpiryRisk,
} from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

function toRisk(days: number): ExpiryRisk {
  if (days < 0) return "expired";
  if (days <= 30) return "critical";
  if (days <= 90) return "warning";
  return "ok";
}

// ── Raw expiring documents query ──────────────────────────────────────────────

type ExpiringDocFilter = {
  riskLevels?: ExpiryRisk[];
  departmentId?: string;
  documentTypeId?: string;
  page?: number;
  limit?: number;
};

export async function getExpiringDocuments(
  companyId: string,
  filter: ExpiringDocFilter = {}
): Promise<{ items: DocumentExpiryItem[]; total: number }> {
  const { riskLevels, departmentId, documentTypeId, page = 1, limit = 50 } = filter;

  const docs = await prisma.employeeDocument.findMany({
    where: {
      expiryDate: { not: null },
      deletedAt: null,
      employee: {
        companyId,
        deletedAt: null,
        ...(departmentId ? { departmentId } : {}),
      },
      ...(documentTypeId ? { documentTypeId } : {}),
    },
    select: {
      id: true,
      documentNumber: true,
      expiryDate: true,
      storagePath: true,
      documentType: { select: { name: true } },
      employee: {
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          department: { select: { name: true } },
          location: { select: { name: true } },
        },
      },
    },
    orderBy: { expiryDate: "asc" },
  });

  const mapped: DocumentExpiryItem[] = docs.map((d) => {
    const days = daysUntil(d.expiryDate!);
    return {
      documentId: d.id,
      employeeId: d.employee.id,
      employeeCode: d.employee.employeeId,
      employeeName: `${d.employee.firstName} ${d.employee.lastName}`,
      department: d.employee.department?.name ?? null,
      location: d.employee.location?.name ?? null,
      documentTypeName: d.documentType.name,
      documentNumber: d.documentNumber,
      expiryDate: d.expiryDate!.toISOString(),
      daysUntilExpiry: days,
      risk: toRisk(days),
      storagePath: d.storagePath,
    };
  });

  const filtered = riskLevels?.length
    ? mapped.filter((i) => riskLevels.includes(i.risk))
    : mapped;

  const total = filtered.length;
  const items = filtered.slice((page - 1) * limit, page * limit);

  return { items, total };
}

// ── Compliance stats ──────────────────────────────────────────────────────────

export async function getComplianceStats(companyId: string): Promise<ComplianceStat> {
  const docs = await prisma.employeeDocument.findMany({
    where: {
      expiryDate: { not: null },
      deletedAt: null,
      employee: { companyId, deletedAt: null },
    },
    select: { expiryDate: true },
  });

  const stats: ComplianceStat = { total: docs.length, expired: 0, critical: 0, warning: 0, ok: 0 };
  for (const d of docs) {
    const risk = toRisk(daysUntil(d.expiryDate!));
    stats[risk]++;
  }
  return stats;
}

// ── Compliance by document type ───────────────────────────────────────────────

export async function getComplianceByDocType(companyId: string): Promise<ComplianceByDocType[]> {
  const docs = await prisma.employeeDocument.findMany({
    where: {
      expiryDate: { not: null },
      deletedAt: null,
      employee: { companyId, deletedAt: null },
    },
    select: {
      expiryDate: true,
      documentType: { select: { name: true } },
    },
  });

  const map = new Map<string, ComplianceByDocType>();
  for (const d of docs) {
    const name = d.documentType.name;
    const entry = map.get(name) ?? { documentType: name, expired: 0, critical: 0, warning: 0, ok: 0, total: 0 };
    entry.total++;
    entry[toRisk(daysUntil(d.expiryDate!))]++;
    map.set(name, entry);
  }
  return Array.from(map.values()).sort((a, b) => (b.expired + b.critical) - (a.expired + a.critical));
}

// ── Compliance by department ──────────────────────────────────────────────────

export async function getComplianceByDepartment(companyId: string): Promise<ComplianceByDepartment[]> {
  const docs = await prisma.employeeDocument.findMany({
    where: {
      expiryDate: { not: null },
      deletedAt: null,
      employee: { companyId, deletedAt: null },
    },
    select: {
      expiryDate: true,
      employee: { select: { department: { select: { name: true } } } },
    },
  });

  const map = new Map<string, { ok: number; atRisk: number; total: number }>();
  for (const d of docs) {
    const dept = d.employee.department?.name ?? "No Department";
    const entry = map.get(dept) ?? { ok: 0, atRisk: 0, total: 0 };
    entry.total++;
    const risk = toRisk(daysUntil(d.expiryDate!));
    if (risk === "ok") entry.ok++;
    else entry.atRisk++;
    map.set(dept, entry);
  }

  return Array.from(map.entries())
    .map(([department, v]) => ({
      department,
      complianceRate: v.total > 0 ? Math.round((v.ok / v.total) * 100) : 100,
      atRisk: v.atRisk,
      total: v.total,
    }))
    .sort((a, b) => a.complianceRate - b.complianceRate);
}

// ── 12-month expiry forecast ──────────────────────────────────────────────────

export async function getExpiryForecast(companyId: string): Promise<ExpiryForecastPoint[]> {
  const today = new Date();
  const endDate = addDays(today, 365);

  const docs = await prisma.employeeDocument.findMany({
    where: {
      expiryDate: { gte: today, lte: endDate },
      deletedAt: null,
      employee: { companyId, deletedAt: null },
    },
    select: { expiryDate: true },
  });

  const map = new Map<string, number>();
  for (const d of docs) {
    const key = format(d.expiryDate!, "yyyy-MM");
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  const points: ExpiryForecastPoint[] = [];
  for (let i = 0; i < 12; i++) {
    const d = addDays(today, i * 30);
    const key = format(d, "yyyy-MM");
    points.push({ month: key, expiring: map.get(key) ?? 0 });
  }
  return points;
}

// ── Documents needing reminders (for cron) ───────────────────────────────────

export type ReminderCandidate = {
  documentId: string;
  employeeId: string;
  companyId: string;
  employeeName: string;
  employeeEmail: string;
  documentTypeName: string;
  documentTypeId: string;
  documentNumber: string | null;
  expiryDate: Date;
  daysUntilExpiry: number;
  hrEmail?: string;
};

export async function getReminderCandidates(companyId: string): Promise<ReminderCandidate[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = addDays(today, 90);

  const docs = await prisma.employeeDocument.findMany({
    where: {
      expiryDate: { gte: today, lte: horizon },
      deletedAt: null,
      employee: { companyId, deletedAt: null },
    },
    select: {
      id: true,
      documentNumber: true,
      expiryDate: true,
      documentTypeId: true,
      documentType: { select: { name: true } },
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return docs.map((d) => ({
    documentId: d.id,
    employeeId: d.employee.id,
    companyId,
    employeeName: `${d.employee.firstName} ${d.employee.lastName}`,
    employeeEmail: d.employee.email,
    documentTypeName: d.documentType.name,
    documentTypeId: d.documentTypeId,
    documentNumber: d.documentNumber,
    expiryDate: d.expiryDate!,
    daysUntilExpiry: daysUntil(d.expiryDate!),
  }));
}

// ── Reminder config helpers ───────────────────────────────────────────────────

export async function getReminderConfig(companyId: string, documentTypeId?: string) {
  // Try exact match first, then global
  const config = await prisma.documentReminderConfig.findFirst({
    where: {
      companyId,
      documentTypeId: documentTypeId ?? null,
      isEnabled: true,
    },
  });
  if (config) return config;
  if (documentTypeId) {
    return prisma.documentReminderConfig.findFirst({
      where: { companyId, documentTypeId: null, isEnabled: true },
    });
  }
  return null;
}

export async function upsertReminderConfig(
  companyId: string,
  documentTypeId: string | null,
  data: {
    reminderDays: number[];
    notifyEmployee: boolean;
    notifyManager: boolean;
    notifyHR: boolean;
    emailEnabled: boolean;
    inAppEnabled: boolean;
    isEnabled: boolean;
  }
) {
  return prisma.documentReminderConfig.upsert({
    where: {
      companyId_documentTypeId: {
        companyId,
        documentTypeId: documentTypeId as string,
      },
    },
    create: { companyId, documentTypeId, ...data },
    update: data,
  });
}

// ── Reminder log (dedup) ──────────────────────────────────────────────────────

export async function hasReminderBeenSent(
  documentId: string,
  reminderDays: number,
  channel: "EMAIL" | "IN_APP"
): Promise<boolean> {
  const existing = await prisma.documentReminderLog.findUnique({
    where: {
      documentId_reminderDays_channel: { documentId, reminderDays, channel },
    },
    select: { id: true },
  });
  return !!existing;
}

export async function recordReminderSent(
  documentId: string,
  employeeId: string,
  companyId: string,
  reminderDays: number,
  channel: "EMAIL" | "IN_APP"
): Promise<void> {
  await prisma.documentReminderLog.upsert({
    where: {
      documentId_reminderDays_channel: { documentId, reminderDays, channel },
    },
    create: { documentId, employeeId, companyId, reminderDays, channel },
    update: { sentAt: new Date() },
  });
}
