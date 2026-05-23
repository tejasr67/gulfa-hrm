import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { BarChart2, DollarSign, Users } from "lucide-react";
import { getPayrollStats } from "@/modules/payroll/queries";
import { PayrollClient } from "./PayrollClient";

export const metadata: Metadata = { title: "Payroll" };

export default async function PayrollPage() {
  const { companyId } = await requireSession();
  const stats = await getPayrollStats(companyId);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/payroll/salary-structure">
              <DollarSign className="h-4 w-4" />
              Salary Structure
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/payroll/advances">
              <Users className="h-4 w-4" />
              Advances
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/payroll/reports">
              <BarChart2 className="h-4 w-4" />
              Reports
            </Link>
          </Button>
        </div>
      </div>

      <PayrollClient initialStats={stats} />
    </div>
  );
}
