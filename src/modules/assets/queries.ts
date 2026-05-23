import "server-only";
import { prisma } from "@/lib/prisma";
import type {
  AssetStats,
  AssetCategoryBreakdown,
  MaintenanceAlertItem,
} from "./types";
import type {
  CreateAssetInput,
  UpdateAssetInput,
  IssueAssetInput,
  ReturnAssetInput,
  ScheduleMaintenanceInput,
  CompleteMaintenanceInput,
} from "./schema";

// ── Categories ────────────────────────────────────────────────────────────────

export async function getAssetCategories(companyId: string) {
  return prisma.assetCategory.findMany({
    where: { OR: [{ companyId }, { companyId: null }], isActive: true },
    include: { _count: { select: { assets: { where: { companyId, deletedAt: null } } } } },
    orderBy: { name: "asc" },
  });
}

export async function createAssetCategory(companyId: string, data: { name: string; nameAr?: string; icon?: string }) {
  return prisma.assetCategory.create({ data: { companyId, ...data } });
}

// ── Assets ────────────────────────────────────────────────────────────────────

export async function getAssets(
  companyId: string,
  filters: { categoryId?: string; status?: string; search?: string } = {}
) {
  const where: Record<string, unknown> = {
    companyId,
    deletedAt: null,
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { code: { contains: filters.search, mode: "insensitive" } },
            { serialNumber: { contains: filters.search, mode: "insensitive" } },
            { brand: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  return prisma.asset.findMany({
    where,
    include: {
      category: { select: { id: true, name: true, icon: true } },
      assignments: {
        where: { returnedAt: null },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
        },
        take: 1,
      },
      _count: { select: { assignments: true, maintenanceLogs: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAsset(id: string, companyId: string) {
  return prisma.asset.findFirst({
    where: { id, companyId, deletedAt: null },
    include: {
      category: true,
      assignments: {
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeId: true, department: { select: { name: true } } },
          },
        },
        orderBy: { assignedAt: "desc" },
      },
      maintenanceLogs: { orderBy: { scheduledAt: "desc" } },
    },
  });
}

export async function createAsset(companyId: string, data: CreateAssetInput) {
  return prisma.asset.create({
    data: {
      companyId,
      categoryId: data.categoryId,
      name: data.name,
      code: data.code,
      serialNumber: data.serialNumber,
      brand: data.brand,
      model: data.model,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      purchasePrice: data.purchasePrice,
      currentValue: data.purchasePrice,
      depreciationRate: data.depreciationRate,
      warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
      replacementCycleMonths: data.replacementCycleMonths,
      location: data.location,
      condition: data.condition,
      notes: data.notes,
    },
  });
}

export async function updateAsset(id: string, companyId: string, data: UpdateAssetInput) {
  return prisma.asset.update({
    where: { id },
    data: {
      ...(data.name ? { name: data.name } : {}),
      ...(data.code ? { code: data.code } : {}),
      ...(data.categoryId ? { categoryId: data.categoryId } : {}),
      ...(data.serialNumber !== undefined ? { serialNumber: data.serialNumber } : {}),
      ...(data.brand !== undefined ? { brand: data.brand } : {}),
      ...(data.model !== undefined ? { model: data.model } : {}),
      ...(data.purchaseDate ? { purchaseDate: new Date(data.purchaseDate) } : {}),
      ...(data.purchasePrice !== undefined ? { purchasePrice: data.purchasePrice } : {}),
      ...(data.depreciationRate !== undefined ? { depreciationRate: data.depreciationRate } : {}),
      ...(data.warrantyExpiry ? { warrantyExpiry: new Date(data.warrantyExpiry) } : {}),
      ...(data.replacementCycleMonths !== undefined ? { replacementCycleMonths: data.replacementCycleMonths } : {}),
      ...(data.location !== undefined ? { location: data.location } : {}),
      ...(data.condition ? { condition: data.condition } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    },
  });
}

export async function softDeleteAsset(id: string, companyId: string) {
  const asset = await prisma.asset.findFirst({ where: { id, companyId } });
  if (!asset) throw new Error("Asset not found");
  if (asset.status === "ASSIGNED") throw new Error("Cannot delete an assigned asset — return it first");
  return prisma.asset.update({ where: { id }, data: { deletedAt: new Date(), status: "DISPOSED" } });
}

// ── Assignments (Issue / Return) ──────────────────────────────────────────────

export async function issueAsset(companyId: string, data: IssueAssetInput, issuedBy: string) {
  const asset = await prisma.asset.findFirst({ where: { id: data.assetId, companyId } });
  if (!asset) throw new Error("Asset not found");
  if (asset.status !== "AVAILABLE" && asset.status !== "RESERVED") {
    throw new Error(`Asset is currently ${asset.status.toLowerCase()} and cannot be issued`);
  }

  return prisma.$transaction(async (tx) => {
    const assignment = await tx.assetAssignment.create({
      data: {
        assetId: data.assetId,
        employeeId: data.employeeId,
        condition: data.condition,
        expectedReturnDate: data.expectedReturnDate ? new Date(data.expectedReturnDate) : null,
        notes: data.notes,
        assignedBy: issuedBy,
      },
    });
    await tx.asset.update({
      where: { id: data.assetId },
      data: { status: "ASSIGNED", condition: data.condition },
    });
    return assignment;
  });
}

export async function returnAsset(companyId: string, data: ReturnAssetInput, returnedBy: string) {
  const assignment = await prisma.assetAssignment.findFirst({
    where: { id: data.assignmentId, asset: { companyId }, returnedAt: null },
    include: { asset: true },
  });
  if (!assignment) throw new Error("Active assignment not found");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.assetAssignment.update({
      where: { id: data.assignmentId },
      data: {
        returnedAt: new Date(),
        returnCondition: data.returnCondition,
        returnNotes: data.returnNotes,
        returnedBy,
      },
    });
    await tx.asset.update({
      where: { id: assignment.assetId },
      data: { status: "AVAILABLE", condition: data.returnCondition },
    });
    return updated;
  });
}

export async function getActiveAssignments(companyId: string) {
  return prisma.assetAssignment.findMany({
    where: { asset: { companyId }, returnedAt: null },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, employeeId: true, department: { select: { name: true } } } },
      asset: { select: { id: true, name: true, code: true, category: { select: { name: true } } } },
    },
    orderBy: { assignedAt: "desc" },
  });
}

export async function getEmployeeAssets(employeeId: string, companyId: string) {
  return prisma.assetAssignment.findMany({
    where: { employeeId, asset: { companyId } },
    include: {
      asset: { include: { category: { select: { name: true, icon: true } } } },
    },
    orderBy: { assignedAt: "desc" },
  });
}

// ── Maintenance ───────────────────────────────────────────────────────────────

export async function getMaintenanceLogs(companyId: string, filters: { status?: string; assetId?: string } = {}) {
  return prisma.assetMaintenance.findMany({
    where: {
      companyId,
      ...(filters.status ? { status: filters.status as "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "OVERDUE" } : {}),
      ...(filters.assetId ? { assetId: filters.assetId } : {}),
    },
    include: {
      asset: { select: { id: true, name: true, code: true, category: { select: { name: true } } } },
    },
    orderBy: { scheduledAt: "asc" },
  });
}

export async function scheduleMaintenance(companyId: string, data: ScheduleMaintenanceInput, createdBy: string) {
  const asset = await prisma.asset.findFirst({ where: { id: data.assetId, companyId } });
  if (!asset) throw new Error("Asset not found");

  return prisma.$transaction(async (tx) => {
    const log = await tx.assetMaintenance.create({
      data: {
        assetId: data.assetId,
        companyId,
        type: data.type,
        scheduledAt: new Date(data.scheduledAt),
        description: data.description,
        vendor: data.vendor,
        cost: data.cost,
        createdBy,
      },
    });
    if (asset.status === "AVAILABLE") {
      await tx.asset.update({ where: { id: data.assetId }, data: { status: "UNDER_MAINTENANCE", nextMaintenanceAt: new Date(data.scheduledAt) } });
    } else {
      await tx.asset.update({ where: { id: data.assetId }, data: { nextMaintenanceAt: new Date(data.scheduledAt) } });
    }
    return log;
  });
}

export async function completeMaintenance(companyId: string, data: CompleteMaintenanceInput) {
  const log = await prisma.assetMaintenance.findFirst({ where: { id: data.maintenanceId, companyId } });
  if (!log) throw new Error("Maintenance log not found");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.assetMaintenance.update({
      where: { id: data.maintenanceId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(data.completedAt),
        outcome: data.outcome,
        cost: data.cost ?? log.cost,
      },
    });
    const assetUpdate: Record<string, unknown> = {
      lastMaintenanceAt: new Date(data.completedAt),
      status: "AVAILABLE",
    };
    if (data.nextMaintenanceAt) assetUpdate.nextMaintenanceAt = new Date(data.nextMaintenanceAt);
    if (data.newCondition) assetUpdate.condition = data.newCondition;
    await tx.asset.update({ where: { id: log.assetId }, data: assetUpdate });
    return updated;
  });
}

export async function getMaintenanceAlerts(companyId: string): Promise<MaintenanceAlertItem[]> {
  const today = new Date();
  const inThirtyDays = new Date();
  inThirtyDays.setDate(today.getDate() + 30);

  const assets = await prisma.asset.findMany({
    where: {
      companyId,
      deletedAt: null,
      nextMaintenanceAt: { lte: inThirtyDays },
    },
    include: { category: { select: { name: true } } },
    orderBy: { nextMaintenanceAt: "asc" },
  });

  return assets.map((a) => {
    const days = Math.round(
      ((a.nextMaintenanceAt?.getTime() ?? 0) - today.getTime()) / 86_400_000
    );
    return {
      assetId: a.id,
      assetName: a.name,
      assetCode: a.code,
      categoryName: a.category.name,
      nextMaintenanceAt: a.nextMaintenanceAt!,
      daysUntil: days,
      isOverdue: days < 0,
    };
  });
}

// ── Stats & Reports ───────────────────────────────────────────────────────────

export async function getAssetStats(companyId: string): Promise<AssetStats> {
  const [counts, valueAgg] = await Promise.all([
    prisma.asset.groupBy({
      by: ["status"],
      where: { companyId, deletedAt: null },
      _count: true,
    }),
    prisma.asset.aggregate({
      where: { companyId, deletedAt: null },
      _sum: { purchasePrice: true, currentValue: true },
    }),
  ]);

  const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  return {
    total: counts.reduce((s, c) => s + c._count, 0),
    available: byStatus["AVAILABLE"] ?? 0,
    assigned: byStatus["ASSIGNED"] ?? 0,
    underMaintenance: byStatus["UNDER_MAINTENANCE"] ?? 0,
    disposed: byStatus["DISPOSED"] ?? 0,
    lost: byStatus["LOST"] ?? 0,
    totalValue: valueAgg._sum.purchasePrice ?? 0,
    currentValue: valueAgg._sum.currentValue ?? 0,
  };
}

export async function getCategoryBreakdown(companyId: string): Promise<AssetCategoryBreakdown[]> {
  const assets = await prisma.asset.findMany({
    where: { companyId, deletedAt: null },
    select: { status: true, purchasePrice: true, category: { select: { id: true, name: true, icon: true } } },
  });

  const map = new Map<string, AssetCategoryBreakdown>();
  for (const a of assets) {
    const cat = a.category;
    const entry = map.get(cat.id) ?? {
      categoryId: cat.id,
      categoryName: cat.name,
      icon: cat.icon,
      total: 0,
      available: 0,
      assigned: 0,
      underMaintenance: 0,
      totalValue: 0,
    };
    entry.total++;
    if (a.status === "AVAILABLE") entry.available++;
    if (a.status === "ASSIGNED") entry.assigned++;
    if (a.status === "UNDER_MAINTENANCE") entry.underMaintenance++;
    entry.totalValue += a.purchasePrice ?? 0;
    map.set(cat.id, entry);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export async function computeCurrentValues(companyId: string) {
  const assets = await prisma.asset.findMany({
    where: { companyId, deletedAt: null, purchasePrice: { gt: 0 }, depreciationRate: { gt: 0 }, purchaseDate: { not: null } },
  });

  const today = new Date();
  for (const asset of assets) {
    if (!asset.purchaseDate || !asset.depreciationRate || !asset.purchasePrice) continue;
    const yearsOld = (today.getTime() - asset.purchaseDate.getTime()) / (365.25 * 86_400_000);
    const currentValue = Math.max(0, asset.purchasePrice * Math.pow(1 - asset.depreciationRate / 100, yearsOld));
    await prisma.asset.update({ where: { id: asset.id }, data: { currentValue: Math.round(currentValue * 100) / 100 } });
  }
}
