"use client";

import { useCallback } from "react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CareerTimeline } from "@/components/modules/career/CareerTimeline";
import { AddCareerEventDialog } from "@/components/modules/career/AddCareerEventDialog";
import { useEmployeeCareerHistory } from "@/modules/career/hooks";
import type { EmployeeCareerHistory } from "@/modules/career/queries";

type Props = {
  employeeId: string;
  initialData: NonNullable<EmployeeCareerHistory>;
};

export function EmployeeCareerPageClient({ employeeId, initialData }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const { data: events, isLoading, refetch } = useEmployeeCareerHistory(employeeId);
  const handleRefresh = useCallback(() => refetch(), [refetch]);

  const { employee } = initialData;
  const displayEvents = events.length > 0 ? events : initialData.events.map((e) => ({
    ...e,
    effectiveDate: e.effectiveDate instanceof Date ? e.effectiveDate.toISOString() : String(e.effectiveDate),
    createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : String(e.createdAt),
    fromManagerId: e.fromManagerId ?? null,
    toManagerId: e.toManagerId ?? null,
    fromLocationId: e.fromLocationId ?? null,
    toLocationId: e.toLocationId ?? null,
  }));

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{employee.firstName} {employee.lastName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{employee.employeeId}</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Event
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Career Timeline</CardTitle>
          <p className="text-xs text-muted-foreground">{displayEvents.length} event{displayEvents.length !== 1 ? "s" : ""} recorded</p>
        </CardHeader>
        <CardContent>
          <CareerTimeline events={displayEvents} isLoading={isLoading && events.length === 0} />
        </CardContent>
      </Card>

      <AddCareerEventDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={handleRefresh}
        prefilledEmployeeId={employeeId}
      />
    </>
  );
}
