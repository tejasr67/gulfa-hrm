"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, CheckCheck, Filter, RefreshCw } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: unknown;
};

const TYPE_ICONS: Record<string, string> = {
  DOCUMENT_EXPIRY: "📄",
  LEAVE_APPROVED: "✅",
  LEAVE_REJECTED: "❌",
  LEAVE_REQUEST: "📋",
  PAYSLIP_READY: "💰",
  PAYROLL_COMPLETE: "💳",
  DISCIPLINARY: "⚠️",
  PROBATION_REMINDER: "⏳",
  BIRTHDAY: "🎂",
  ANNIVERSARY: "🎉",
  GENERAL: "🔔",
};

const TYPE_LABELS: Record<string, string> = {
  DOCUMENT_EXPIRY: "Document Expiry",
  LEAVE_APPROVED: "Leave Approved",
  LEAVE_REJECTED: "Leave Rejected",
  LEAVE_REQUEST: "Leave Request",
  PAYSLIP_READY: "Payslip",
  PAYROLL_COMPLETE: "Payroll",
  DISCIPLINARY: "Disciplinary",
  PROBATION_REMINDER: "Probation",
  BIRTHDAY: "Birthday",
  ANNIVERSARY: "Anniversary",
  GENERAL: "General",
};

const FILTER_TYPES = ["ALL", "UNREAD", "DOCUMENT_EXPIRY", "LEAVE_APPROVED", "LEAVE_REJECTED", "PAYSLIP_READY", "DISCIPLINARY", "PROBATION_REMINDER"];

export function NotificationsClient() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const unreadOnly = filter === "UNREAD" ? "&unreadOnly=1" : "";
      const r = await fetch(`/api/notifications?limit=50${unreadOnly}`);
      const j = await r.json();
      if (j.success) setNotifications(j.data);
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }, [filter]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  useEffect(() => {
    fetch("/api/notifications/count")
      .then((r) => r.json())
      .then((j) => { if (j.success) setUnreadCount(j.data.count); })
      .catch(() => {});
  }, [notifications]);

  async function markAllRead() {
    await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setNotifications((ns) => ns.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  async function markRead(id: string) {
    await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    setNotifications((ns) => ns.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  const filtered = filter === "ALL" || filter === "UNREAD"
    ? notifications
    : notifications.filter((n) => n.type === filter);

  const groupedByDate = filtered.reduce<Record<string, NotificationItem[]>>((acc, n) => {
    const key = format(new Date(n.createdAt), "dd MMM yyyy");
    if (!acc[key]) acc[key] = [];
    acc[key].push(n);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {FILTER_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === t ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              {t === "ALL" ? `All (${notifications.length})` : t === "UNREAD" ? `Unread (${unreadCount})` : TYPE_LABELS[t] ?? t}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" onClick={markAllRead}>
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={fetchNotifications}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading notifications…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Bell className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium">No notifications</p>
          <p className="text-sm text-muted-foreground mt-1">
            {filter === "UNREAD" ? "You're all caught up!" : "Nothing to show for this filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([date, items]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{date}</p>
              <Card>
                <CardContent className="p-0 divide-y">
                  {items.map((n) => (
                    <div
                      key={n.id}
                      className={`flex gap-4 px-5 py-4 transition-colors ${!n.isRead ? "bg-blue-50/40" : "hover:bg-muted/20"}`}
                    >
                      <div className="shrink-0 mt-0.5 text-xl">{TYPE_ICONS[n.type] ?? "🔔"}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={`text-sm ${!n.isRead ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                            </span>
                            {!n.isRead && (
                              <button
                                onClick={() => markRead(n.id)}
                                className="text-xs text-primary hover:underline whitespace-nowrap"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {TYPE_LABELS[n.type] ?? n.type}
                          </span>
                          {!n.isRead && (
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
