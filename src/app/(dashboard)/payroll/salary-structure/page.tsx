import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { SalaryStructureTable } from "@/components/modules/payroll/SalaryStructureTable";
import { getEmployeeSalaries } from "@/modules/payroll/queries";

export const metadata: Metadata = { title: "Salary Structure" };

export default async function SalaryStructurePage() {
  const { companyId } = await requireSession();
  await getEmployeeSalaries(companyId); // pre-warm, actual data via SWR client-side

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/payroll">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Payroll
        </Link>
      </Button>

      <PageHeader
        title="Salary Structure"
        description="Manage employee base salaries and allowances"
      />

      <div className="rounded-xl border">
        <SalaryStructureTable />
      </div>
    </div>
  );
}
