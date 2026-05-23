import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { AttendanceAnalyticsClient } from "./AttendanceAnalyticsClient";

export const metadata: Metadata = { title: "Attendance Analytics" };

export default function AttendanceAnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Analytics"
        description="Daily attendance trends, department rates, and monthly patterns"
      />
      <AttendanceAnalyticsClient />
    </div>
  );
}
