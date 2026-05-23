import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { v1Error } from "@/lib/api/response";

type Params = { params: Promise<{ id: string }> };

// ── DELETE /api/v1/keys/:id (revoke) ─────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { companyId, userId } = await requireSession();
    const { id } = await params;

    const key = await prisma.apiKey.findFirst({
      where: { id, companyId, isActive: true },
    });
    if (!key) {
      return NextResponse.json({ success: false, error: "API key not found" }, { status: 404 });
    }

    await prisma.apiKey.update({
      where: { id },
      data: { isActive: false, revokedAt: new Date(), revokedBy: userId },
    });

    return NextResponse.json({ success: true, data: { revoked: id } });
  } catch (e) {
    return v1Error(e);
  }
}
