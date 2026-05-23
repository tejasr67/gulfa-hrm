import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { unauthorized, forbidden, notFound, serverError } from "@/lib/api/response";
import { getPayslip, generatePayslipHtml } from "@/modules/payroll/queries";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

const PAYSLIPS_BUCKET = "payslips";

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    await requirePermission(session, "PAYROLL:VIEW");
    const { id } = await params;

    const payslip = await getPayslip(id, session.companyId);
    if (!payslip) return notFound("Payslip");

    // If a stored file exists, return a signed download URL redirect
    if (payslip.fileUrl) {
      try {
        const supabase = await createClient();
        const { data, error } = await supabase.storage
          .from(PAYSLIPS_BUCKET)
          .createSignedUrl(payslip.fileUrl, 900);
        if (!error && data?.signedUrl) {
          return NextResponse.redirect(data.signedUrl);
        }
      } catch {
        // Fall through to on-the-fly generation
      }
    }

    // No stored file — generate HTML on the fly and return for printing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const html = generatePayslipHtml(payslip as any);

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="payslip-${payslip.employee.employeeId}-${payslip.payrollRun.year}-${String(payslip.payrollRun.month).padStart(2, "0")}.html"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
