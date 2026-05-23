import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { requireSession } from "@/lib/auth/session";
import {
  getAttendanceSummary,
  getDepartmentAttendanceStats,
  getAttendanceTrends,
  getShifts,
  getEmployeesForAttendance,
} from "@/modules/attendance/queries";
import { getDepartmentsForCompany } from "@/modules/employees/queries";
import { AttendanceClient } from "./AttendanceClient";

export const metadata: Metadata = { title: "Attendance" };

async function AttendancePageInner() {
  const session = await requireSession();

  const [summary, departments, trends, shifts, employees, depts] = await Promise.all([
    getAttendanceSummary(session.companyId),
    getDepartmentAttendanceStats(session.companyId),
    getAttendanceTrends(session.companyId, 14),
    getShifts(session.companyId),
    getEmployeesForAttendance(session.companyId),
    getDepartmentsForCompany(session.companyId),
  ]);

  return (
    <AttendanceClient
      initialSummary={summary}
      initialDepartments={departments}
      initialTrends={trends}
      departments={depts}
      employees={employees}
      shifts={shifts}
    />
  );
}

function AttendanceSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-64 rounded-xl bg-muted" />
        <div className="h-64 rounded-xl bg-muted" />
      </div>
    </div>
  );
}

export default function AttendancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Track daily attendance, shifts, overtime, and workforce presence"
      />
      <Suspense fallback={<AttendanceSkeleton />}>
        <AttendancePageInner />
      </Suspense>
    </div>
  );
}
