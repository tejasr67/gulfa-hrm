import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { createSignedDownloadUrl } from "@/lib/supabase/storage";
import { ok, unauthorized, forbidden, notFound, serverError, err } from "@/lib/api/response";

type RouteContext = { params: Promise<{ id: string; docId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id, docId } = await params;
    const session = await requireSession();
    await requirePermission(session, "DOCUMENTS:READ");

    const doc = await prisma.employeeDocument.findFirst({
      where: {
        id: docId,
        employeeId: id,
        deletedAt: null,
        employee: { companyId: session.companyId },
      },
      select: { id: true, storagePath: true, fileName: true },
    });
    if (!doc) return notFound("Document");
    if (!doc.storagePath) return err("This document has no file attached", 422);

    const signedUrl = await createSignedDownloadUrl(doc.storagePath);
    return ok({ signedUrl, fileName: doc.fileName });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message === "Permission denied") return forbidden();
    return serverError(e);
  }
}
