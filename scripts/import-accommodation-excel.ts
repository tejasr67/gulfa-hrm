/**
 * One-time import: reads "Gulfa_Accommodation_Tracker (1).xlsx" and seeds the DB.
 * Creates 5 Accommodation properties, their rooms, and assigns employees.
 *
 * Usage:  npx tsx --env-file=.env scripts/import-accommodation-excel.ts
 *
 * Safe to re-run — skips properties/rooms that already exist.
 * Employee matching: by numeric EMP ID → by full name fallback.
 */

import * as path from "path";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const EXCEL_PATH = path.resolve(
  process.env.EXCEL_PATH ??
    "C:/Users/tejas/Downloads/Gulfa_Accommodation_Tracker (1).xlsx"
);

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

// ── Property metadata ─────────────────────────────────────────────────────────

const PROPERTY_META: Record<string, { name: string; city: string; type: string; address: string }> = {
  Ajman: { name: "Ajman Accommodation", city: "Ajman", type: "LABOR_CAMP", address: "Ajman, UAE" },
  "Dubai 103": { name: "Dubai 103", city: "Dubai", type: "APARTMENT", address: "Building 103, Dubai, UAE" },
  "Dubai 302": { name: "Dubai 302", city: "Dubai", type: "APARTMENT", address: "Building 302, Dubai, UAE" },
  "Dubai G-4": { name: "Dubai G-4", city: "Dubai", type: "APARTMENT", address: "Building G-4, Dubai, UAE" },
  Factory: { name: "Factory Accommodation", city: "Ajman", type: "LABOR_CAMP", address: "Factory, Ajman, UAE" },
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface BedEntry {
  room: string;
  bedNo: number;
  empName: string;
  empId: number;
  notes: string;
}

interface RoomData {
  roomNumber: string;
  capacity: number;
  beds: BedEntry[];
}

// ── Parser ────────────────────────────────────────────────────────────────────

function parseSheet(data: unknown[][]): RoomData[] {
  const rooms: RoomData[] = [];
  let currentRoom: RoomData | null = null;
  let expectCapacity = false;
  let inEmployeeRows = false;

  for (const row of data) {
    const col0 = String(row[0] ?? "").trim();

    // Room section header: "ROOM 1", "ROOM C2-R1", etc.
    if (col0.match(/^ROOM\s+\S/i) && !row[1] && !row[2]) {
      const roomNumber = col0.replace(/^ROOM\s+/i, "Room ").trim();
      currentRoom = { roomNumber, capacity: 1, beds: [] };
      rooms.push(currentRoom);
      expectCapacity = false;
      inEmployeeRows = false;
      continue;
    }

    // "Total Beds" row — next numeric row has the capacity
    if (col0 === "Total Beds") {
      expectCapacity = true;
      inEmployeeRows = false;
      continue;
    }

    // Capacity value row: [number, "", occupied_count, "", available_count]
    if (expectCapacity && typeof row[0] === "number" && currentRoom) {
      currentRoom.capacity = row[0] as number;
      expectCapacity = false;
      continue;
    }

    // Column header row: "Room", "Bed No.", "Employee Name", ...
    if (col0 === "Room" && String(row[2] ?? "").trim() === "Employee Name") {
      inEmployeeRows = true;
      continue;
    }

    // Employee data rows
    if (inEmployeeRows && currentRoom && col0.toLowerCase().startsWith("room")) {
      const empName = String(row[2] ?? "").trim();
      const empId = typeof row[3] === "number" ? row[3] : Number(row[3]) || 0;
      const status = String(row[5] ?? "").trim();
      const notes = String(row[6] ?? "").trim() || String(row[7] ?? "").trim();

      if (status.toLowerCase() === "occupied" && empName) {
        currentRoom.beds.push({
          room: col0.trim(),
          bedNo: typeof row[1] === "number" ? row[1] : Number(row[1]) || 0,
          empName,
          empId,
          notes,
        });
      }
    }
  }

  return rooms;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Reading Excel:", EXCEL_PATH);
  const wb = XLSX.readFile(EXCEL_PATH);

  const company = await prisma.company.findFirst();
  if (!company) throw new Error("No company found — run seeds first");
  console.log("Company:", company.name, "(", company.id, ")");

  // Build employee lookup maps: numeric id → cuid, and "firstname lastname" → cuid
  const allEmployees = await prisma.employee.findMany({
    where: { companyId: company.id, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, employeeId: true },
  });

  // employeeId format: "EMP-0130" → numeric "130" → index key 130
  const byNumericId = new Map<number, string>();
  for (const e of allEmployees) {
    const match = e.employeeId.match(/(\d+)$/);
    if (match) byNumericId.set(Number(match[1]), e.id);
  }

  const byName = new Map<string, string>();
  for (const e of allEmployees) {
    const key = `${e.firstName} ${e.lastName}`.toLowerCase().trim();
    byName.set(key, e.id);
    // Also index first name alone for single-name employees
    byName.set(e.firstName.toLowerCase().trim(), e.id);
  }

  function findEmployee(empId: number, empName: string): string | null {
    // Try numeric ID
    const byId = byNumericId.get(empId);
    if (byId) return byId;

    // Try full name
    const normalised = empName.toLowerCase().trim();
    if (byName.has(normalised)) return byName.get(normalised)!;

    // Try just first word of Excel name against firstName
    const firstWord = normalised.split(/\s+/)[0];
    if (byName.has(firstWord)) return byName.get(firstWord)!;

    return null;
  }

  let totalAssigned = 0, totalSkipped = 0, totalNotFound = 0;
  const notFound: string[] = [];

  for (const sheetName of Object.keys(PROPERTY_META)) {
    if (!wb.SheetNames.includes(sheetName)) {
      console.log(`\nSheet "${sheetName}" not found — skipping`);
      continue;
    }

    const meta = PROPERTY_META[sheetName];
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
    const rooms = parseSheet(data);

    console.log(`\n=== ${meta.name} === (${rooms.length} rooms)`);

    // Create or find Accommodation
    let acc = await prisma.accommodation.findFirst({
      where: { companyId: company.id, name: meta.name },
    });
    if (!acc) {
      const totalCapacity = rooms.reduce((s, r) => s + r.capacity, 0);
      acc = await prisma.accommodation.create({
        data: {
          companyId: company.id,
          name: meta.name,
          address: meta.address,
          city: meta.city,
          capacity: totalCapacity,
          type: meta.type as "APARTMENT" | "VILLA" | "LABOR_CAMP" | "HOTEL",
          amenities: [],
        },
      });
      console.log(`  Created property: ${acc.name}`);
    } else {
      console.log(`  Found existing property: ${acc.name}`);
    }

    for (const roomData of rooms) {
      // Create or find Room
      let room = await prisma.room.findFirst({
        where: { accommodationId: acc.id, roomNumber: roomData.roomNumber },
      });
      if (!room) {
        room = await prisma.room.create({
          data: {
            accommodationId: acc.id,
            roomNumber: roomData.roomNumber,
            capacity: roomData.capacity,
          },
        });
      } else {
        // Update capacity if changed
        if (room.capacity !== roomData.capacity) {
          room = await prisma.room.update({
            where: { id: room.id },
            data: { capacity: roomData.capacity },
          });
        }
      }

      // Assign employees
      for (const bed of roomData.beds) {
        const employeeDbId = findEmployee(bed.empId, bed.empName);
        if (!employeeDbId) {
          totalNotFound++;
          notFound.push(`${bed.empName} (ID:${bed.empId}) in ${sheetName}/${roomData.roomNumber}`);
          continue;
        }

        // Check for existing active assignment
        const existing = await prisma.accommodationAssignment.findFirst({
          where: { employeeId: employeeDbId, vacatedAt: null },
        });
        if (existing) {
          totalSkipped++;
          continue;
        }

        await prisma.accommodationAssignment.create({
          data: {
            employeeId: employeeDbId,
            roomId: room.id,
            notes: bed.notes || null,
            assignedBy: "import-script",
          },
        });
        totalAssigned++;
        process.stdout.write(".");
      }
    }
    console.log("");
  }

  console.log("\n────────────────────────────────");
  console.log(`Assigned : ${totalAssigned}`);
  console.log(`Skipped  : ${totalSkipped} (already assigned)`);
  console.log(`Not found: ${totalNotFound}`);
  if (notFound.length > 0) {
    console.log("\nEmployees not found:");
    notFound.forEach((n) => console.log(" -", n));
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
