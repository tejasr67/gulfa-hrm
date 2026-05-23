import type { Prisma } from "@prisma/client";

export type AssetWithDetails = Prisma.AssetGetPayload<{
  include: {
    category: true;
    assignments: {
      include: {
        employee: {
          select: { id: true; firstName: true; lastName: true; employeeId: true; department: { select: { name: true } } };
        };
      };
      orderBy: { assignedAt: "desc" };
    };
    maintenanceLogs: { orderBy: { scheduledAt: "desc" } };
  };
}>;

export type AssetListItem = Prisma.AssetGetPayload<{
  include: {
    category: { select: { id: true; name: true; icon: true } };
    assignments: {
      where: { returnedAt: null };
      include: {
        employee: { select: { id: true; firstName: true; lastName: true; employeeId: true } };
      };
      take: 1;
    };
    _count: { select: { assignments: true } };
  };
}>;

export type AssetCategoryWithCount = Prisma.AssetCategoryGetPayload<{
  include: { _count: { select: { assets: true } } };
}>;

export type AssetAssignmentWithEmployee = Prisma.AssetAssignmentGetPayload<{
  include: {
    employee: { select: { id: true; firstName: true; lastName: true; employeeId: true; department: { select: { name: true } } } };
    asset: { select: { id: true; name: true; code: true; category: { select: { name: true } } } };
  };
}>;

export type AssetMaintenanceWithAsset = Prisma.AssetMaintenanceGetPayload<{
  include: {
    asset: { select: { id: true; name: true; code: true; category: { select: { name: true } } } };
  };
}>;

export type AssetStats = {
  total: number;
  available: number;
  assigned: number;
  underMaintenance: number;
  disposed: number;
  lost: number;
  totalValue: number;
  currentValue: number;
};

export type AssetCategoryBreakdown = {
  categoryId: string;
  categoryName: string;
  icon: string | null;
  total: number;
  available: number;
  assigned: number;
  underMaintenance: number;
  totalValue: number;
};

export type AssetUtilizationReport = {
  month: string;
  assigned: number;
  available: number;
  maintenance: number;
};

export type MaintenanceAlertItem = {
  assetId: string;
  assetName: string;
  assetCode: string;
  categoryName: string;
  nextMaintenanceAt: Date;
  daysUntil: number;
  isOverdue: boolean;
};
