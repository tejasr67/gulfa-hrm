"use client";

import { format } from "date-fns";
import {
  TrendingUp, TrendingDown, ArrowLeftRight, Briefcase,
  DollarSign, CheckCircle, UserCheck, ChevronRight,
} from "lucide-react";
import type { EmployeeCareerEvent } from "@/modules/career/hooks";

const EVENT_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  PROMOTION: { label: "Promotion", icon: TrendingUp, color: "text-emerald-700", bg: "bg-emerald-50" },
  DEMOTION: { label: "Demotion", icon: TrendingDown, color: "text-red-700", bg: "bg-red-50" },
  TRANSFER: { label: "Transfer", icon: ArrowLeftRight, color: "text-blue-700", bg: "bg-blue-50" },
  ROLE_CHANGE: { label: "Role Change", icon: Briefcase, color: "text-purple-700", bg: "bg-purple-50" },
  SALARY_REVISION: { label: "Salary Revision", icon: DollarSign, color: "text-amber-700", bg: "bg-amber-50" },
  PROBATION_COMPLETION: { label: "Probation Completed", icon: CheckCircle, color: "text-teal-700", bg: "bg-teal-50" },
  MANAGER_CHANGE: { label: "Manager Change", icon: UserCheck, color: "text-indigo-700", bg: "bg-indigo-50" },
};

function EventCard({ event }: { event: EmployeeCareerEvent }) {
  const cfg = EVENT_CONFIG[event.type] ?? { label: event.type, icon: Briefcase, color: "text-gray-700", bg: "bg-gray-50" };
  const Icon = cfg.icon;

  const changes: string[] = [];
  if (event.fromPosition && event.toPosition) changes.push(`${event.fromPosition} → ${event.toPosition}`);
  else if (event.toPosition) changes.push(`Position: ${event.toPosition}`);
  if (event.fromDepartment && event.toDepartment) changes.push(`${event.fromDepartment} → ${event.toDepartment}`);
  else if (event.toDepartment) changes.push(`Department: ${event.toDepartment}`);
  if (event.fromSalary != null && event.toSalary != null) {
    const delta = event.toSalary - event.fromSalary;
    const pct = event.fromSalary > 0 ? ((delta / event.fromSalary) * 100).toFixed(1) : null;
    changes.push(`AED ${event.fromSalary.toLocaleString()} → AED ${event.toSalary.toLocaleString()}${pct ? ` (${delta > 0 ? "+" : ""}${pct}%)` : ""}`);
  } else if (event.toSalary != null) {
    changes.push(`New salary: AED ${event.toSalary.toLocaleString()}`);
  }

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}>
          <Icon className={`h-4 w-4 ${cfg.color}`} />
        </div>
        <div className="mt-1 w-px flex-1 bg-border" />
      </div>
      <div className="pb-6 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.color}`}>{cfg.label}</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(new Date(event.effectiveDate), "dd MMM yyyy")}
            </p>
          </div>
          {event.approvedBy && (
            <span className="text-xs text-muted-foreground shrink-0">Approved by {event.approvedBy}</span>
          )}
        </div>

        {changes.length > 0 && (
          <div className="mt-2 space-y-1">
            {changes.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 text-sm">
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <span>{c}</span>
              </div>
            ))}
          </div>
        )}

        {event.reason && (
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Reason:</span> {event.reason}
          </p>
        )}
        {event.notes && (
          <p className="mt-1 text-xs text-muted-foreground">{event.notes}</p>
        )}
      </div>
    </div>
  );
}

type Props = {
  events: EmployeeCareerEvent[];
  isLoading?: boolean;
};

export function CareerTimeline({ events, isLoading }: Props) {
  if (isLoading) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Loading timeline…</div>;
  }

  if (events.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        No career events recorded yet.
      </div>
    );
  }

  return (
    <div className="px-1 pt-2">
      {events.map((e) => (
        <EventCard key={e.id} event={e} />
      ))}
    </div>
  );
}
