import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { buildStoragePath, createSignedUploadUrl } from "@/lib/supabase/storage";
import { uploadUrlSchema } from "@/modules/employees/schema";
import { ok, err, unauthorized, forbidden, notFound, serverError } from "@/lib/api/response";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const session = await requireSession();
    await requirePermission(session, "DOCUMENTS:CREATE");

    const body = await request.json();
    const parsed = uploadUrlSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);

    const emp = await prisma.employee.findFirst({
      where: { id, companyId: session.companyId, deletedAt: null },
      select: { id: true },
    });
    if (!emp) return notFound("Employee");

    const storagePath = buildStoragePath(session.companyId, id, parsed.data.fileName);
    const { signedUrl, token } = await createSignedUploadUrl(storagePath);

    return ok({ signedUrl, token, storagePath });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message === "Permission denied") return forbidden();
    return serverError(e);
  }
}
