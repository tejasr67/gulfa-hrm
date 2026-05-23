"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, X, Check, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

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

const TYPE_COLORS: Record<string, string> = {
  DOCUMENT_EXPIRY: "bg-red-50 border-red-100",
  LEAVE_APPROVED: "bg-green-50 border-green-100",
  LEAVE_REJECTED: "bg-red-50 border-red-100",
  DISCIPLINARY: "bg-orange-50 border-orange-100",
  PROBATION_REMINDER: "bg-amber-50 border-amber-100",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(async () => {
    try {
      const r = await fetch("/api/notifications/count");
      const j = await r.json();
      if (j.success) setUnreadCount(j.data.count);
    } catch { /* silent */ }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await fetch("/api/notifications?limit=20");
      const j = await r.json();
      if (j.success) setNotifications(j.data);
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }, []);

  // Poll unread count every 60s
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  // Close on click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleOpen() {
    setOpen((o) => {
      if (!o) fetchNotifications();
      return !o;
    });
  }

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

  const unreadNotifications = notifications.filter((n) => !n.isRead);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-96 rounded-xl border bg-background shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-100 text-red-700 text-xs px-1.5 py-0.5 font-medium">{unreadCount} new</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors">
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y">
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">You&apos;re all caught up</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex gap-3 px-4 py-3 transition-colors ${!n.isRead ? "bg-blue-50/50" : "hover:bg-muted/30"}`}
                >
                  <span className="text-lg shrink-0 mt-0.5">{TYPE_ICONS[n.type] ?? "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.isRead ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.isRead && (
                    <button onClick={() => markRead(n.id)} className="shrink-0 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors mt-0.5" title="Mark read">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-2.5">
            <Link href="/notifications" onClick={() => setOpen(false)} className="text-xs text-primary hover:underline">
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
