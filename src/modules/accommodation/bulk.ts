import "server-only";
import { prisma } from "@/lib/prisma";

export type BulkOp = {
  action: "ASSIGN" | "VACATE" | "MOVE";
  employeeId: string;       // EMP-XXXX display id
  propertyName?: string;    // target property name (for ASSIGN / MOVE)
  roomNumber?: string;      // target room number  (for ASSIGN / MOVE)
  monthlyRent?: number;
  notes?: string;
};

export type BulkResult = {
  row: number;
  action: string;
  employeeId: string;
  status: "ok" | "error";
  message?: string;
};

export async function bulkAccommodationOps(
  companyId: string,
  rawRows: unknown[],
  userId: string
): Promise<{ results: BulkResult[]; succeeded: number; failed: number }> {
  const results: BulkResult[] = [];
  let succeeded = 0;
  let failed = 0;

  // Pre-load employees in this company by their display employeeId
  const employees = await prisma.employee.findMany({
    where: { companyId, deletedAt: null },
    select: { id: true, employeeId: true, firstName: true, lastName: true },
  });
  const empByDisplay = new Map(employees.map((e) => [e.employeeId.toUpperCase(), e]));

  // Pre-load accommodations and rooms
  const accommodations = await prisma.accommodation.findMany({
    where: { companyId },
    include: { rooms: { where: { isActive: true } } },
  });
  // Index: "property name + room number" → roomId
  const roomIndex = new Map<string, string>();
  for (const acc of accommodations) {
    for (const room of acc.rooms) {
      roomIndex.set(`${acc.name.toLowerCase()}|${room.roomNumber.toLowerCase()}`, room.id);
    }
  }

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i] as Record<string, unknown>;
    const action = String(raw.Action ?? raw.action ?? "").toUpperCase().trim() as BulkOp["action"];
    const empDisplay = String(raw["Employee ID"] ?? raw.employeeId ?? "").toUpperCase().trim();
    const propertyName = String(raw["Property Name"] ?? raw.propertyName ?? "").trim();
    const roomNumber = String(raw["Room Number"] ?? raw.roomNumber ?? "").trim();
    const monthlyRent = raw["Monthly Rent (AED)"] ? Number(raw["Monthly Rent (AED)"]) : undefined;
    const notes = String(raw.Notes ?? raw.notes ?? "").trim() || undefined;

    const rowNum = i + 2; // 1-based + header

    if (!action || !["ASSIGN", "VACATE", "MOVE"].includes(action)) {
      results.push({ row: rowNum, action: action || "?", employeeId: empDisplay, status: "error", message: "Invalid action — must be ASSIGN, VACATE, or MOVE" });
      failed++;
      continue;
    }

    if (!empDisplay) {
      results.push({ row: rowNum, action, employeeId: "—", status: "error", message: "Employee ID is required" });
      failed++;
      continue;
    }

    const employee = empByDisplay.get(empDisplay);
    if (!employee) {
      results.push({ row: rowNum, action, employeeId: empDisplay, status: "error", message: `Employee "${empDisplay}" not found` });
      failed++;
      continue;
    }

    try {
      if (action === "VACATE") {
        const assignment = await prisma.accommodationAssignment.findFirst({
          where: { employeeId: employee.id, vacatedAt: null },
        });
        if (!assignment) throw new Error("No active accommodation assignment found");
        await prisma.accommodationAssignment.update({
          where: { id: assignment.id },
          data: { vacatedAt: new Date(), vacateNotes: notes ?? null },
        });
        results.push({ row: rowNum, action, employeeId: empDisplay, status: "ok" });
        succeeded++;
        continue;
      }

      // ASSIGN or MOVE — need property + room
      if (!propertyName || !roomNumber) {
        throw new Error("Property Name and Room Number are required for ASSIGN/MOVE");
      }

      const roomKey = `${propertyName.toLowerCase()}|${roomNumber.toLowerCase()}`;
      const roomId = roomIndex.get(roomKey);
      if (!roomId) {
        throw new Error(`Room "${roomNumber}" in property "${propertyName}" not found`);
      }

      // Check room capacity
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { assignments: { where: { vacatedAt: null } } },
      });
      if (!room) throw new Error("Room not found");

      if (action === "MOVE") {
        // Vacate current first
        const current = await prisma.accommodationAssignment.findFirst({
          where: { employeeId: employee.id, vacatedAt: null },
        });
        if (current) {
          await prisma.accommodationAssignment.update({
            where: { id: current.id },
            data: { vacatedAt: new Date(), vacateNotes: notes ? `Moved: ${notes}` : "Moved via bulk import" },
          });
        }
      } else {
        // ASSIGN — check not already assigned
        const existing = await prisma.accommodationAssignment.findFirst({
          where: { employeeId: employee.id, vacatedAt: null },
        });
        if (existing) throw new Error("Employee already has an active assignment. Use MOVE to transfer.");
      }

      if (room.assignments.length >= room.capacity) {
        throw new Error(`Room is at full capacity (${room.capacity})`);
      }

      await prisma.accommodationAssignment.create({
        data: {
          employeeId: employee.id,
          roomId,
          monthlyRent: monthlyRent ?? null,
          notes: notes ?? null,
          assignedBy: userId,
        },
      });

      results.push({ row: rowNum, action, employeeId: empDisplay, status: "ok" });
      succeeded++;
    } catch (e) {
      results.push({ row: rowNum, action, employeeId: empDisplay, status: "error", message: e instanceof Error ? e.message : "Unknown error" });
      failed++;
    }
  }

  return { results, succeeded, failed };
}
