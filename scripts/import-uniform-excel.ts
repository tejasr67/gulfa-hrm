/**
 * One-time import: reads "Gulfa Uniform_Stock_Tracker (1).xlsx" and seeds UniformStockItem rows.
 * Usage: npx tsx --env-file=.env scripts/import-uniform-excel.ts
 * Safe to re-run — upserts by (companyId, category, size, color, location).
 */

import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const EXCEL_PATH =
  process.env.EXCEL_PATH ??
  "C:/Users/tejas/Downloads/Gulfa Uniform_Stock_Tracker (1).xlsx";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

type StockRow = {
  category: string;
  size: string;
  color: string; // "" for non-colour items
  location: string;
  qty: number;
  minStock: number;
};

function num(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function parseTShirts(data: unknown[][], location: string): StockRow[] {
  const rows: StockRow[] = [];
  const COLORS = ["Red", "White", "Blue", "Grey"];
  for (const row of data) {
    const size = String(row[0] ?? "").trim();
    if (!size || size === "Size" || size.toUpperCase() === "TOTAL" || size.toUpperCase().startsWith("GULFA")) continue;
    for (let ci = 0; ci < COLORS.length; ci++) {
      rows.push({
        category: "TSHIRT",
        size,
        color: COLORS[ci],
        location,
        qty: num(row[ci + 1]),
        minStock: num(row[6]) || 3,
      });

    }
  }
  return rows;
}

function parsePants(data: unknown[][], location: string): StockRow[] {
  const rows: StockRow[] = [];
  let inPants = false;
  for (const row of data) {
    const col0 = String(row[0] ?? "").trim();
    if (col0.toUpperCase().includes("PANTS STOCK TRACKER")) { inPants = true; continue; }
    if (col0.toUpperCase().includes("SHOES STOCK TRACKER") || col0.toUpperCase().includes("CAPS")) { inPants = false; continue; }
    if (!inPants) continue;
    if (col0 === "Size" || col0.toUpperCase() === "TOTAL") continue;
    const size = col0;
    const qty = num(row[1]);
    const minStock = num(row[2]) || 5;
    if (!size) continue;
    rows.push({ category: "PANTS", size, color: "", location, qty, minStock });
  }
  return rows;
}

function parseShoes(data: unknown[][], location: string): StockRow[] {
  const rows: StockRow[] = [];
  let inShoes = false;
  for (const row of data) {
    const col0 = String(row[0] ?? "").trim();
    if (col0.toUpperCase().includes("SHOES STOCK TRACKER")) { inShoes = true; continue; }
    if (col0.toUpperCase().includes("CAPS")) { inShoes = false; continue; }
    if (!inShoes) continue;
    if (col0 === "Shoe Size" || col0.toUpperCase() === "TOTAL") continue;
    const size = col0;
    const qty = num(row[1]);
    const minStock = num(row[2]) || 3;
    if (!size) continue;
    rows.push({ category: "SHOES", size, color: "", location, qty, minStock });
  }
  return rows;
}

function parseCaps(data: unknown[][], location: string): StockRow[] {
  const rows: StockRow[] = [];
  let inCaps = false;
  for (const row of data) {
    const col0 = String(row[0] ?? "").trim();
    if (col0.toUpperCase() === "CAPS") { inCaps = true; continue; }
    if (!inCaps) continue;
    if (col0.toLowerCase() === "cap" || col0 === "Cap") {
      rows.push({ category: "CAPS", size: "ONE SIZE", color: "", location, qty: num(row[1]), minStock: num(row[2]) || 10 });
    }
  }
  return rows;
}

async function main() {
  console.log("Reading:", EXCEL_PATH);
  const wb = XLSX.readFile(EXCEL_PATH);

  const company = await prisma.company.findFirst();
  if (!company) throw new Error("No company found");
  console.log("Company:", company.name);

  const allRows: StockRow[] = [];

  // DIP sheets
  const tshirtDIP = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets["T-Shirts-DIP"], { header: 1, defval: "" });
  const pantsDIP = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets["Pants & Shoes-DIP"], { header: 1, defval: "" });
  allRows.push(...parseTShirts(tshirtDIP, "DIP"));
  allRows.push(...parsePants(pantsDIP, "DIP"));
  allRows.push(...parseShoes(pantsDIP, "DIP"));
  allRows.push(...parseCaps(pantsDIP, "DIP"));

  // Ajman sheets
  const tshirtAjman = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets["T-Shirts-Ajman"], { header: 1, defval: "" });
  const pantsAjman = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets["Pants & Shoes-Ajman"], { header: 1, defval: "" });
  allRows.push(...parseTShirts(tshirtAjman, "Ajman"));
  allRows.push(...parsePants(pantsAjman, "Ajman"));
  allRows.push(...parseShoes(pantsAjman, "Ajman"));
  allRows.push(...parseCaps(pantsAjman, "Ajman"));

  console.log(`Parsed ${allRows.length} stock items`);

  let upserted = 0;
  for (const r of allRows) {
    await (prisma.uniformStockItem as any).upsert({
      where: {
        companyId_category_size_color_location: {
          companyId: company.id,
          category: r.category,
          size: r.size,
          color: r.color,
          location: r.location,
        },
      },
      update: { qty: r.qty, minStock: r.minStock },
      create: {
        companyId: company.id,
        category: r.category,
        size: r.size,
        color: r.color,
        location: r.location,
        qty: r.qty,
        minStock: r.minStock,
      },
    });
    upserted++;
    process.stdout.write(".");
  }

  console.log(`\nUpserted: ${upserted}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
