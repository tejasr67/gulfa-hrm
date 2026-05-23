import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { getEmployeeCareerHistory } from "@/modules/career/queries";
import { EmployeeCareerPageClient } from "./EmployeeCareerPageClient";

type Props = { params: Promise<{ employeeId: string }> };

export const metadata: Metadata = { title: "Employee Career History" };

export default async function EmployeeCareerPage({ params }: Props) {
  const { employeeId } = await params;
  const { companyId } = await requireSession();
  const data = await getEmployeeCareerHistory(employeeId, companyId);
  if (!data) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/career" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Career History
        </Link>
      </div>
      <EmployeeCareerPageClient employeeId={employeeId} initialData={data} />
    </div>
  );
}
