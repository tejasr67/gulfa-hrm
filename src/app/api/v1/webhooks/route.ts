import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiKey, requireScope } from "@/lib/api/apikey";
import { requireSession } from "@/lib/auth/session";
import { generateWebhookSecret } from "@/lib/webhooks/dispatch";
import { v1Error } from "@/lib/api/response";
import type { WebhookEvent } from "@prisma/client";

const ALL_EVENTS: WebhookEvent[] = [
  "EMPLOYEE_CREATED", "EMPLOYEE_UPDATED", "EMPLOYEE_TERMINATED",
  "LEAVE_REQUESTED", "LEAVE_APPROVED", "LEAVE_REJECTED",
  "PAYROLL_RUN_COMPLETED", "PAYSLIP_GENERATED", "ATTENDANCE_RECORDED",
];

async function resolveCompanyId(req: NextRequest): Promise<string> {
  const apiKeyHeader = req.headers.get("x-api-key");
  if (apiKeyHeader) {
    const session = await requireApiKey(req);
    requireScope(session, "webhooks:manage");
    return session.companyId;
  }
  const session = await requireSession();
  return session.companyId;
}

// ── GET /api/v1/webhooks ──────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);

    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { companyId },
      select: {
        id: true, name: true, url: true, events: true, isActive: true, createdAt: true, updatedAt: true,
        _count: { select: { deliveries: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: endpoints });
  } catch (e) {
    return v1Error(e);
  }
}

// ── POST /api/v1/webhooks ─────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  events: z.array(z.enum(ALL_EVENTS as [WebhookEvent, ...WebhookEvent[]])).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 422 });
    }

    const rawSecret = generateWebhookSecret();

    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        companyId,
        name: parsed.data.name,
        url: parsed.data.url,
        secret: rawSecret,
        events: parsed.data.events,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: endpoint.id,
        name: endpoint.name,
        url: endpoint.url,
        events: endpoint.events,
        secret: rawSecret,
      },
    }, { status: 201 });
  } catch (e) {
    return v1Error(e);
  }
}
