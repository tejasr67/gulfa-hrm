"use client";

import { useState, useMemo } from "react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isToday, isSameDay,
  addMonths, subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { LeaveCalendarEntry } from "@/modules/leave/types";

// Color by leave type code (deterministic)
function leaveColor(code: string): string {
  const colors = [
    "bg-blue-100 text-blue-700 border-blue-200",
    "bg-emerald-100 text-emerald-700 border-emerald-200",
    "bg-purple-100 text-purple-700 border-purple-200",
    "bg-amber-100 text-amber-700 border-amber-200",
    "bg-rose-100 text-rose-700 border-rose-200",
    "bg-cyan-100 text-cyan-700 border-cyan-200",
  ];
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) % colors.length;
  return colors[hash];
}

type Props = {
  entries: LeaveCalendarEntry[];
  onMonthChange: (from: Date, to: Date) => void;
};

export function LeaveCalendar({ entries, onMonthChange }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  function navigate(dir: "prev" | "next") {
    const next = dir === "prev" ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1);
    setCurrentMonth(next);
    onMonthChange(startOfMonth(next), endOfMonth(next));
  }

  function getEntriesForDay(day: Date): LeaveCalendarEntry[] {
    const ds = format(day, "yyyy-MM-dd");
    return entries.filter((e) => e.startDate <= ds && e.endDate >= ds);
  }

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("prev")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-base font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <Button variant="ghost" size="icon" onClick={() => navigate("next")}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {DAY_NAMES.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, i) => {
            const dayEntries = getEntriesForDay(day);
            const inMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);

            return (
              <div
                key={i}
                className={cn(
                  "min-h-[90px] border-b border-r p-1.5",
                  !inMonth && "bg-muted/20",
                  today && "bg-primary/5",
                  (i + 1) % 7 === 0 && "border-r-0"
                )}
              >
                <div className={cn(
                  "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                  !inMonth && "text-muted-foreground/40",
                  today && "bg-primary text-primary-foreground"
                )}>
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {dayEntries.slice(0, 3).map((entry) => (
                    <div
                      key={entry.id}
                      title={`${entry.employeeName} — ${entry.leaveTypeName}`}
                      className={cn(
                        "truncate rounded border px-1 py-0.5 text-[10px] font-medium",
                        leaveColor(entry.leaveTypeCode)
                      )}
                    >
                      {entry.employeeName.split(" ")[0]}
                    </div>
                  ))}
                  {dayEntries.length > 3 && (
                    <div className="text-[10px] text-muted-foreground px-1">
                      +{dayEntries.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
