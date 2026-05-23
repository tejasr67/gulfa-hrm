import "server-only";
import { createHmac, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import type { WebhookEvent } from "@prisma/client";

// ── Secret management ─────────────────────────────────────────────────────────

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(32).toString("hex")}`;
}

/** We store a display-safe prefix; full secret returned once at creation */
export function signPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

// ── Retry schedule ────────────────────────────────────────────────────────────

const RETRY_DELAYS_SECONDS = [60, 300, 900, 3600, 14400]; // 1m 5m 15m 1h 4h

function nextRetryAt(attempt: number): Date {
  const delaySec = RETRY_DELAYS_SECONDS[attempt] ?? RETRY_DELAYS_SECONDS.at(-1)!;
  return new Date(Date.now() + delaySec * 1000);
}

// ── Enqueue a webhook event for delivery ──────────────────────────────────────

export async function enqueueWebhook(
  companyId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { companyId, isActive: true, events: { has: event } },
    select: { id: true },
  });

  if (endpoints.length === 0) return;

  await prisma.webhookDelivery.createMany({
    data: endpoints.map((ep) => ({
      endpointId: ep.id,
      event,
      payload: payload as never,
      status: "PENDING" as const,
      nextRetryAt: new Date(),
    })),
  });
}

// ── Drain pending deliveries (called by cron) ─────────────────────────────────

export type WebhookDrainResult = { processed: number; sent: number; failed: number };

export async function drainWebhookQueue(batchSize = 100): Promise<WebhookDrainResult> {
  const result: WebhookDrainResult = { processed: 0, sent: 0, failed: 0 };

  const pending = await prisma.webhookDelivery.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      nextRetryAt: { lte: new Date() },
      attempts: { lt: 5 },
    },
    include: { endpoint: { select: { url: true, secret: true, isActive: true } } },
    orderBy: { nextRetryAt: "asc" },
    take: batchSize,
  });

  for (const delivery of pending) {
    if (!delivery.endpoint.isActive) {
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: { status: "ABANDONED", lastError: "Endpoint deactivated" },
      });
      continue;
    }

    result.processed++;
    const attempt = delivery.attempts + 1;
    const body = JSON.stringify(delivery.payload);
    const sig = signPayload(delivery.endpoint.secret, body);

    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: { attempts: attempt, lastAttemptAt: new Date(), status: "PENDING" },
    });

    try {
      const res = await fetch(delivery.endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Gulfa-Signature": `sha256=${sig}`,
          "X-Gulfa-Event": delivery.event,
          "X-Gulfa-Delivery": delivery.id,
        },
        body,
        signal: AbortSignal.timeout(15_000),
      });

      const responseBody = await res.text().catch(() => "");

      if (res.ok) {
        await prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: "SUCCESS",
            responseStatus: res.status,
            responseBody: responseBody.slice(0, 500),
            lastError: null,
          },
        });
        result.sent++;
      } else {
        const isFinal = attempt >= 5;
        await prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: isFinal ? "ABANDONED" : "FAILED",
            responseStatus: res.status,
            responseBody: responseBody.slice(0, 500),
            lastError: `HTTP ${res.status}`,
            nextRetryAt: isFinal ? undefined : nextRetryAt(attempt),
          },
        });
        result.failed++;
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      const isFinal = attempt >= 5;
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: isFinal ? "ABANDONED" : "FAILED",
          lastError: errMsg,
          nextRetryAt: isFinal ? undefined : nextRetryAt(attempt),
        },
      });
      result.failed++;
    }
  }

  return result;
}
