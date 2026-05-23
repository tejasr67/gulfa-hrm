import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getUniformStock, getUniformStats, upsertStockItem, updateStockQty, deleteStockItem } from "@/modules/uniforms/queries";

export async function GET() {
  try {
    const session = await requireSession();
    await requirePermission(session, "UNIFORMS:READ");
    const [stock, stats] = await Promise.all([
      getUniformStock(session.companyId),
      getUniformStats(session.companyId),
    ]);
    return ok({ stock, stats });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "UNIFORMS:CREATE");
    const body = await req.json();
    const { category, size, color = "", location, qty, minStock } = body;
    if (!category || !size || !location) return err("category, size, and location are required");
    const item = await upsertStockItem(session.companyId, {
      category: String(category).toUpperCase(),
      size: String(size),
      color: String(color),
      location: String(location),
      qty: Number(qty) || 0,
      minStock: Number(minStock) || 5,
    });
    return ok(item, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    if (e instanceof Error) return err(e.message);
    return serverError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "UNIFORMS:UPDATE");
    const body = await req.json();
    const { id, qty } = body;
    if (!id) return err("id is required");
    const item = await updateStockQty(id, session.companyId, Number(qty));
    return ok(item);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    if (e instanceof Error) return err(e.message);
    return serverError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "UNIFORMS:DELETE");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return err("id is required");
    await deleteStockItem(id, session.companyId);
    return ok({ deleted: true });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    if (e instanceof Error) return err(e.message);
    return serverError(e);
  }
}
