"use client";

import * as React from "react";
import {
  Edit,
  UserPlus,
  FileText,
  TrendingUp,
  Shield,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  User,
} from "lucide-react";
import { formatRelativeTime, formatDate } from "@/lib/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

type TimelineEvent = {
  id: string;
  type: "AUDIT" | "CAREER" | "DOCUMENT" | "STATUS_CHANGE";
  action: string;
  description: string;
  performedBy?: string | null;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
};

type Props = {
  events: TimelineEvent[];
  isLoading?: boolean;
};

type EventStyle = {
  icon: React.ReactNode;
  circleClass: string;
};

function getEventStyle(type: TimelineEvent["type"]): EventStyle {
  switch (type) {
    case "CAREER":
      return {
        icon: <TrendingUp className="h-3.5 w-3.5" />,
        circleClass: "bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
      };
    case "DOCUMENT":
      return {
        icon: <FileText className="h-3.5 w-3.5" />,
        circleClass: "bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
      };
    case "STATUS_CHANGE":
      return {
        icon: <Shield className="h-3.5 w-3.5" />,
        circleClass: "bg-orange-100 text-orange-600 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
      };
    case "AUDIT":
    default:
      return {
        icon: <Edit className="h-3.5 w-3.5" />,
        circleClass: "bg-muted text-muted-foreground border-border",
      };
  }
}

function getActionBadgeVariant(
  type: TimelineEvent["type"]
): "default" | "secondary" | "success" | "warning" | "info" | "outline" {
  switch (type) {
    case "CAREER":
      return "success";
    case "DOCUMENT":
      return "info";
    case "STATUS_CHANGE":
      return "warning";
    case "AUDIT":
    default:
      return "secondary";
  }
}

function SkeletonRow() {
  return (
    <li className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="h-7 w-7 rounded-full bg-muted animate-pulse border border-border" />
        <div className="w-0.5 flex-1 bg-muted mt-1 min-h-[2rem] animate-pulse" />
      </div>
      <div className="pb-6 flex-1 space-y-2 pt-0.5">
        <div className="h-4 bg-muted rounded animate-pulse w-24" />
        <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
        <div className="h-3 bg-muted rounded animate-pulse w-16" />
      </div>
    </li>
  );
}

export function ActivityTimeline({ events, isLoading = false }: Props) {
  if (isLoading) {
    return (
      <ul className="space-y-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </ul>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Clock className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-0">
      {events.map((event, index) => {
        const { icon, circleClass } = getEventStyle(event.type);
        const isLast = index === events.length - 1;
        const badgeVariant = getActionBadgeVariant(event.type);

        return (
          <li key={event.id} className="flex gap-4">
            {/* Left: icon + vertical line */}
            <div className="flex flex-col items-center shrink-0">
              <div
                className={cn(
                  "h-7 w-7 rounded-full border flex items-center justify-center shrink-0 z-10",
                  circleClass
                )}
              >
                {icon}
              </div>
              {!isLast && (
                <div className="w-0.5 flex-1 bg-muted mt-1 min-h-[1.5rem]" />
              )}
            </div>

            {/* Right: content */}
            <div className={cn("flex-1 pb-6 pt-0.5", isLast && "pb-0")}>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Badge variant={badgeVariant} className="text-xs">
                  {event.action}
                </Badge>
              </div>
              <p className="text-sm text-foreground leading-snug">
                {event.description}
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(event.createdAt)}
                </span>
                {event.performedBy && (
                  <>
                    <span className="text-xs text-muted-foreground/50">·</span>
                    <span className="text-xs text-muted-foreground">
                      by {event.performedBy}
                    </span>
                  </>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
