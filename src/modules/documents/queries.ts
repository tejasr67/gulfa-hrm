import "server-only";
import { prisma } from "@/lib/prisma";
import type { CreateDocumentInput, UpdateDocumentInput } from "./schema";

// ── Document Types ────────────────────────────────────────────────────────────

export async function getDocumentTypes() {
  return prisma.documentType.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function createDocumentType(data: { name: string; nameAr?: string; requiresExpiry?: boolean; alertDaysBefore?: number }) {
  return prisma.documentType.create({ data });
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getDocumentStats(companyId: string) {
  const today = new Date();
  const in30 = new Date(today); in30.setDate(in30.getDate() + 30);
  const in60 = new Date(today); in60.setDate(in60.getDate() + 60);

  const docs = await prisma.employeeDocument.findMany({
    where: {
      deletedAt: null,
      employee: { companyId, deletedAt: null },
    },
    select: { expiryDate: true, status: true },
  });

  let expired = 0, expiring30 = 0, expiring60 = 0, valid = 0, noExpiry = 0;

  for (const d of docs) {
    if (!d.expiryDate) { noExpiry++; continue; }
    const exp = new Date(d.expiryDate);
    if (exp < today) expired++;
    else if (exp <= in30) expiring30++;
    else if (exp <= in60) expiring60++;
    else valid++;
  }

  return { total: docs.length, expired, expiring30, expiring60, valid, noExpiry };
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function getDocuments(
  companyId: string,
  filters: {
    employeeId?: string;
    documentTypeId?: string;
    status?: string;
    expiry?: "expired" | "expiring30" | "expiring60";
    search?: string;
    page?: number;
    limit?: number;
  } = {}
) {
  const { employeeId, documentTypeId, status, expiry, search, page = 1, limit = 50 } = filters;
  const today = new Date();
  const in30 = new Date(today); in30.setDate(in30.getDate() + 30);
  const in60 = new Date(today); in60.setDate(in60.getDate() + 60);

  const where: Record<string, unknown> = {
    deletedAt: null,
    employee: {
      companyId,
      deletedAt: null,
      ...(employeeId ? { id: employeeId } : {}),
      ...(search ? {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { employeeId: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    },
    ...(documentTypeId ? { documentTypeId } : {}),
    ...(status ? { status } : {}),
    ...(expiry === "expired" ? { expiryDate: { lt: today } } : {}),
    ...(expiry === "expiring30" ? { expiryDate: { gte: today, lte: in30 } } : {}),
    ...(expiry === "expiring60" ? { expiryDate: { gte: today, lte: in60 } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.employeeDocument.findMany({
      where,
      include: {
        documentType: { select: { id: true, name: true, requiresExpiry: true } },
        employee: {
          select: {
            id: true, firstName: true, lastName: true, employeeId: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: [{ expiryDate: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.employeeDocument.count({ where }),
  ]);

  return { items, total, page, limit };
}

export async function getEmployeeDocuments(employeeId: string, companyId: string) {
  return prisma.employeeDocument.findMany({
    where: {
      employeeId,
      deletedAt: null,
      employee: { companyId },
    },
    include: {
      documentType: { select: { id: true, name: true, requiresExpiry: true } },
    },
    orderBy: { expiryDate: "asc" },
  });
}

export async function createDocument(companyId: string, data: CreateDocumentInput, createdBy: string) {
  const employee = await prisma.employee.findFirst({ where: { id: data.employeeId, companyId, deletedAt: null } });
  if (!employee) throw new Error("Employee not found");

  return prisma.employeeDocument.create({
    data: {
      employeeId: data.employeeId,
      documentTypeId: data.documentTypeId,
      documentNumber: data.documentNumber,
      issueDate: data.issueDate ? new Date(data.issueDate) : null,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      issuedBy: data.issuedBy,
      notes: data.notes,
      createdBy,
      uploadedBy: createdBy,
    },
  });
}

export async function updateDocument(id: string, companyId: string, data: UpdateDocumentInput) {
  const doc = await prisma.employeeDocument.findFirst({
    where: { id, deletedAt: null, employee: { companyId } },
  });
  if (!doc) throw new Error("Document not found");

  return prisma.employeeDocument.update({
    where: { id },
    data: {
      ...(data.documentNumber !== undefined ? { documentNumber: data.documentNumber } : {}),
      ...(data.issueDate ? { issueDate: new Date(data.issueDate) } : {}),
      ...(data.expiryDate ? { expiryDate: new Date(data.expiryDate) } : {}),
      ...(data.issuedBy !== undefined ? { issuedBy: data.issuedBy } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.status ? { status: data.status as "ACTIVE" | "EXPIRED" | "CANCELLED" } : {}),
    },
  });
}

export async function deleteDocument(id: string, companyId: string) {
  const doc = await prisma.employeeDocument.findFirst({
    where: { id, deletedAt: null, employee: { companyId } },
  });
  if (!doc) throw new Error("Document not found");
  return prisma.employeeDocument.update({ where: { id }, data: { deletedAt: new Date() } });
}
