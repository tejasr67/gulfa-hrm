import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { forbidden } from "@/lib/api/response";
import { getAttendanceAnalytics, toCSV } from "@/modules/analytics/queries";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { companyId } = session;
    await requirePermission(session, "REPORTS:READ");
    const { searchParams } = req.nextUrl;
    const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : undefined;
    const format = searchParams.get("format");

    const data = await getAttendanceAnalytics(companyId, year, month);

    if (format === "csv") {
      const csv = toCSV(
        data.monthly.map((r) => ({
          Month: r.month,
          "Attendance Rate (%)": r.rate,
          "Avg Work Hours": r.avgWorkHours,
        }))
      );
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="attendance-analytics-${year}.csv"`,
        },
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
