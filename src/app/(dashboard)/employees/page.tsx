import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { SkeletonTable } from "@/components/shared/SkeletonLoader";
import { EmployeeTable } from "@/components/modules/employees/EmployeeTable";
import { requireSession } from "@/lib/auth/session";
import {
  getDepartmentsForCompany,
  getLocationsForCompany,
} from "@/modules/employees/queries";

export const metadata: Metadata = { title: "Employees" };

export default async function EmployeesPage() {
  const session = await requireSession();
  const [departments, locations] = await Promise.all([
    getDepartmentsForCompany(session.companyId),
    getLocationsForCompany(session.companyId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="Manage your workforce, roles, and personal information"
        actions={
          <Button asChild>
            <Link href="/employees/new">
              <UserPlus className="h-4 w-4" />
              Add Employee
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<SkeletonTable rows={10} />}>
        <EmployeeTable departments={departments} locations={locations} />
      </Suspense>
    </div>
  );
}
