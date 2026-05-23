import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { getPayrollRun } from "@/modules/payroll/queries";
import { Button } from "@/components/ui/button";
import { PayrollRunDetail } from "@/components/modules/payroll/PayrollRunDetail";

export const metadata: Metadata = { title: "Payroll Run" };

type Props = { params: Promise<{ id: string }> };

export default async function PayrollRunPage({ params }: Props) {
  const { id } = await params;
  const { companyId } = await requireSession();
  const run = await getPayrollRun(id, companyId);

  if (!run) notFound();

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/payroll">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Payroll
        </Link>
      </Button>

      <PayrollRunDetail run={run} />
    </div>
  );
}
