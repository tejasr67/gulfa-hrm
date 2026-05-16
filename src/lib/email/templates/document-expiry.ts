export type DocumentExpiryEmailData = {
  employeeName: string;
  documentType: string;
  documentNumber: string | null;
  expiryDate: string;        // formatted e.g. "15 Jun 2026"
  daysUntilExpiry: number;
  renewalLink?: string;
};

export function buildDocumentExpiryEmail(data: DocumentExpiryEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const { employeeName, documentType, documentNumber, expiryDate, daysUntilExpiry, renewalLink } = data;

  const isExpired = daysUntilExpiry < 0;
  const urgencyColor = isExpired ? "#dc2626" : daysUntilExpiry <= 30 ? "#ea580c" : "#d97706";
  const urgencyLabel = isExpired
    ? `EXPIRED ${Math.abs(daysUntilExpiry)} day(s) ago`
    : `Expiring in ${daysUntilExpiry} day(s)`;

  const subject = isExpired
    ? `[URGENT] ${documentType} has expired — ${employeeName}`
    : `[Action Required] ${documentType} expiring in ${daysUntilExpiry} days — ${employeeName}`;

  const docRef = documentNumber ? ` (${documentNumber})` : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <!-- Header -->
        <tr><td style="background:${urgencyColor};padding:24px 32px">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">Document Expiry Alert</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.9);font-size:14px">${urgencyLabel}</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px">
          <p style="margin:0 0 24px;color:#374151;font-size:16px">Dear HR Team,</p>
          <p style="margin:0 0 24px;color:#374151;font-size:15px">
            The following employee document requires immediate attention:
          </p>
          <table width="100%" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px">
            <tr style="background:#f9fafb">
              <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;width:40%">Employee</td>
              <td style="padding:12px 16px;font-size:14px;color:#111827">${employeeName}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb">Document Type</td>
              <td style="padding:12px 16px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb">${documentType}${docRef}</td>
            </tr>
            <tr style="background:#f9fafb">
              <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb">Expiry Date</td>
              <td style="padding:12px 16px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb">${expiryDate}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb">Status</td>
              <td style="padding:12px 16px;border-top:1px solid #e5e7eb">
                <span style="background:${urgencyColor};color:#fff;padding:3px 10px;border-radius:9999px;font-size:12px;font-weight:600">${urgencyLabel}</span>
              </td>
            </tr>
          </table>
          ${renewalLink ? `<a href="${renewalLink}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View Document</a>` : ""}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
          <p style="margin:0;color:#9ca3af;font-size:12px">Gulfa HRM — Automated Document Compliance Alert</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Document Expiry Alert — ${urgencyLabel}

Employee: ${employeeName}
Document: ${documentType}${docRef}
Expiry Date: ${expiryDate}
Status: ${urgencyLabel}

${renewalLink ? `View Document: ${renewalLink}` : ""}

Gulfa HRM — Automated Document Compliance Alert`;

  return { subject, html, text };
}
