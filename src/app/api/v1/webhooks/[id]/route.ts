import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiKey, requireScope } from "@/lib/api/apikey";
import { requireSession } from "@/lib/auth/session";
import { signPayload, generateWebhookSecret } from "@/lib/webhooks/dispatch";
import { v1Error } from "@/lib/api/response";
import type { WebhookEvent } from "@prisma/client";

async function resolveCompanyId(req: NextRequest): Promise<string> {
  const apiKeyHeader = req.headers.get("x-api-key");
  if (apiKeyHeader) {
    const s = await requireApiKey(req);
    requireScope(s, "webhooks:manage");
    return s.companyId;
  }
  const s = await requireSession();
  return s.companyId;
}

type Params = { params: Promise<{ id: string }> };

const ALL_EVENTS: WebhookEvent[] = [
  "EMPLOYEE_CREATED", "EMPLOYEE_UPDATED", "EMPLOYEE_TERMINATED",
  "LEAVE_REQUESTED", "LEAVE_APPROVED", "LEAVE_REJECTED",
  "PAYROLL_RUN_COMPLETED", "PAYSLIP_GENERATED", "ATTENDANCE_RECORDED",
];

// ── GET /api/v1/webhooks/:id ──────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const companyId = await resolveCompanyId(req);
    const { id } = await params;

    const endpoint = await prisma.webhookEndpoint.findFirst({
      where: { id, companyId },
      include: {
        deliveries: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true, event: true, status: true, attempts: true,
            lastAttemptAt: true, responseStatus: true, lastError: true, createdAt: true,
          },
        },
      },
    });

    if (!endpoint) return NextResponse.json({ success: false, error: "Webhook endpoint not found" }, { status: 404 });

    const { secret: _s, ...safe } = endpoint;
    return NextResponse.json({ success: true, data: safe });
  } catch (e) {
    return v1Error(e);
  }
}

// ── PATCH /api/v1/webhooks/:id ────────────────────────────────────────────────

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  events: z.array(z.enum(ALL_EVENTS as [WebhookEvent, ...WebhookEvent[]])).min(1).optional(),
  isActive: z.boolean().optional(),
  rotateSecret: z.boolean().optional(),
}).strict();

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const companyId = await resolveCompanyId(req);
    const { id } = await params;

    const existing = await prisma.webhookEndpoint.findFirst({ where: { id, companyId } });
    if (!existing) return NextResponse.json({ success: false, error: "Webhook endpoint not found" }, { status: 404 });

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 422 });

    const { rotateSecret, ...updateFields } = parsed.data;
    let newRawSecret: string | undefined;

    if (rotateSecret) {
      newRawSecret = generateWebhookSecret();
    }

    await prisma.webhookEndpoint.update({
      where: { id },
      data: { ...updateFields, ...(newRawSecret ? { secret: newRawSecret } : {}) },
    });

    return NextResponse.json({ success: true, data: { id, ...(newRawSecret ? { newSecret: newRawSecret } : {}) } });
  } catch (e) {
    return v1Error(e);
  }
}

// ── DELETE /api/v1/webhooks/:id ───────────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const companyId = await resolveCompanyId(req);
    const { id } = await params;

    const existing = await prisma.webhookEndpoint.findFirst({ where: { id, companyId } });
    if (!existing) return NextResponse.json({ success: false, error: "Webhook endpoint not found" }, { status: 404 });

    await prisma.webhookEndpoint.delete({ where: { id } });
    return NextResponse.json({ success: true, data: { deleted: id } });
  } catch (e) {
    return v1Error(e);
  }
}

// ── POST /api/v1/webhooks/:id — test ping ────────────────────────────────────

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const companyId = await resolveCompanyId(req);
    const { id } = await params;

    const endpoint = await prisma.webhookEndpoint.findFirst({ where: { id, companyId } });
    if (!endpoint) return NextResponse.json({ success: false, error: "Webhook endpoint not found" }, { status: 404 });

    const payload = {
      event: "ping",
      endpointId: id,
      timestamp: new Date().toISOString(),
      message: "This is a test delivery from Gulfa HRM",
    };
    const body = JSON.stringify(payload);
    const sig = signPayload(endpoint.secret, body);

    try {
      const res = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Gulfa-Signature": `sha256=${sig}`,
          "X-Gulfa-Event": "ping",
          "X-Gulfa-Delivery": "test",
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      return NextResponse.json({ success: true, data: { status: res.status, ok: res.ok } });
    } catch (fetchErr) {
      return NextResponse.json({
        success: false,
        error: `Delivery failed: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`,
      }, { status: 502 });
    }
  } catch (e) {
    return v1Error(e);
  }
}
