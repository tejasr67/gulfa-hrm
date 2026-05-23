import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { PayrollReportsChart } from "@/components/modules/payroll/PayrollReportsChart";

export const metadata: Metadata = { title: "Payroll Reports" };

export default function PayrollReportsPage() {
  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/payroll">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Payroll
        </Link>
      </Button>

      <PageHeader
        title="Payroll Reports"
        description="Cost trends, headcount analysis, and payroll history"
      />

      <div className="rounded-xl border p-6">
        <PayrollReportsChart />
      </div>
    </div>
  );
}
