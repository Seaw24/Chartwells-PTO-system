// Turns what happened (events from the database) into the emails to send. Pure: no Deno or network
// APIs, so Node's tests import it. index.ts loads the rows; send.ts sends the result.
import { decisionEmail, newRequestEmail } from "./email.ts";
import type { DecisionInput, DecisionKind, Role, Status } from "./email.ts";

export type NotifyEvent = {
  kind: "submitted" | DecisionKind;
  request_id: string;
  slot?: "team" | "god" | null;
  override?: boolean;
  actor?: string | null;
};
export type Person = {
  id: string;
  name: string;
  email: string | null;
  org_role: string;
  is_active: boolean;
};
export type Membership = { team_id: string; user_id: string; role: string };
export type RequestLine = {
  pto_type_id: string;
  start_date: string;
  end_date: string;
  holiday_name: string | null;
};
export type RequestRow = {
  id: string;
  requester_id: string;
  status: string;
  denial_reason: string | null;
  lines: RequestLine[];
};
export type PtoType = { id: string; name: string };
export type Snapshot = {
  requests: RequestRow[];
  people: Person[];
  memberships: Membership[];
  types: PtoType[];
};
export type OutgoingEmail = { to: string; subject: string; html: string; text: string };

// "Mon, Nov 2". Dates are calendar days, so they are read and written in UTC to avoid shifting.
export function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatRange(start: string, end: string): string {
  return start === end ? formatDay(start) : `${formatDay(start)} – ${formatDay(end)}`;
}

// One line naming the request, so someone with several in flight knows which one this is.
export function describeRequest(r: RequestRow, types: PtoType[]): string {
  const parts = [...r.lines]
    .sort((a, b) => (a.start_date < b.start_date ? -1 : 1))
    .map((line) => {
      const range = formatRange(line.start_date, line.end_date);
      if (line.holiday_name) return `Holiday Day Off for ${line.holiday_name} · ${range}`;
      const type = types.find((t) => t.id === line.pto_type_id)?.name ?? "Time off";
      return `${type} · ${range}`;
    });
  return parts.join("; ") || "Time off";
}

// Who can approve this person's requests: active Managers of any team they are in, plus every
// active HR user. Never the person themselves.
export function approversFor(requesterId: string, snapshot: Snapshot): Person[] {
  const teams = new Set(
    snapshot.memberships.filter((m) => m.user_id === requesterId).map((m) => m.team_id),
  );
  const managers = new Set(
    snapshot.memberships
      .filter((m) => m.role === "admin" && teams.has(m.team_id))
      .map((m) => m.user_id),
  );
  return snapshot.people.filter(
    (p) =>
      p.is_active &&
      !!p.email &&
      p.id !== requesterId &&
      (p.org_role === "god_admin" || managers.has(p.id)),
  );
}

// A stamp's role comes from its slot (an override is HR filling the Manager slot); a denial's from
// the slot it came from; a removed stamp's from the account of whoever removed it.
function actorRole(e: NotifyEvent, actor: Person | undefined): Role {
  if (e.kind === "unstamped") return actor?.org_role === "god_admin" ? "HR" : "Manager";
  if (e.kind === "stamped" && e.override) return "HR";
  return e.slot === "god" ? "HR" : "Manager";
}

function statusLine(e: NotifyEvent, status: Status): string | null {
  if (status === "approved") return "It's fully approved.";
  if (status === "denied") return null;
  if (e.kind === "stamped") {
    return e.slot === "team" ? "It's now waiting on HR." : "It's now waiting on your manager.";
  }
  return "Your request is pending again.";
}

export function planEmails(
  events: NotifyEvent[],
  snapshot: Snapshot,
  appUrl: string,
): OutgoingEmail[] {
  const base = appUrl.replace(/\/+$/, "");
  const requests = new Map(snapshot.requests.map((r) => [r.id, r]));
  const people = new Map(snapshot.people.map((p) => [p.id, p]));
  const created = new Set(
    events.filter((e) => e.kind === "submitted").map((e) => e.request_id),
  );
  const emails: OutgoingEmail[] = [];

  // New requests: one email per approver per requester, for requests still waiting at commit.
  const waiting = new Set<string>();
  for (const id of created) {
    const r = requests.get(id);
    if (r?.status === "pending") waiting.add(r.requester_id);
  }
  for (const requesterId of waiting) {
    const requester = people.get(requesterId);
    if (!requester) continue;
    const content = newRequestEmail({
      requesterName: requester.name,
      link: `${base}/approvals?q=${encodeURIComponent(requester.name)}`,
    });
    for (const approver of approversFor(requesterId, snapshot)) {
      emails.push({ to: approver.email as string, ...content });
    }
  }

  // Decisions: one email to the requester per action. A request created in this same batch was an
  // HR booking or settled itself, and its requester isn't told about each stamp.
  for (const e of events) {
    if (e.kind === "submitted" || created.has(e.request_id)) continue;
    const r = requests.get(e.request_id);
    if (!r || !["approved", "pending", "denied"].includes(r.status)) continue;
    const requester = people.get(r.requester_id);
    if (!requester?.is_active || !requester.email) continue;
    const actor = e.actor ? people.get(e.actor) : undefined;
    const status = r.status as Status;
    emails.push({
      to: requester.email,
      ...decisionEmail({
        kind: e.kind,
        actorName: actor?.name ?? "Someone",
        actorRole: actorRole(e, actor),
        summary: describeRequest(r, snapshot.types),
        status,
        statusLine: statusLine(e, status),
        reason: e.kind === "denied" ? r.denial_reason : null,
        link: `${base}/requests?req=${encodeURIComponent(r.id)}`,
      }),
    });
  }
  return emails;
}

// One of each email, all to one address, for checking how they look in a real inbox.
export function sampleEmails(to: string, appUrl: string): OutgoingEmail[] {
  const base = appUrl.replace(/\/+$/, "");
  const link = `${base}/requests`;
  const summary = "Vacation · Mon, Nov 2 – Wed, Nov 4";
  const decisions: DecisionInput[] = [
    { kind: "stamped", actorName: "Morgan Lee", actorRole: "Manager", summary, status: "pending", statusLine: "It's now waiting on HR.", reason: null, link },
    { kind: "stamped", actorName: "Harper Reyes", actorRole: "HR", summary, status: "approved", statusLine: "It's fully approved.", reason: null, link },
    { kind: "denied", actorName: "Morgan Lee", actorRole: "Manager", summary, status: "denied", statusLine: null, reason: "We're short on staff that week.", link },
    { kind: "unstamped", actorName: "Harper Reyes", actorRole: "HR", summary, status: "pending", statusLine: "Your request is pending again.", reason: null, link },
    { kind: "undenied", actorName: "Morgan Lee", actorRole: "Manager", summary, status: "pending", statusLine: "Your request is pending again.", reason: null, link },
  ];
  return [
    {
      to,
      ...newRequestEmail({
        requesterName: "Emery Stone",
        link: `${base}/approvals?q=${encodeURIComponent("Emery Stone")}`,
      }),
    },
    ...decisions.map((d) => ({ to, ...decisionEmail(d) })),
  ];
}
