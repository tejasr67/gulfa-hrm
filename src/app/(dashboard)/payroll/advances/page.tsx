import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SalaryAdvancesPanel } from "@/components/modules/payroll/SalaryAdvancesPanel";

export const metadata: Metadata = { title: "Salary Advances" };

export default function AdvancesPage() {
  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/payroll">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Payroll
        </Link>
      </Button>

      <div className="rounded-xl border">
        <SalaryAdvancesPanel />
      </div>
    </div>
  );
}
