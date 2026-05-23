import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiKey, requireScope } from "@/lib/api/apikey";
import { writeAuditLog } from "@/lib/utils/audit";
import { enqueueWebhook } from "@/lib/webhooks/dispatch";
import { v1Error } from "@/lib/api/response";

type Params = { params: Promise<{ id: string }> };

// ── GET /api/v1/leave/:id ─────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await requireApiKey(req);
    requireScope(session, "leave:read");
    const { id } = await params;

    const request = await prisma.leaveRequest.findFirst({
      where: { id, employee: { companyId: session.companyId } },
      include: {
        employee: { select: { id: true, employeeId: true, firstName: true, lastName: true } },
        leaveType: { select: { id: true, name: true, code: true, isPaid: true } },
        approvalActions: {
          select: { action: true, note: true, step: true, createdAt: true },
          orderBy: { step: "asc" },
        },
      },
    });

    if (!request) {
      return NextResponse.json({ success: false, error: "Leave request not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: request });
  } catch (e) {
    return v1Error(e);
  }
}

// ── PATCH /api/v1/leave/:id ───────────────────────────────────────────────────
// Approve / reject / cancel from an external system.

const patchSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "CANCELLED"]),
  notes: z.string().max(1000).optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireApiKey(req);
    requireScope(session, "leave:write");
    const { id } = await params;

    const existing = await prisma.leaveRequest.findFirst({
      where: { id, employee: { companyId: session.companyId } },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Leave request not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 422 });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: parsed.data.status,
        ...(parsed.data.status === "APPROVED" ? { approvedAt: new Date() } : {}),
      },
    });

    writeAuditLog({
      userId: `apikey:${session.keyId}`,
      action: "STATUS_CHANGE",
      module: "LEAVE",
      entityId: id,
      entityType: "LeaveRequest",
      employeeId: existing.employeeId,
      oldValues: { status: existing.status },
      newValues: { status: parsed.data.status, source: "api_v1" },
    }).catch(() => {});

    const webhookEvent = parsed.data.status === "APPROVED" ? "LEAVE_APPROVED"
      : parsed.data.status === "REJECTED" ? "LEAVE_REJECTED" : null;
    if (webhookEvent) {
      enqueueWebhook(session.companyId, webhookEvent, {
        requestId: id,
        employeeId: existing.employeeId,
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, data: { id, status: updated.status } });
  } catch (e) {
    return v1Error(e);
  }
}
