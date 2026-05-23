import "server-only";
import { prisma } from "@/lib/prisma";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SyncResult = {
  upserted: number;
  unchanged: number;
  errors: string[];
  preview: SyncPreviewRow[];
};

export type SyncPreviewRow = {
  category: string;
  size: string;
  color: string;
  location: string;
  oldQty: number | null;
  newQty: number;
  minStock: number;
  changed: boolean;
};

type StockRow = {
  category: string;
  size: string;
  color: string;
  location: string;
  qty: number;
  minStock: number;
};

// ── Parser — understands the exact 5-sheet master format ──────────────────────

function num(v: unknown): number {
  if (v === "" || v === null || v === undefined) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function parseTShirts(rows: unknown[][], location: string): StockRow[] {
  const COLORS = ["Red", "White", "Blue", "Grey"];
  const result: StockRow[] = [];
  for (const row of rows) {
    const size = String((row as unknown[])[0] ?? "").trim();
    if (!size || size === "Size" || size.toUpperCase() === "TOTAL" || size.toUpperCase().startsWith("GULFA")) continue;
    for (let ci = 0; ci < COLORS.length; ci++) {
      result.push({
        category: "TSHIRT",
        size,
        color: COLORS[ci],
        location,
        qty: num((row as unknown[])[ci + 1]),
        minStock: num((row as unknown[])[6]) || 3,
      });
    }
  }
  return result;
}

function parsePants(rows: unknown[][], location: string): StockRow[] {
  const result: StockRow[] = [];
  let active = false;
  for (const row of rows) {
    const c0 = String((row as unknown[])[0] ?? "").trim();
    if (c0.toUpperCase().includes("PANTS STOCK")) { active = true; continue; }
    if (c0.toUpperCase().includes("SHOES STOCK") || c0.toUpperCase() === "CAPS") { active = false; continue; }
    if (!active || c0 === "Size" || c0.toUpperCase() === "TOTAL" || !c0) continue;
    result.push({ category: "PANTS", size: c0, color: "", location, qty: num((row as unknown[])[1]), minStock: num((row as unknown[])[2]) || 5 });
  }
  return result;
}

function parseShoes(rows: unknown[][], location: string): StockRow[] {
  const result: StockRow[] = [];
  let active = false;
  for (const row of rows) {
    const c0 = String((row as unknown[])[0] ?? "").trim();
    if (c0.toUpperCase().includes("SHOES STOCK")) { active = true; continue; }
    if (c0.toUpperCase() === "CAPS") { active = false; continue; }
    if (!active || c0 === "Shoe Size" || c0.toUpperCase() === "TOTAL" || !c0) continue;
    result.push({ category: "SHOES", size: c0, color: "", location, qty: num((row as unknown[])[1]), minStock: num((row as unknown[])[2]) || 3 });
  }
  return result;
}

function parseCaps(rows: unknown[][], location: string): StockRow[] {
  let active = false;
  for (const row of rows) {
    const c0 = String((row as unknown[])[0] ?? "").trim();
    if (c0.toUpperCase() === "CAPS") { active = true; continue; }
    if (active && c0.toLowerCase() === "cap") {
      return [{ category: "CAPS", size: "ONE SIZE", color: "", location, qty: num((row as unknown[])[1]), minStock: num((row as unknown[])[2]) || 10 }];
    }
  }
  return [];
}

export function parseSheets(sheets: Record<string, unknown[][]>): { rows: StockRow[]; warnings: string[] } {
  const rows: StockRow[] = [];
  const warnings: string[] = [];

  const SHEET_LOCATION: Record<string, string> = {
    "T-Shirts-DIP": "DIP",
    "Pants & Shoes-DIP": "DIP",
    "T-Shirts-Ajman": "Ajman",
    "Pants & Shoes-Ajman": "Ajman",
  };

  let hasTshirtDIP = false, hasTshirtAjman = false, hasPantsDIP = false, hasPantsAjman = false;

  for (const [sheetName, sheetRows] of Object.entries(sheets)) {
    if (sheetName === "Total Stocks") continue; // calculated sheet — skip

    const loc = SHEET_LOCATION[sheetName];
    if (!loc) { warnings.push(`Unknown sheet "${sheetName}" — skipped`); continue; }

    if (sheetName.startsWith("T-Shirts")) {
      const parsed = parseTShirts(sheetRows, loc);
      rows.push(...parsed);
      if (loc === "DIP") hasTshirtDIP = true;
      else hasTshirtAjman = true;
    } else {
      const pants = parsePants(sheetRows, loc);
      const shoes = parseShoes(sheetRows, loc);
      const caps = parseCaps(sheetRows, loc);
      rows.push(...pants, ...shoes, ...caps);
      if (loc === "DIP") hasPantsDIP = true;
      else hasPantsAjman = true;
    }
  }

  if (!hasTshirtDIP) warnings.push("T-Shirts-DIP sheet not found — that location skipped");
  if (!hasTshirtAjman) warnings.push("T-Shirts-Ajman sheet not found — that location skipped");
  if (!hasPantsDIP) warnings.push("Pants & Shoes-DIP sheet not found — that location skipped");
  if (!hasPantsAjman) warnings.push("Pants & Shoes-Ajman sheet not found — that location skipped");

  return { rows, warnings };
}

// ── Preview (dry run) — no DB writes ─────────────────────────────────────────

export async function previewSync(companyId: string, sheets: Record<string, unknown[][]>): Promise<{ preview: SyncPreviewRow[]; warnings: string[]; parseCount: number }> {
  const { rows, warnings } = parseSheets(sheets);

  const existing = await prisma.uniformStockItem.findMany({ where: { companyId } });
  const existingMap = new Map(existing.map((e) => [`${e.category}|${e.size}|${e.color}|${e.location}`, e]));

  const preview: SyncPreviewRow[] = rows.map((r) => {
    const key = `${r.category}|${r.size}|${r.color}|${r.location}`;
    const ex = existingMap.get(key);
    return {
      category: r.category,
      size: r.size,
      color: r.color,
      location: r.location,
      oldQty: ex?.qty ?? null,
      newQty: r.qty,
      minStock: r.minStock,
      changed: ex == null || ex.qty !== r.qty || ex.minStock !== r.minStock,
    };
  });

  return { preview, warnings, parseCount: rows.length };
}

// ── Sync (live write) ─────────────────────────────────────────────────────────

export async function syncFromMasterFile(companyId: string, sheets: Record<string, unknown[][]>): Promise<SyncResult> {
  const { rows, warnings } = parseSheets(sheets);
  const errors: string[] = [...warnings];

  const existing = await prisma.uniformStockItem.findMany({ where: { companyId } });
  const existingMap = new Map(existing.map((e) => [`${e.category}|${e.size}|${e.color}|${e.location}`, e]));

  let upserted = 0;
  let unchanged = 0;
  const preview: SyncPreviewRow[] = [];

  for (const r of rows) {
    const key = `${r.category}|${r.size}|${r.color}|${r.location}`;
    const ex = existingMap.get(key);
    const changed = ex == null || ex.qty !== r.qty || ex.minStock !== r.minStock;

    preview.push({ category: r.category, size: r.size, color: r.color, location: r.location, oldQty: ex?.qty ?? null, newQty: r.qty, minStock: r.minStock, changed });

    if (!changed) { unchanged++; continue; }

    try {
      await prisma.uniformStockItem.upsert({
        where: { companyId_category_size_color_location: { companyId, category: r.category, size: r.size, color: r.color, location: r.location } },
        update: { qty: r.qty, minStock: r.minStock },
        create: { companyId, category: r.category, size: r.size, color: r.color, location: r.location, qty: r.qty, minStock: r.minStock },
      });
      upserted++;
    } catch (e) {
      errors.push(`${key}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  return { upserted, unchanged, errors, preview };
}
