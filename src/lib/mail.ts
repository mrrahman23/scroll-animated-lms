import "server-only";

/**
 * Optional email via SMTP (e.g. your cPanel mailbox). Configure:
 *   SMTP_HOST, SMTP_PORT (465 or 587), SMTP_USER, SMTP_PASS, MAIL_FROM
 *   ADMIN_NOTIFY_EMAIL — where new contact messages / applications are sent
 * Without SMTP_HOST, emails are skipped silently (in-app notifications still work).
 */
export const mailEnabled = () => Boolean(process.env.SMTP_HOST);

export async function sendMail(to: string, subject: string, text: string) {
  if (!mailEnabled() || !to) return false;
  try {
    const nodemailer = await import("nodemailer");
    const port = Number(process.env.SMTP_PORT ?? 465);
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    await transport.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text });
    return true;
  } catch (err) {
    console.error("[mail] send failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

export const adminInbox = () => process.env.ADMIN_NOTIFY_EMAIL || "";
