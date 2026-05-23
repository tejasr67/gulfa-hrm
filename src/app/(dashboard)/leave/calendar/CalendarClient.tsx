"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { LeaveCalendar } from "@/components/modules/leave/LeaveCalendar";
import type { LeaveCalendarEntry } from "@/modules/leave/types";

type Props = { initialEntries: LeaveCalendarEntry[] };

export function CalendarClient({ initialEntries }: Props) {
  const [entries, setEntries] = useState(initialEntries);

  async function handleMonthChange(from: Date, to: Date) {
    const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
    const data = await fetch(`/api/leave/calendar?${params}`).then((r) => r.json());
    setEntries(data ?? []);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Calendar"
        description="Team leave schedule and availability"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/leave"><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Link>
          </Button>
        }
      />
      <LeaveCalendar entries={entries} onMonthChange={handleMonthChange} />
    </div>
  );
}
