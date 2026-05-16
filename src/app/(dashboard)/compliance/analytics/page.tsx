import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { requireSession } from "@/lib/auth/session";
import {
  getComplianceByDocType,
  getComplianceByDepartment,
  getExpiryForecast,
} from "@/modules/compliance/queries";
import { DocumentTypeGrid } from "@/components/modules/compliance/DocumentTypeGrid";
import { ComplianceByDepartmentChart } from "@/components/modules/compliance/ComplianceByDepartment";
import { ExpiryForecastChart } from "@/components/modules/compliance/ExpiryForecastChart";

export const metadata: Metadata = { title: "Compliance Analytics" };

export default async function ComplianceAnalyticsPage() {
  const { companyId } = await requireSession();
  const [byDocType, byDepartment, forecast] = await Promise.all([
    getComplianceByDocType(companyId),
    getComplianceByDepartment(companyId),
    getExpiryForecast(companyId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance Analytics"
        description="Document expiry trends and department compliance rates"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/compliance">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      {/* 12-month forecast */}
      <div className="rounded-xl border p-6 space-y-4">
        <h2 className="font-semibold">12-Month Expiry Forecast</h2>
        <ExpiryForecastChart data={forecast} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* By document type */}
        <div className="rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold">By Document Type</h2>
          <DocumentTypeGrid data={byDocType} />
        </div>

        {/* By department */}
        <div className="rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold">By Department</h2>
          <ComplianceByDepartmentChart data={byDepartment} />
        </div>
      </div>
    </div>
  );
}
