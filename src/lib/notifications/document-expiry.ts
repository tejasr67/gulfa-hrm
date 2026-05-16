import "server-only";
import { resend, FROM_EMAIL } from "@/lib/email/resend";
import { buildDocumentExpiryEmail } from "@/lib/email/templates/document-expiry";
import { prisma } from "@/lib/prisma";
import {
  getReminderCandidates, getReminderConfig,
  hasReminderBeenSent, recordReminderSent,
} from "@/modules/compliance/queries";
import { format } from "date-fns";

const DEFAULT_REMINDER_DAYS = [90, 60, 30, 14, 7];

export type ReminderRunResult = {
  processed: number;
  emailsSent: number;
  inAppCreated: number;
  skipped: number;
  errors: number;
};

export async function runDocumentExpiryReminders(
  companyId: string
): Promise<ReminderRunResult> {
  const result: ReminderRunResult = {
    processed: 0, emailsSent: 0, inAppCreated: 0, skipped: 0, errors: 0,
  };

  const candidates = await getReminderCandidates(companyId);
  result.processed = candidates.length;

  for (const doc of candidates) {
    const config = await getReminderConfig(companyId, doc.documentTypeId);
    const reminderDays = config?.reminderDays ?? DEFAULT_REMINDER_DAYS;
    const emailEnabled = config?.emailEnabled ?? true;
    const inAppEnabled = config?.inAppEnabled ?? true;

    // Check which reminder threshold we're at
    const matchedDay = reminderDays.find((days) => {
      const diff = doc.daysUntilExpiry - days;
      return diff >= 0 && diff < 1; // within the day
    });

    if (!matchedDay) {
      result.skipped++;
      continue;
    }

    // EMAIL reminder
    if (emailEnabled) {
      const alreadySent = await hasReminderBeenSent(doc.documentId, matchedDay, "EMAIL");
      if (!alreadySent) {
        try {
          const { subject, html, text } = buildDocumentExpiryEmail({
            employeeName: doc.employeeName,
            documentType: doc.documentTypeName,
            documentNumber: doc.documentNumber,
            expiryDate: format(doc.expiryDate, "dd MMM yyyy"),
            daysUntilExpiry: doc.daysUntilExpiry,
          });

          await resend.emails.send({
            from: FROM_EMAIL,
            to: [doc.employeeEmail],
            subject,
            html,
            text,
          });

          await recordReminderSent(doc.documentId, doc.employeeId, companyId, matchedDay, "EMAIL");
          result.emailsSent++;
        } catch (e) {
          console.error("[DocumentExpiry] email failed:", doc.documentId, e);
          result.errors++;
        }
      } else {
        result.skipped++;
      }
    }

    // IN-APP notification
    if (inAppEnabled) {
      const alreadySent = await hasReminderBeenSent(doc.documentId, matchedDay, "IN_APP");
      if (!alreadySent) {
        try {
          const isExpired = doc.daysUntilExpiry < 0;
          const urgency = doc.daysUntilExpiry <= 7 ? "URGENT" : doc.daysUntilExpiry <= 30 ? "HIGH" : "MEDIUM";
          const message = isExpired
            ? `${doc.documentTypeName} has expired`
            : `${doc.documentTypeName} expires in ${doc.daysUntilExpiry} days`;

          await prisma.notification.create({
            data: {
              employeeId: doc.employeeId,
              title: `Document Expiry Alert`,
              message,
              type: "DOCUMENT_EXPIRY",
              data: {
                documentId: doc.documentId,
                documentType: doc.documentTypeName,
                daysUntilExpiry: doc.daysUntilExpiry,
                urgency,
              } as never,
            },
          });

          await recordReminderSent(doc.documentId, doc.employeeId, companyId, matchedDay, "IN_APP");
          result.inAppCreated++;
        } catch (e) {
          console.error("[DocumentExpiry] in-app notification failed:", doc.documentId, e);
          result.errors++;
        }
      } else {
        result.skipped++;
      }
    }
  }

  return result;
}

// Run for ALL companies (called by the global cron)
export async function runDocumentExpiryRemindersAllCompanies(): Promise<Record<string, ReminderRunResult>> {
  const companies = await prisma.company.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true },
  });

  const results: Record<string, ReminderRunResult> = {};
  for (const company of companies) {
    results[company.id] = await runDocumentExpiryReminders(company.id);
  }
  return results;
}
