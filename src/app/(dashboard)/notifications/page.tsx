import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { NotificationsClient } from "./NotificationsClient";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="System alerts, approvals, and in-app messages" />
      <NotificationsClient />
    </div>
  );
}
