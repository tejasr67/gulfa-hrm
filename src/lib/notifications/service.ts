import "server-only";
import { prisma } from "@/lib/prisma";
import type { NotificationType, NotificationChannel } from "@prisma/client";

// ── Payload contract ───────────────────────────────────────────────────────

export type NotifyPayload = {
  companyId: string;
  type: NotificationType;
  title: string;
  message: string;
  /** Target employee for in-app delivery */
  employeeId?: string;
  /** JSON metadata attached to the in-app notification */
  data?: Record<string, unknown>;
  /** If provided, queues an email */
  email?: {
    to: string;
    subject: string;
    html: string;
    text: string;
    /** Recipient employee id for dedup/audit */
    recipientId?: string;
  };
};

// ── Core send ──────────────────────────────────────────────────────────────

/**
 * Creates an in-app notification and (if email payload present)
 * enqueues an email for async delivery. Never throws — failures are logged.
 */
export async function notify(payload: NotifyPayload): Promise<void> {
  const ops: Promise<unknown>[] = [];

  // In-app
  ops.push(
    prisma.notification.create({
      data: {
        companyId: payload.companyId,
        employeeId: payload.employeeId ?? null,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        channel: "IN_APP" as NotificationChannel,
        data: (payload.data ?? undefined) as never,
      },
    }).catch((e) => console.error("[notify] in-app write failed:", e))
  );

  // Email queue
  if (payload.email) {
    const { to, subject, html, text, recipientId } = payload.email;
    ops.push(
      prisma.notificationQueue.create({
        data: {
          companyId: payload.companyId,
          type: payload.type,
          channel: "EMAIL" as NotificationChannel,
          recipientEmail: to,
          recipientId: recipientId ?? payload.employeeId ?? null,
          subject,
          bodyHtml: html,
          bodyText: text,
          metadata: (payload.data ?? undefined) as never,
        },
      }).catch((e) => console.error("[notify] queue write failed:", e))
    );
  }

  await Promise.all(ops);
}

export async function notifyBulk(payloads: NotifyPayload[]): Promise<void> {
  await Promise.all(payloads.map(notify));
}

// ── Queue drain (called by cron) ───────────────────────────────────────────

export type DrainResult = {
  processed: number;
  sent: number;
  failed: number;
};

export async function drainEmailQueue(batchSize = 50): Promise<DrainResult> {
  const { resend } = await import("@/lib/email/resend");
  const { FROM_EMAIL } = await import("@/lib/email/resend");

  const result: DrainResult = { processed: 0, sent: 0, failed: 0 };

  const pending = await prisma.notificationQueue.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      scheduledAt: { lte: new Date() },
    },
    orderBy: { scheduledAt: "asc" },
    take: batchSize,
  });

  for (const item of pending) {
    if (item.attempts >= item.maxAttempts) {
      await prisma.notificationQueue.update({
        where: { id: item.id },
        data: { status: "FAILED", lastError: "Max attempts reached" },
      });
      result.failed++;
      continue;
    }

    result.processed++;

    await prisma.notificationQueue.update({
      where: { id: item.id },
      data: { status: "PROCESSING", attempts: { increment: 1 } },
    });

    try {
      if (!item.recipientEmail) throw new Error("No recipient email");

      await resend.emails.send({
        from: FROM_EMAIL,
        to: [item.recipientEmail],
        subject: item.subject,
        html: item.bodyHtml,
        text: item.bodyText,
      });

      await prisma.notificationQueue.update({
        where: { id: item.id },
        data: { status: "SENT", processedAt: new Date(), lastError: null },
      });
      result.sent++;
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error("[drainEmailQueue] send failed:", item.id, errMsg);
      await prisma.notificationQueue.update({
        where: { id: item.id },
        data: {
          status: item.attempts >= item.maxAttempts ? "FAILED" : "PENDING",
          lastError: errMsg,
        },
      });
      result.failed++;
    }
  }

  return result;
}

// ── In-app helpers ─────────────────────────────────────────────────────────

export async function getUnreadCount(employeeId: string): Promise<number> {
  return prisma.notification.count({
    where: { employeeId, isRead: false },
  });
}

export async function markAsRead(ids: string[], employeeId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: { in: ids }, employeeId },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markAllAsRead(employeeId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { employeeId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function getNotifications(
  employeeId: string,
  opts: { unreadOnly?: boolean; limit?: number; offset?: number } = {}
) {
  return prisma.notification.findMany({
    where: {
      employeeId,
      ...(opts.unreadOnly ? { isRead: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 30,
    skip: opts.offset ?? 0,
  });
}

export async function getCompanyNotifications(
  companyId: string,
  opts: { type?: NotificationType; limit?: number } = {}
) {
  return prisma.notification.findMany({
    where: {
      companyId,
      ...(opts.type ? { type: opts.type } : {}),
    },
    include: {
      employee: { select: { firstName: true, lastName: true, employeeId: true } },
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 50,
  });
}

export async function getQueueStats(companyId?: string) {
  const where = companyId ? { companyId } : {};
  const [pending, processing, sent, failed] = await Promise.all([
    prisma.notificationQueue.count({ where: { ...where, status: "PENDING" } }),
    prisma.notificationQueue.count({ where: { ...where, status: "PROCESSING" } }),
    prisma.notificationQueue.count({ where: { ...where, status: "SENT" } }),
    prisma.notificationQueue.count({ where: { ...where, status: "FAILED" } }),
  ]);
  return { pending, processing, sent, failed, total: pending + processing + sent + failed };
}
