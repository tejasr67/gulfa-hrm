import "server-only";
import { prisma } from "@/lib/prisma";
import type {
  CreateAccommodationInput,
  UpdateAccommodationInput,
  CreateRoomInput,
  AssignRoomInput,
  VacateRoomInput,
} from "./schema";

// ── Stats ──────────────────────────────────────────────────────────────────

export async function getAccommodationStats(companyId: string) {
  const accommodations = await prisma.accommodation.findMany({
    where: { companyId, isActive: true },
    include: {
      rooms: {
        where: { isActive: true },
        include: { assignments: { where: { vacatedAt: null } } },
      },
    },
  });

  let totalCapacity = 0, occupied = 0, rooms = 0;
  for (const a of accommodations) {
    totalCapacity += a.capacity;
    rooms += a.rooms.length;
    for (const r of a.rooms) occupied += r.assignments.length;
  }

  const unassigned = await prisma.employee.count({
    where: {
      companyId,
      deletedAt: null,
      status: "ACTIVE",
      accommodationAssignments: { none: { vacatedAt: null } },
    },
  });

  return {
    properties: accommodations.length,
    rooms,
    totalCapacity,
    occupied,
    available: rooms - occupied,
    unassigned,
  };
}

export type AccommodationStats = Awaited<ReturnType<typeof getAccommodationStats>>;

// ── Accommodation CRUD ─────────────────────────────────────────────────────

export async function getAccommodations(companyId: string) {
  return prisma.accommodation.findMany({
    where: { companyId },
    include: {
      rooms: {
        where: { isActive: true },
        include: {
          assignments: {
            where: { vacatedAt: null },
            include: {
              employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
            },
          },
          _count: { select: { assignments: true } },
        },
        orderBy: { roomNumber: "asc" },
      },
      _count: { select: { rooms: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export type AccommodationListEntry = Awaited<ReturnType<typeof getAccommodations>>[number];

export async function getAccommodation(id: string, companyId: string) {
  return prisma.accommodation.findFirst({
    where: { id, companyId },
    include: {
      rooms: {
        where: { isActive: true },
        include: {
          assignments: {
            include: {
              employee: {
                select: {
                  id: true, firstName: true, lastName: true, employeeId: true,
                  department: { select: { name: true } },
                  position: { select: { title: true } },
                },
              },
            },
            orderBy: { assignedAt: "desc" },
          },
        },
        orderBy: { roomNumber: "asc" },
      },
    },
  });
}

export type AccommodationDetail = Awaited<ReturnType<typeof getAccommodation>>;

export async function createAccommodation(companyId: string, data: CreateAccommodationInput) {
  return prisma.accommodation.create({
    data: {
      companyId,
      name: data.name,
      address: data.address,
      city: data.city,
      capacity: data.capacity,
      type: data.type as "APARTMENT" | "VILLA" | "LABOR_CAMP" | "HOTEL",
      amenities: data.amenities ?? [],
    },
  });
}

export async function updateAccommodation(id: string, companyId: string, data: UpdateAccommodationInput) {
  const acc = await prisma.accommodation.findFirst({ where: { id, companyId } });
  if (!acc) throw new Error("Accommodation not found");
  return prisma.accommodation.update({ where: { id }, data });
}

// ── Room CRUD ──────────────────────────────────────────────────────────────

export async function createRoom(companyId: string, data: CreateRoomInput) {
  const acc = await prisma.accommodation.findFirst({ where: { id: data.accommodationId, companyId } });
  if (!acc) throw new Error("Accommodation not found");
  return prisma.room.create({
    data: {
      accommodationId: data.accommodationId,
      roomNumber: data.roomNumber,
      floor: data.floor,
      capacity: data.capacity ?? 1,
    },
  });
}

// ── Assignment ─────────────────────────────────────────────────────────────

export async function assignRoom(companyId: string, data: AssignRoomInput, assignedBy: string) {
  const room = await prisma.room.findFirst({
    where: { id: data.roomId, accommodation: { companyId } },
    include: { assignments: { where: { vacatedAt: null } } },
  });
  if (!room) throw new Error("Room not found");
  if (!room.isActive) throw new Error("Room is inactive");

  const currentOccupants = room.assignments.length;
  if (currentOccupants >= room.capacity) throw new Error(`Room is at full capacity (${room.capacity})`);

  const employee = await prisma.employee.findFirst({ where: { id: data.employeeId, companyId, deletedAt: null } });
  if (!employee) throw new Error("Employee not found");

  const existing = await prisma.accommodationAssignment.findFirst({
    where: { employeeId: data.employeeId, vacatedAt: null },
  });
  if (existing) throw new Error("Employee already has an active accommodation assignment. Vacate it first.");

  return prisma.accommodationAssignment.create({
    data: {
      employeeId: data.employeeId,
      roomId: data.roomId,
      monthlyRent: data.monthlyRent,
      notes: data.notes,
      assignedBy,
    },
  });
}

export async function vacateRoom(companyId: string, data: VacateRoomInput) {
  const assignment = await prisma.accommodationAssignment.findFirst({
    where: {
      id: data.assignmentId,
      vacatedAt: null,
      room: { accommodation: { companyId } },
    },
  });
  if (!assignment) throw new Error("Active assignment not found");

  return prisma.accommodationAssignment.update({
    where: { id: data.assignmentId },
    data: {
      vacatedAt: data.vacatedAt ? new Date(data.vacatedAt) : new Date(),
      vacateNotes: data.vacateNotes ?? null,
    },
  });
}

// ── Reports ────────────────────────────────────────────────────────────────

export async function getOccupancyReport(companyId: string) {
  const accommodations = await prisma.accommodation.findMany({
    where: { companyId },
    include: {
      rooms: {
        include: {
          assignments: {
            include: {
              employee: {
                select: { id: true, firstName: true, lastName: true, employeeId: true, department: { select: { name: true } } },
              },
            },
            orderBy: { assignedAt: "desc" },
          },
        },
        orderBy: { roomNumber: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return accommodations.map((acc) => {
    const activeRooms = acc.rooms.filter((r) => r.isActive);
    const totalCapacity = activeRooms.reduce((s, r) => s + r.capacity, 0);
    const occupied = activeRooms.reduce((s, r) => s + r.assignments.filter((a) => !a.vacatedAt).length, 0);
    const totalAssignments = acc.rooms.reduce((s, r) => s + r.assignments.length, 0);
    return {
      id: acc.id,
      name: acc.name,
      type: acc.type,
      address: acc.address,
      city: acc.city,
      isActive: acc.isActive,
      rooms: activeRooms.length,
      totalCapacity,
      occupied,
      available: totalCapacity - occupied,
      utilization: totalCapacity > 0 ? Math.round((occupied / totalCapacity) * 100) : 0,
      totalHistoricalAssignments: totalAssignments,
      roomDetails: activeRooms.map((r) => ({
        id: r.id,
        roomNumber: r.roomNumber,
        floor: r.floor,
        capacity: r.capacity,
        activeOccupants: r.assignments.filter((a) => !a.vacatedAt).map((a) => ({
          assignmentId: a.id,
          employee: a.employee,
          assignedAt: a.assignedAt,
          monthlyRent: a.monthlyRent,
        })),
      })),
    };
  });
}

export type OccupancyReport = Awaited<ReturnType<typeof getOccupancyReport>>;

// ── Eligibility — employees without current accommodation ──────────────────

export async function getUnassignedEmployees(companyId: string) {
  return prisma.employee.findMany({
    where: {
      companyId,
      deletedAt: null,
      status: "ACTIVE",
      accommodationAssignments: { none: { vacatedAt: null } },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeId: true,
      department: { select: { name: true } },
      position: { select: { title: true } },
      nationality: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

export type UnassignedEmployee = Awaited<ReturnType<typeof getUnassignedEmployees>>[number];

export async function getEmployeeAssignmentHistory(employeeId: string, companyId: string) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId },
    select: { id: true, firstName: true, lastName: true, employeeId: true },
  });
  if (!employee) return null;

  const assignments = await prisma.accommodationAssignment.findMany({
    where: { employeeId },
    include: {
      room: {
        include: { accommodation: { select: { id: true, name: true, address: true, type: true } } },
      },
    },
    orderBy: { assignedAt: "desc" },
  });

  return { employee, assignments };
}
