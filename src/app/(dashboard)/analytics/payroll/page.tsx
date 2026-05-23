import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { PayrollAnalyticsClient } from "./PayrollAnalyticsClient";

export const metadata: Metadata = { title: "Payroll Analytics" };

export default function PayrollAnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll Analytics"
        description="Monthly payroll costs, department breakdown, and salary distribution"
      />
      <PayrollAnalyticsClient />
    </div>
  );
}
