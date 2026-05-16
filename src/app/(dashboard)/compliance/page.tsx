import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BarChart2, Settings } from "lucide-react";
import { getComplianceStats } from "@/modules/compliance/queries";
import { ComplianceStatsBar } from "@/components/modules/compliance/ComplianceStatsBar";
import { AtRiskEmployeesTable } from "@/components/modules/compliance/AtRiskEmployeesTable";

export const metadata: Metadata = { title: "Compliance" };

export default async function CompliancePage() {
  const { companyId } = await requireSession();
  const stats = await getComplianceStats(companyId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Compliance"
        description="Track document expiry status across all employees"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/compliance/analytics">
                <BarChart2 className="h-4 w-4" />
                Analytics
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/compliance/reminders">
                <Settings className="h-4 w-4" />
                Reminders
              </Link>
            </Button>
          </div>
        }
      />

      <ComplianceStatsBar stats={stats} />

      <div className="rounded-xl border">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">At-Risk Documents</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Expired and soon-to-expire employee documents
          </p>
        </div>
        <div className="p-6">
          <AtRiskEmployeesTable initialRisk="expired" />
        </div>
      </div>
    </div>
  );
}
