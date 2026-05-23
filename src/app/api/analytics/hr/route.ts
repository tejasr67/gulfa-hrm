import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { forbidden } from "@/lib/api/response";
import { getHRAnalytics, toCSV } from "@/modules/analytics/queries";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { companyId } = session;
    await requirePermission(session, "REPORTS:READ");
    const { searchParams } = req.nextUrl;
    const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);
    const format = searchParams.get("format");

    const data = await getHRAnalytics(companyId, year);

    if (format === "csv") {
      const csv = toCSV(
        data.headcountTrend.map((r) => ({
          Month: r.month,
          Headcount: r.total,
          Hires: r.hires,
          Terminations: r.terminations,
        }))
      );
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="hr-analytics-${year}.csv"`,
        },
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
