// Markup for the notification emails. Pure: no Deno or network APIs, so Node's tests import it.
// Built to survive Outlook desktop (the company runs Microsoft 365) as well as Gmail and phones:
// table layout, inline styles, and a VML button for Outlook. Colours are the light-theme tokens
// from src/index.css converted from OKLCH, which email clients don't support.

export type Status = "approved" | "pending" | "denied";
export type DecisionKind = "stamped" | "denied" | "unstamped" | "undenied";
export type Role = "Manager" | "HR";
export type EmailContent = { subject: string; html: string; text: string };
export type DecisionInput = {
  kind: DecisionKind;
  actorName: string;
  actorRole: Role;
  summary: string;
  status: Status;
  statusLine: string | null;
  reason: string | null;
  link: string;
};

const c = {
  navy: "#12233B",
  navyFg: "#EEF2F7",
  accent: "#F5723D",
  accentStrong: "#C5512A",
  accentInk: "#B3421E",
  ink: "#1D2735",
  inkSoft: "#4A5361",
  inkMute: "#656E7A",
  line: "#DCE0E6",
  surface: "#F2F5F9",
  card: "#FDFEFF",
  panel: "#EAEDF2",
};
const tones: Record<Status, { bg: string; fg: string; label: string }> = {
  approved: { bg: "#D9F9E8", fg: "#007146", label: "Approved" },
  pending: { bg: "#FFEECB", fg: "#8B5E22", label: "Pending" },
  denied: { bg: "#FFE6E7", fg: "#C12445", label: "Denied" },
};
// Exported so plan.ts's test-mode banner matches the rest of the email instead of duplicating it.
export const font =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Status always pairs a word with its colour, like the app's StatusChip.
function statusPill(status: Status): string {
  const t = tones[status];
  return `<span style="display:inline-block;padding:3px 10px;border-radius:7px;background:${t.bg};color:${t.fg};font-family:${font};font-size:12px;line-height:18px;font-weight:600;letter-spacing:0.02em;">${t.label}</span>`;
}

// Outlook desktop draws the VML version; everything else draws the link.
function button(label: string, href: string): string {
  const url = escapeHtml(href);
  const text = escapeHtml(label);
  return [
    "<!--[if mso]>",
    `<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="20%" stroke="f" fillcolor="${c.accentStrong}">`,
    `<w:anchorlock/><center style="color:#FFFFFF;font-family:'Segoe UI',Arial,sans-serif;font-size:15px;font-weight:600;">${text}</center>`,
    "</v:roundrect>",
    "<![endif]-->",
    "<!--[if !mso]><!-->",
    `<a href="${url}" style="display:inline-block;background:${c.accentStrong};color:#FFFFFF;font-family:${font};font-size:15px;font-weight:600;line-height:44px;padding:0 24px;border-radius:9px;text-decoration:none;">${text}</a>`,
    "<!--<![endif]-->",
  ].join("");
}

type Layout = {
  title: string;
  preheader: string;
  status?: Status;
  heading: string; // escaped HTML
  detail?: string; // escaped HTML
  paragraphs: string[]; // escaped HTML
  button: { label: string; href: string };
};

function layout(p: Layout): string {
  const href = escapeHtml(p.button.href);
  const detail = p.detail
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:20px;"><tr><td style="background:${c.panel};border-radius:9px;padding:12px 16px;font-family:${font};font-size:14px;line-height:20px;font-weight:600;color:${c.ink};">${p.detail}</td></tr></table>`
    : "";
  const paragraphs = p.paragraphs
    .map(
      (html) =>
        `<p style="margin:14px 0 0;font-family:${font};font-size:15px;line-height:23px;color:${c.inkSoft};">${html}</p>`,
    )
    .join("");
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(p.title)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
@media (max-width: 620px) { .shell { width: 100% !important; } .pad { padding-left: 20px !important; padding-right: 20px !important; } }
</style>
</head>
<body style="margin:0;padding:0;background:${c.surface};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(p.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${c.surface};">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" class="shell" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;">
<tr><td class="pad" style="background:${c.navy};border-radius:13px 13px 0 0;padding:18px 28px;font-family:${font};font-size:15px;line-height:20px;font-weight:700;letter-spacing:-0.01em;color:${c.navyFg};">Chartwells PTO <span style="color:${c.accent};">&#9679;</span></td></tr>
<tr><td class="pad" style="background:${c.card};border:1px solid ${c.line};border-top:0;border-radius:0 0 13px 13px;padding:32px 28px;font-family:${font};color:${c.ink};">
${p.status ? statusPill(p.status) : ""}
<h1 style="margin:${p.status ? "14px" : "0"} 0 0;font-family:${font};font-size:20px;line-height:28px;font-weight:700;letter-spacing:-0.018em;color:${c.ink};">${p.heading}</h1>
${detail}
${paragraphs}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;"><tr><td>${button(p.button.label, p.button.href)}</td></tr></table>
<p style="margin:28px 0 0;padding-top:20px;border-top:1px solid ${c.line};font-family:${font};font-size:12px;line-height:18px;color:${c.inkMute};">If the button doesn't work, copy this link into your browser:<br><a href="${href}" style="color:${c.accentInk};word-break:break-all;">${href}</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function newRequestEmail(p: { requesterName: string; link: string }): EmailContent {
  const subject = `New time off request from ${p.requesterName}`;
  return {
    subject,
    html: layout({
      title: subject,
      preheader: `${p.requesterName} is waiting on your approval.`,
      heading: "New time off request",
      paragraphs: [
        `You got a time off request from <strong style="color:${c.ink};">${escapeHtml(p.requesterName)}</strong>.`,
      ],
      button: { label: "Review in Approvals", href: p.link },
    }),
    text: `You got a time off request from ${p.requesterName}.\n\nReview in Approvals: ${p.link}\n`,
  };
}

const subjects: Record<DecisionKind, (actor: string) => string> = {
  stamped: (actor) => `${actor} approved your time off`,
  denied: (actor) => `${actor} denied your time off`,
  unstamped: (actor) => `${actor} took back their approval`,
  undenied: (actor) => `${actor} undid the denial of your time off`,
};
const headlines: Record<DecisionKind, string> = {
  stamped: "approved your time off.",
  denied: "denied your time off.",
  unstamped: "took back their approval.",
  undenied: "undid the denial of your time off.",
};

export function decisionEmail(p: DecisionInput): EmailContent {
  const subject = subjects[p.kind](p.actorName);
  const headline = `${p.actorName} (${p.actorRole}) ${headlines[p.kind]}`;
  const paragraphs: string[] = [];
  const lines = [headline, "", p.summary];
  if (p.statusLine) {
    paragraphs.push(escapeHtml(p.statusLine));
    lines.push(p.statusLine);
  }
  if (p.reason) {
    paragraphs.push(`<strong style="color:${c.ink};">Reason:</strong> ${escapeHtml(p.reason)}`);
    lines.push(`Reason: ${p.reason}`);
  }
  lines.push("", `View request: ${p.link}`);
  return {
    subject,
    html: layout({
      title: subject,
      preheader: p.summary,
      status: p.status,
      heading: escapeHtml(headline),
      detail: escapeHtml(p.summary),
      paragraphs,
      button: { label: "View request", href: p.link },
    }),
    text: `${lines.join("\n")}\n`,
  };
}
