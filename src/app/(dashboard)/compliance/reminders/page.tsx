import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ReminderConfigPanel } from "@/components/modules/compliance/ReminderConfigPanel";

export const metadata: Metadata = { title: "Reminder Settings" };

export default async function ComplianceRemindersPage() {
  const { companyId } = await requireSession();

  // Load global (null documentTypeId) config if it exists
  const globalConfig = await prisma.documentReminderConfig.findFirst({
    where: { companyId, documentTypeId: null },
  });

  // Recent reminder log (last 20)
  const recentLogs = await prisma.documentReminderLog.findMany({
    where: { companyId },
    orderBy: { sentAt: "desc" },
    take: 20,
    select: { id: true, documentId: true, employeeId: true, reminderDays: true, channel: true, sentAt: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reminder Settings"
        description="Configure automatic document expiry notification rules"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/compliance">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="font-semibold">Global Reminder Rules</h2>
          <p className="text-sm text-muted-foreground">
            These rules apply to all document types unless overridden per type.
          </p>
          <ReminderConfigPanel
            initial={
              globalConfig
                ? {
                    reminderDays: globalConfig.reminderDays,
                    notifyEmployee: globalConfig.notifyEmployee,
                    notifyHR: globalConfig.notifyHR,
                    notifyManager: globalConfig.notifyManager,
                    emailEnabled: globalConfig.emailEnabled,
                    inAppEnabled: globalConfig.inAppEnabled,
                    isEnabled: globalConfig.isEnabled,
                  }
                : undefined
            }
          />
        </div>

        <div className="space-y-4">
          <h2 className="font-semibold">Recent Reminders Sent</h2>
          {recentLogs.length === 0 ? (
            <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
              No reminders have been sent yet
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Channel</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Threshold</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Sent At</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <span className={`text-xs font-medium ${log.channel === "EMAIL" ? "text-blue-600" : "text-purple-600"}`}>
                          {log.channel}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{log.reminderDays}d</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {new Date(log.sentAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
