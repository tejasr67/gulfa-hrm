"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, X, FileWarning, Clock, UserCheck } from "lucide-react";
import Link from "next/link";

type Alert = {
  id: string;
  type: "DOCUMENT_EXPIRY" | "PROBATION_REMINDER" | "DISCIPLINARY" | "GENERAL";
  title: string;
  message: string;
  severity: "critical" | "warning" | "info";
  link?: string;
  createdAt: string;
};

const SEVERITY_STYLES = {
  critical: "border-red-200 bg-red-50 text-red-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-blue-200 bg-blue-50 text-blue-900",
};

const SEVERITY_ICON_STYLES = {
  critical: "text-red-500",
  warning: "text-amber-500",
  info: "text-blue-500",
};

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  DOCUMENT_EXPIRY: FileWarning,
  PROBATION_REMINDER: Clock,
  DISCIPLINARY: AlertTriangle,
  GENERAL: AlertTriangle,
};

function severityFromType(type: string): "critical" | "warning" | "info" {
  if (type === "DOCUMENT_EXPIRY" || type === "DISCIPLINARY") return "critical";
  if (type === "PROBATION_REMINDER") return "warning";
  return "info";
}

export function DashboardAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/notifications?unreadOnly=1&limit=5")
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) return;
        const mapped: Alert[] = j.data
          .filter((n: { type: string }) => ["DOCUMENT_EXPIRY", "PROBATION_REMINDER", "DISCIPLINARY"].includes(n.type))
          .map((n: { id: string; type: string; title: string; message: string; createdAt: string }) => ({
            id: n.id,
            type: n.type as Alert["type"],
            title: n.title,
            message: n.message,
            severity: severityFromType(n.type),
            createdAt: n.createdAt,
          }));
        setAlerts(mapped);
      })
      .catch(() => {});
  }, []);

  const visible = alerts.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  async function dismiss(id: string) {
    setDismissed((s) => new Set([...s, id]));
    await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    }).catch(() => {});
  }

  return (
    <div className="space-y-2">
      {visible.map((alert) => {
        const Icon = TYPE_ICONS[alert.type] ?? AlertTriangle;
        return (
          <div
            key={alert.id}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${SEVERITY_STYLES[alert.severity]}`}
          >
            <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${SEVERITY_ICON_STYLES[alert.severity]}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{alert.title}</p>
              <p className="text-xs mt-0.5 opacity-80">{alert.message}</p>
              {alert.link && (
                <Link href={alert.link} className="text-xs font-medium underline mt-1 block">
                  View details
                </Link>
              )}
            </div>
            <button
              onClick={() => dismiss(alert.id)}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
