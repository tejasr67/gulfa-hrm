import "server-only";
import { prisma } from "@/lib/prisma";

export const CATEGORIES = ["TSHIRT", "PANTS", "SHOES", "CAPS"] as const;
export type UniformCategory = typeof CATEGORIES[number];

export const CATEGORY_LABELS: Record<string, string> = {
  TSHIRT: "T-Shirts",
  PANTS: "Pants",
  SHOES: "Safety Shoes",
  CAPS: "Caps",
};

// ── Stock queries ──────────────────────────────────────────────────────────

export async function getUniformStock(companyId: string) {
  const items = await prisma.uniformStockItem.findMany({
    where: { companyId },
    orderBy: [{ category: "asc" }, { location: "asc" }, { size: "asc" }, { color: "asc" }],
  });
  return items;
}

export async function getUniformStats(companyId: string) {
  const items = await prisma.uniformStockItem.findMany({
    where: { companyId },
    select: { category: true, qty: true, minStock: true },
  }) as { category: string; qty: number; minStock: number }[];

  const totalItems = items.reduce((s: number, i: { qty: number }) => s + i.qty, 0);
  const lowStock = items.filter((i: { qty: number; minStock: number }) => i.qty < i.minStock).length;
  const outOfStock = items.filter((i: { qty: number }) => i.qty === 0).length;
  const skuCount = items.length;

  return { totalItems, lowStock, outOfStock, skuCount };
}

export async function upsertStockItem(
  companyId: string,
  data: { category: string; size: string; color: string; location: string; qty: number; minStock: number }
) {
  return prisma.uniformStockItem.upsert({
    where: {
      companyId_category_size_color_location: {
        companyId,
        category: data.category,
        size: data.size,
        color: data.color,
        location: data.location,
      },
    },
    update: { qty: data.qty, minStock: data.minStock },
    create: { companyId, ...data },
  });
}

export async function updateStockQty(id: string, companyId: string, qty: number) {
  const item = await prisma.uniformStockItem.findFirst({ where: { id, companyId } });
  if (!item) throw new Error("Stock item not found");
  return prisma.uniformStockItem.update({ where: { id }, data: { qty } });
}

export async function deleteStockItem(id: string, companyId: string) {
  const item = await prisma.uniformStockItem.findFirst({ where: { id, companyId } });
  if (!item) throw new Error("Stock item not found");
  return prisma.uniformStockItem.delete({ where: { id } });
}

// ── Issuance queries ───────────────────────────────────────────────────────

export async function getIssuances(companyId: string, filters?: { employeeId?: string; category?: string }) {
  return prisma.uniformIssuance.findMany({
    where: {
      companyId,
      ...(filters?.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters?.category ? { category: filters.category } : {}),
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
    },
    orderBy: { issuedAt: "desc" },
    take: 200,
  });
}

export async function createIssuance(
  companyId: string,
  data: {
    employeeId: string;
    category: string;
    size: string;
    color: string;
    location: string;
    qty: number;
    notes?: string;
    issuedBy?: string;
  }
) {
  const stock = await prisma.uniformStockItem.findFirst({
    where: { companyId, category: data.category, size: data.size, color: data.color, location: data.location },
  });
  if (!stock) throw new Error("Stock item not found");
  if (stock.qty < data.qty) throw new Error(`Insufficient stock (available: ${stock.qty})`);

  const [issuance] = await Promise.all([
    prisma.uniformIssuance.create({
      data: { companyId, ...data },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      },
    }),
    prisma.uniformStockItem.update({
      where: { id: stock.id },
      data: { qty: stock.qty - data.qty },
    }),
  ]);
  return issuance;
}

export async function returnIssuance(id: string, companyId: string, returnNotes?: string) {
  const issuance = await prisma.uniformIssuance.findFirst({
    where: { id, companyId, returnedAt: null },
  });
  if (!issuance) throw new Error("Active issuance not found");

  // Restore stock
  const stock = await prisma.uniformStockItem.findFirst({
    where: {
      companyId,
      category: issuance.category,
      size: issuance.size,
      color: issuance.color,
      location: issuance.location,
    },
  });

  await Promise.all([
    prisma.uniformIssuance.update({
      where: { id },
      data: { returnedAt: new Date(), returnNotes: returnNotes ?? null },
    }),
    stock
      ? prisma.uniformStockItem.update({
          where: { id: stock.id },
          data: { qty: stock.qty + issuance.qty },
        })
      : Promise.resolve(),
  ]);
}
