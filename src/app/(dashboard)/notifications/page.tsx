import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="System alerts and in-app messages"
      />
      <EmptyState
        icon={Bell}
        title="No notifications"
        description="You're all caught up. Notifications will appear here."
      />
    </div>
  );
}
