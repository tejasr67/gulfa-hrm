import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { requireSession } from "@/lib/auth/session";
import { getEmployeeById } from "@/modules/employees/queries";
import { EmployeeDetailTabs } from "@/components/modules/employees/EmployeeDetailTabs";
import { EmployeeAvatar } from "@/components/modules/employees/EmployeeAvatar";

export const metadata: Metadata = { title: "Employee Profile" };

type Props = { params: Promise<{ id: string }> };

export default async function EmployeeDetailPage({ params }: Props) {
  const { id } = await params;
  const { companyId } = await requireSession();

  const employee = await getEmployeeById(id, companyId);
  if (!employee) notFound();

  const fullName = `${employee.firstName} ${employee.lastName}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={fullName}
        description={[
          employee.position?.title,
          employee.department?.name,
          employee.employeeId,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <div className="flex items-center gap-2">
            {employee.deletedAt && (
              <Badge variant="secondary" className="text-xs">
                Archived
              </Badge>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/employees">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/employees/${id}/edit`}>Edit Profile</Link>
            </Button>
          </div>
        }
      />

      {/* Identity row */}
      <div className="flex items-center gap-4">
        <EmployeeAvatar
          firstName={employee.firstName}
          lastName={employee.lastName}
          photo={employee.photo}
          size="xl"
        />
        <div>
          <h2 className="text-xl font-semibold">{fullName}</h2>
          <p className="text-sm text-muted-foreground font-mono">{employee.employeeId}</p>
          {employee.location && (
            <p className="text-sm text-muted-foreground mt-0.5">{employee.location.name}</p>
          )}
        </div>
      </div>

      {/* Tabbed detail */}
      <EmployeeDetailTabs employee={employee} canEdit />
    </div>
  );
}
