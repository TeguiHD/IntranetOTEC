import nodemailer from "nodemailer";

const tlsRejectUnauthorized =
  process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false";

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
  tls: {
    rejectUnauthorized: tlsRejectUnauthorized,
  },
});

const FROM = process.env.SMTP_FROM || "Mi OTEC <noreply@miotecimpulsate.cl>";

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  if (!process.env.SMTP_HOST) {
    console.log(
      `[email] SMTP not configured. Would send to=${to} subject="${subject}"`,
    );
    return false;
  }
  try {
    await transport.sendMail({ from: FROM, to, subject, html });
    return true;
  } catch (err) {
    console.error("[email] Failed to send:", err);
    return false;
  }
}
