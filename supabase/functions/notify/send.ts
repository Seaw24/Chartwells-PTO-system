// Sends over Gmail SMTP with an App Password. The only file that knows the provider: moving to
// Resend or another account means changing this file and the settings, nothing else.
import nodemailer from "npm:nodemailer@6.9.16";
import type { OutgoingEmail } from "./plan.ts";

export async function sendAll(emails: OutgoingEmail[]): Promise<{ sent: number; failed: number }> {
  if (emails.length === 0) return { sent: 0, failed: 0 };
  const user = Deno.env.get("GMAIL_USER");
  const pass = Deno.env.get("GMAIL_APP_PASSWORD");
  if (!user || !pass) throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be set.");
  // Pooled, so a batch of approvers reuses one TLS+AUTH connection instead of paying for a fresh
  // one per message; a fresh connection per recipient is slow enough that an HR-plus-several-
  // managers batch can outrun pg_net's timeout.
  const transport = nodemailer.createTransport({
    pool: true,
    maxConnections: 1,
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    // Google shows App Passwords in groups of four; the spaces are not part of it.
    auth: { user, pass: pass.replace(/\s+/g, "") },
  });
  const from = { name: Deno.env.get("EMAIL_FROM_NAME") ?? "Chartwells PTO", address: user };
  let sent = 0;
  let failed = 0;
  try {
    for (const email of emails) {
      try {
        await transport.sendMail({
          from,
          to: email.to,
          subject: email.subject,
          html: email.html,
          text: email.text,
        });
        sent++;
      } catch (error) {
        failed++;
        console.error(`notify: sending "${email.subject}" to ${email.to} failed`, error);
      }
    }
  } finally {
    transport.close();
  }
  return { sent, failed };
}
