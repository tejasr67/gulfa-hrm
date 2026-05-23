import "server-only";
import { prisma } from "@/lib/prisma";
import { upsertStockItem } from "./queries";

export type BulkStockRow = {
  action: "SET" | "ADD" | "SUBTRACT";
  category: string;
  size: string;
  color?: string;
  location: string;
  qty: number;
  minStock?: number;
};

export type BulkResult = {
  row: number;
  status: "ok" | "error";
  message?: string;
  key?: string;
};

export async function bulkUpdateStock(
  companyId: string,
  rawRows: unknown[]
): Promise<{ results: BulkResult[]; succeeded: number; failed: number }> {
  const results: BulkResult[] = [];
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i] as Record<string, unknown>;
    const rowNum = i + 2;

    try {
      const action = String(raw["Action"] ?? raw["action"] ?? "SET").toUpperCase().trim();
      const category = String(raw["Category"] ?? raw["category"] ?? "").toUpperCase().trim();
      const size = String(raw["Size"] ?? raw["size"] ?? "").trim();
      const color = String(raw["Color"] ?? raw["color"] ?? "").trim();
      const location = String(raw["Location"] ?? raw["location"] ?? "").trim();
      const qty = Number(raw["Qty"] ?? raw["qty"] ?? raw["Quantity"] ?? 0);
      const minStock = raw["Min Stock"] !== undefined ? Number(raw["Min Stock"]) : undefined;

      if (!category) throw new Error("Category is required");
      if (!size) throw new Error("Size is required");
      if (!location) throw new Error("Location is required");
      if (isNaN(qty)) throw new Error("Qty must be a number");

      if (!["SET", "ADD", "SUBTRACT"].includes(action)) throw new Error("Action must be SET, ADD, or SUBTRACT");

      const key = `${category}|${size}|${color}|${location}`;

      if (action === "SET") {
        await upsertStockItem(companyId, {
          category,
          size,
          color,
          location,
          qty,
          minStock: minStock ?? 5,
        });
      } else {
        // ADD or SUBTRACT — need existing item
        const existing = await prisma.uniformStockItem.findFirst({
          where: { companyId, category, size, color, location },
        });
        if (!existing) throw new Error(`Stock item not found: ${key}`);
        const newQty = action === "ADD" ? existing.qty + qty : Math.max(0, existing.qty - qty);
        await prisma.uniformStockItem.update({
          where: { id: existing.id },
          data: { qty: newQty, ...(minStock !== undefined ? { minStock } : {}) },
        });
      }

      results.push({ row: rowNum, status: "ok", key });
      succeeded++;
    } catch (e) {
      results.push({ row: rowNum, status: "error", message: e instanceof Error ? e.message : "Unknown error" });
      failed++;
    }
  }

  return { results, succeeded, failed };
}
