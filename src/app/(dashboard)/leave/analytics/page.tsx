import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { getLeaveAnalytics } from "@/modules/leave/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { LeaveAnalyticsCharts } from "@/components/modules/leave/LeaveAnalyticsCharts";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = { title: "Leave Analytics" };

export default async function LeaveAnalyticsPage() {
  const session = await requireSession();
  const year = new Date().getFullYear();
  const analytics = await getLeaveAnalytics(session.companyId, year);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Leave Analytics ${year}`}
        description="Leave trends, department breakdown, and top takers"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/leave"><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Link>
          </Button>
        }
      />
      <LeaveAnalyticsCharts analytics={analytics} />
    </div>
  );
}
