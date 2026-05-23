"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp,
  Archive,
  RefreshCcw,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmployeeAvatar } from "./EmployeeAvatar";
import { ActivityTimeline } from "./ActivityTimeline";
import { ProfileCompleteness } from "./ProfileCompleteness";
import { StatusWorkflowModal } from "./StatusWorkflowModal";
import { DocumentCenter } from "./DocumentCenter";
import { LeaveTab } from "./tabs/LeaveTab";
import { AttendanceTab } from "./tabs/AttendanceTab";
import { PayrollTab } from "./tabs/PayrollTab";
import { AssetsTab } from "./tabs/AssetsTab";
import { DisciplinaryTab } from "./tabs/DisciplinaryTab";
import { formatDate, getExpiryStatus } from "@/lib/utils/formatters";
import { useEmployeeTimeline } from "@/modules/employees/hooks";
import { changeEmployeeStatusAction, restoreEmployeeAction } from "@/modules/employees/actions";
import { cn } from "@/lib/utils/cn";
import type { BadgeProps } from "@/components/ui/badge";

// ── Types ─────────────────────────────────────────────────────────────────

type EmployeeData = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  altPhone: string | null;
  personalEmail: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  nationality: string | null;
  religion: string | null;
  maritalStatus: string | null;
  bloodGroup: string | null;
  photo: string | null;
  status: string;
  employmentType: string;
  joiningDate: Date;
  confirmationDate: Date | null;
  terminationDate: Date | null;
  emiratesId: string | null;
  emiratesIdExpiry: Date | null;
  visaNumber: string | null;
  visaExpiry: Date | null;
  passportNumber: string | null;
  passportExpiry: Date | null;
  laborCardNumber: string | null;
  laborCardExpiry: Date | null;
  uaeEntryDate: Date | null;
  bankName: string | null;
  bankAccount: string | null;
  iban: string | null;
  deletedAt: Date | null;
  department: { name: string } | null;
  position: { title: string } | null;
  location: { name: string } | null;
  manager: { id: string; firstName: string; lastName: string; photo: string | null } | null;
  subordinates: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    photo: string | null;
  }[];
  emergencyContacts: {
    id: string;
    name: string;
    relationship: string;
    phone: string;
    email: string | null;
  }[];
  careerHistory: {
    id: string;
    type: string;
    fromPosition: string | null;
    toPosition: string | null;
    fromDepartment: string | null;
    toDepartment: string | null;
    fromManagerId: string | null;
    toManagerId: string | null;
    fromLocationId: string | null;
    toLocationId: string | null;
    fromSalary: number | null;
    toSalary: number | null;
    effectiveDate: Date;
    reason: string | null;
    notes: string | null;
    approvedBy: string | null;
  }[];
  salaries: {
    basicSalary: number;
    housingAllowance: number;
    transportAllowance: number;
    otherAllowances: number;
    totalSalary: number;
    currency: string;
    effectiveFrom: Date;
  }[];
  _count: {
    emergencyContacts: number;
    documents: number;
    subordinates: number;
  };
  completeness: {
    score: number;
    sections: { name: string; score: number; maxScore: number }[];
  };
};

type Props = {
  employee: EmployeeData;
  canEdit?: boolean;
};

// ── Helpers ──────────────────────────────────────────────────────────────

function maskString(value: string | null | undefined, keepLast = 4): string {
  if (!value) return "—";
  if (value.length <= keepLast) return value;
  return "•".repeat(value.length - keepLast) + value.slice(-keepLast);
}

function expiryBadgeVariant(
  status: ReturnType<typeof getExpiryStatus>
): BadgeProps["variant"] {
  switch (status) {
    case "expired":
      return "danger";
    case "critical":
      return "warning";
    case "warning":
      return "info";
    case "ok":
      return "success";
    default:
      return "secondary";
  }
}

function expiryBadgeLabel(status: ReturnType<typeof getExpiryStatus>): string {
  switch (status) {
    case "expired":
      return "Expired";
    case "critical":
      return "< 30 Days";
    case "warning":
      return "< 60 Days";
    case "ok":
      return "Valid";
    default:
      return "Not Set";
  }
}

type DetailRowProps = {
  label: string;
  value: React.ReactNode;
};

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground shrink-0 w-40">{label}</span>
      <span className="text-sm text-right flex-1">{value ?? "—"}</span>
    </div>
  );
}

function UAEDocRow({
  label,
  number,
  expiry,
}: {
  label: string;
  number: string | null;
  expiry: Date | null;
}) {
  const status = getExpiryStatus(expiry);
  return (
    <div className="flex items-center gap-4 py-2 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground font-mono">
          {number ?? "Not provided"}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {expiry && (
          <span className="text-xs text-muted-foreground">{formatDate(expiry)}</span>
        )}
        <Badge variant={expiryBadgeVariant(status)}>
          {expiryBadgeLabel(status)}
        </Badge>
      </div>
    </div>
  );
}

// ── Career type badge helpers ──────────────────────────────────────────────

const CAREER_TYPE_STYLES: Record<
  string,
  { label: string; className: string }
> = {
  PROMOTION: {
    label: "Promotion",
    className:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  },
  TRANSFER: {
    label: "Transfer",
    className:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  },
  SALARY_REVISION: {
    label: "Salary Revision",
    className:
      "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
  },
  DEMOTION: {
    label: "Demotion",
    className:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  },
  ROLE_CHANGE: {
    label: "Role Change",
    className:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  },
  PROBATION_COMPLETION: {
    label: "Probation Completion",
    className:
      "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700",
  },
  MANAGER_CHANGE: {
    label: "Manager Change",
    className:
      "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800",
  },
};

function CareerTypeBadge({ type }: { type: string }) {
  const style = CAREER_TYPE_STYLES[type] ?? {
    label: type.replace(/_/g, " "),
    className: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        style.className
      )}
    >
      {style.label}
    </span>
  );
}

// ── Timeline tab sub-component ─────────────────────────────────────────────

function TimelineTab({ employeeId }: { employeeId: string }) {
  const { events, isLoading, error } = useEmployeeTimeline(employeeId);

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return <ActivityTimeline events={events} isLoading={isLoading} />;
}

// ── Main component ─────────────────────────────────────────────────────────

export function EmployeeDetailTabs({ employee, canEdit }: Props) {
  const router = useRouter();
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [isStatusChanging, setIsStatusChanging] = useState(false);
  const [isRestoring, startRestoreTransition] = useTransition();

  async function handleStatusChange(newStatus: string, notes: string) {
    setIsStatusChanging(true);
    try {
      const result = await changeEmployeeStatusAction(employee.id, {
        newStatus,
        notes,
      });
      if (result.success) {
        setStatusModalOpen(false);
        router.refresh();
      }
    } finally {
      setIsStatusChanging(false);
    }
  }

  function handleRestore() {
    if (!confirm("Restore this archived employee? They will become active again.")) return;
    startRestoreTransition(async () => {
      await restoreEmployeeAction(employee.id);
      router.refresh();
    });
  }

  const isArchived = !!employee.deletedAt;
  const isTerminated = employee.status === "TERMINATED";

  return (
    <>
      {/* Status change action bar */}
      {canEdit && !isArchived && (
        <div className="flex items-center justify-end mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStatusModalOpen(true)}
          >
            Change Status
          </Button>
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">
            Documents
            {employee._count.documents > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-xs rounded-full">
                {employee._count.documents}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="disciplinary">Disciplinary</TabsTrigger>
          <TabsTrigger value="career">Career</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* ── Left column (2/3) ── */}
            <div className="lg:col-span-2 space-y-6">
              {/* Employment Details */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Employment Details</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <DetailRow label="Employee ID" value={
                    <span className="font-mono">{employee.employeeId}</span>
                  } />
                  <DetailRow
                    label="Employment Type"
                    value={employee.employmentType.replace(/_/g, " ")}
                  />
                  <DetailRow label="Joining Date" value={formatDate(employee.joiningDate)} />
                  <DetailRow
                    label="Confirmation Date"
                    value={employee.confirmationDate ? formatDate(employee.confirmationDate) : "—"}
                  />
                  <DetailRow
                    label="Department"
                    value={employee.department?.name ?? "—"}
                  />
                  <DetailRow
                    label="Position"
                    value={employee.position?.title ?? "—"}
                  />
                  <DetailRow
                    label="Location"
                    value={employee.location?.name ?? "—"}
                  />
                  <DetailRow
                    label="Manager"
                    value={
                      employee.manager ? (
                        <Link
                          href={`/employees/${employee.manager.id}`}
                          className="text-primary hover:underline underline-offset-2"
                        >
                          {employee.manager.firstName} {employee.manager.lastName}
                        </Link>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <DetailRow
                    label="Status"
                    value={
                      <StatusBadge status={employee.status} type="employee" />
                    }
                  />
                </CardContent>
              </Card>

              {/* UAE Documents */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">UAE Documents</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <UAEDocRow
                    label="Emirates ID"
                    number={employee.emiratesId}
                    expiry={employee.emiratesIdExpiry}
                  />
                  <UAEDocRow
                    label="Visa"
                    number={employee.visaNumber}
                    expiry={employee.visaExpiry}
                  />
                  <UAEDocRow
                    label="Passport"
                    number={employee.passportNumber}
                    expiry={employee.passportExpiry}
                  />
                  <UAEDocRow
                    label="Labour Card"
                    number={employee.laborCardNumber}
                    expiry={employee.laborCardExpiry}
                  />
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <DetailRow label="Work Email" value={employee.email} />
                  <DetailRow label="Phone" value={employee.phone ?? "—"} />
                  <DetailRow
                    label="Alt Phone"
                    value={employee.altPhone ?? "—"}
                  />
                  <DetailRow
                    label="Personal Email"
                    value={employee.personalEmail ?? "—"}
                  />
                </CardContent>
              </Card>

              {/* Personal Information */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <DetailRow
                    label="Date of Birth"
                    value={
                      employee.dateOfBirth ? formatDate(employee.dateOfBirth) : "—"
                    }
                  />
                  <DetailRow
                    label="Gender"
                    value={employee.gender?.replace(/_/g, " ") ?? "—"}
                  />
                  <DetailRow label="Nationality" value={employee.nationality ?? "—"} />
                  <DetailRow
                    label="Marital Status"
                    value={employee.maritalStatus?.replace(/_/g, " ") ?? "—"}
                  />
                  <DetailRow label="Religion" value={employee.religion ?? "—"} />
                  <DetailRow
                    label="Blood Group"
                    value={employee.bloodGroup ?? "—"}
                  />
                </CardContent>
              </Card>

              {/* Banking Information */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Banking Information</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <DetailRow label="Bank Name" value={employee.bankName ?? "—"} />
                  <DetailRow
                    label="Account Number"
                    value={
                      employee.bankAccount ? (
                        <span className="font-mono">
                          {maskString(employee.bankAccount)}
                        </span>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <DetailRow
                    label="IBAN"
                    value={
                      employee.iban ? (
                        <span className="font-mono">
                          {maskString(employee.iban, 6)}
                        </span>
                      ) : (
                        "—"
                      )
                    }
                  />
                </CardContent>
              </Card>

              {/* Emergency Contacts */}
              {employee.emergencyContacts.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Emergency Contacts</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    {employee.emergencyContacts.map((contact, index) => (
                      <div key={contact.id}>
                        {index > 0 && <Separator className="mb-4" />}
                        <DetailRow label="Name" value={contact.name} />
                        <DetailRow
                          label="Relationship"
                          value={contact.relationship}
                        />
                        <DetailRow label="Phone" value={contact.phone} />
                        {contact.email && (
                          <DetailRow label="Email" value={contact.email} />
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* ── Right column (1/3) ── */}
            <div className="space-y-6">
              {/* Profile Completeness */}
              <ProfileCompleteness
                score={employee.completeness.score}
                sections={employee.completeness.sections}
              />

              {/* Termination notice */}
              {isTerminated && employee.terminationDate && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex flex-col gap-1">
                      <Badge variant="danger" className="w-fit">Terminated</Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        Termination date:{" "}
                        <span className="text-foreground font-medium">
                          {formatDate(employee.terminationDate)}
                        </span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Archived notice */}
              {isArchived && (
                <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge variant="warning" className="w-fit mb-1">
                          <Archive className="h-3 w-3 mr-1" />
                          Archived
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          Archived on {formatDate(employee.deletedAt!)}
                        </p>
                      </div>
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isRestoring}
                          onClick={handleRestore}
                        >
                          {isRestoring ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCcw className="h-3.5 w-3.5" />
                          )}
                          Restore
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Direct Reports */}
              {employee.subordinates.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Direct Reports{" "}
                      <Badge variant="secondary" className="ml-1">
                        {employee.subordinates.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {employee.subordinates.map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/employees/${sub.id}`}
                        className="flex items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-muted/40"
                      >
                        <EmployeeAvatar
                          firstName={sub.firstName}
                          lastName={sub.lastName}
                          photo={sub.photo}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {sub.firstName} {sub.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {sub.employeeId}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Documents ── */}
        <TabsContent value="documents">
          <DocumentCenter
            employeeId={employee.id}
            canUpload={canEdit}
            canDelete={canEdit}
          />
        </TabsContent>

        {/* ── Leave ── */}
        <TabsContent value="leave">
          <LeaveTab employeeId={employee.id} />
        </TabsContent>

        {/* ── Attendance ── */}
        <TabsContent value="attendance">
          <AttendanceTab employeeId={employee.id} />
        </TabsContent>

        {/* ── Payroll ── */}
        <TabsContent value="payroll">
          <PayrollTab employeeId={employee.id} />
        </TabsContent>

        {/* ── Assets ── */}
        <TabsContent value="assets">
          <AssetsTab employeeId={employee.id} />
        </TabsContent>

        {/* ── Disciplinary ── */}
        <TabsContent value="disciplinary">
          <DisciplinaryTab employeeId={employee.id} />
        </TabsContent>

        {/* ── Timeline ── */}
        <TabsContent value="timeline">
          <TimelineTab employeeId={employee.id} />
        </TabsContent>

        {/* ── Career ── */}
        <TabsContent value="career">
          <div className="flex justify-end mb-4">
            <Link href={`/career/${employee.id}`} className="text-sm text-primary hover:underline underline-offset-2">
              Full career timeline →
            </Link>
          </div>
          {employee.careerHistory.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No career history"
              description="Career events like promotions, transfers, and role changes will appear here."
            />
          ) : (
            <div className="space-y-0">
              {employee.careerHistory.map((event, index) => {
                const isLast = index === employee.careerHistory.length - 1;
                return (
                  <div key={event.id} className="flex gap-4">
                    {/* Left: dot + line */}
                    <div className="flex flex-col items-center shrink-0">
                      <div className="mt-1 h-3 w-3 rounded-full border-2 border-primary bg-background shrink-0" />
                      {!isLast && (
                        <div className="w-px flex-1 bg-border mt-1 min-h-[2rem]" />
                      )}
                    </div>

                    {/* Right: content */}
                    <div className={cn("pb-6 flex-1", isLast && "pb-0")}>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <CareerTypeBadge type={event.type} />
                        <span className="text-xs text-muted-foreground">
                          {formatDate(event.effectiveDate)}
                        </span>
                      </div>

                      <div className="space-y-1">
                        {(event.fromPosition || event.toPosition) && (
                          <p className="text-sm">
                            {event.fromPosition && (
                              <span className="text-muted-foreground">
                                {event.fromPosition}
                              </span>
                            )}
                            {event.fromPosition && event.toPosition && (
                              <span className="mx-1.5 text-muted-foreground">→</span>
                            )}
                            {event.toPosition && (
                              <span className="font-medium">{event.toPosition}</span>
                            )}
                          </p>
                        )}
                        {(event.fromDepartment || event.toDepartment) && (
                          <p className="text-xs text-muted-foreground">
                            {event.fromDepartment && (
                              <span>{event.fromDepartment}</span>
                            )}
                            {event.fromDepartment && event.toDepartment && (
                              <span className="mx-1">→</span>
                            )}
                            {event.toDepartment && (
                              <span>{event.toDepartment}</span>
                            )}
                          </p>
                        )}
                        {event.reason && (
                          <p className="text-xs text-muted-foreground italic">
                            {event.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Status Workflow Modal */}
      <StatusWorkflowModal
        open={statusModalOpen}
        onOpenChange={setStatusModalOpen}
        currentStatus={employee.status}
        employeeName={`${employee.firstName} ${employee.lastName}`}
        onConfirm={handleStatusChange}
        isLoading={isStatusChanging}
      />
    </>
  );
}
