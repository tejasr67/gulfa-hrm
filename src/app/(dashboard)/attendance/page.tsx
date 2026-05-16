import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Attendance" };

export default function AttendancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Track daily attendance, check-ins, and shift schedules"
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Today's Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No attendance records</p>
            <p className="text-sm text-muted-foreground">
              Connect your database to see today's attendance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
