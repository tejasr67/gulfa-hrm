import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { ok, unauthorized, serverError, err } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { upsertReminderConfig } from "@/modules/compliance/queries";
import { z } from "zod";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const sp = new URL(request.url).searchParams;
    const documentTypeId = sp.get("documentTypeId");

    const configs = await prisma.documentReminderConfig.findMany({
      where: {
        companyId: session.companyId,
        ...(documentTypeId ? { documentTypeId } : {}),
      },
      orderBy: { createdAt: "asc" },
    });

    return ok(configs);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}

const patchSchema = z.object({
  documentTypeId: z.string().nullable().default(null),
  reminderDays: z.array(z.number().int().min(1).max(365)).min(1).max(10),
  notifyEmployee: z.boolean().default(true),
  notifyManager: z.boolean().default(false),
  notifyHR: z.boolean().default(true),
  emailEnabled: z.boolean().default(true),
  inAppEnabled: z.boolean().default(true),
  isEnabled: z.boolean().default(true),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession();
    if (session.role !== "ADMIN" && session.role !== "HR") {
      return unauthorized();
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);

    const { documentTypeId, ...data } = parsed.data;
    const config = await upsertReminderConfig(session.companyId, documentTypeId, data);
    return ok(config);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}
