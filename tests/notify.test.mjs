import { test } from "node:test";
import assert from "node:assert/strict";
import {
  escapeHtml,
  newRequestEmail,
  decisionEmail,
} from "../supabase/functions/notify/email.ts";

test("escapeHtml neutralises markup", () => {
  assert.equal(escapeHtml(`<b>"Sam" & 'Co'</b>`), "&lt;b&gt;&quot;Sam&quot; &amp; &#39;Co&#39;&lt;/b&gt;");
});
test("the approver email names the requester and links to Approvals", () => {
  const link = "https://pto.example.test/approvals?q=Emery%20Stone";
  const email = newRequestEmail({ requesterName: "Emery Stone", link });
  assert.equal(email.subject, "New time off request from Emery Stone");
  assert.equal(
    email.text,
    `You got a time off request from Emery Stone.\n\nReview in Approvals: ${link}\n`,
  );
  assert.match(email.html, /You got a time off request from <strong[^>]*>Emery Stone<\/strong>\./);
  assert.match(email.html, /Emery Stone is waiting on your approval\./); // preheader
  assert.match(email.html, /Review in Approvals/);
  assert.ok(email.html.includes(`href="${link}"`));
  assert.match(email.html, /v:roundrect/); // Outlook button
});
test("names are escaped in the HTML but not the subject", () => {
  const email = newRequestEmail({ requesterName: "Sam <b>& Co", link: "https://x.test/a?q=1&b=2" });
  assert.equal(email.subject, "New time off request from Sam <b>& Co");
  assert.ok(email.html.includes("Sam &lt;b&gt;&amp; Co"));
  assert.ok(!email.html.includes("Sam <b>"));
  assert.ok(email.html.includes('href="https://x.test/a?q=1&amp;b=2"'));
});
test("the decision email has the headline, summary, status and button", () => {
  const email = decisionEmail({
    kind: "denied",
    actorName: "Morgan Lee",
    actorRole: "Manager",
    summary: "Vacation · Mon, Nov 2 – Wed, Nov 4",
    status: "denied",
    statusLine: null,
    reason: "Short on staff",
    link: "https://pto.example.test/requests?req=r1",
  });
  assert.equal(email.subject, "Morgan Lee denied your time off");
  assert.equal(
    email.text,
    "Morgan Lee (Manager) denied your time off.\n\nVacation · Mon, Nov 2 – Wed, Nov 4\nReason: Short on staff\n\nView request: https://pto.example.test/requests?req=r1\n",
  );
  assert.match(email.html, />Denied</);
  assert.match(email.html, /Morgan Lee \(Manager\) denied your time off\./);
  assert.match(email.html, /View request/);
});
test("each decision kind has its own subject", () => {
  const base = { actorName: "Harper Reyes", actorRole: "HR", summary: "Vacation · Mon, Nov 2", status: "pending", statusLine: "Your request is pending again.", reason: null, link: "https://x.test/requests?req=r1" };
  assert.equal(decisionEmail({ ...base, kind: "stamped" }).subject, "Harper Reyes approved your time off");
  assert.equal(decisionEmail({ ...base, kind: "unstamped" }).subject, "Harper Reyes took back their approval");
  assert.equal(decisionEmail({ ...base, kind: "undenied" }).subject, "Harper Reyes undid the denial of your time off");
  assert.match(decisionEmail({ ...base, kind: "unstamped" }).html, />Pending</);
});

import {
  formatDay,
  describeRequest,
  approversFor,
  planEmails,
  sampleEmails,
  parseIdList,
  redirectForTest,
} from "../supabase/functions/notify/plan.ts";

const APP = "https://pto.example.test/";
const people = [
  { id: "hr", name: "Harper Reyes", email: "hr@example.test", org_role: "god_admin", is_active: true },
  { id: "hr-gone", name: "Old HR", email: "old@example.test", org_role: "god_admin", is_active: false },
  { id: "mgr", name: "Morgan Lee", email: "mgr@example.test", org_role: "member", is_active: true },
  { id: "mgr-other", name: "Other Manager", email: "other@example.test", org_role: "member", is_active: true },
  { id: "emp", name: "Emery Stone", email: "emp@example.test", org_role: "member", is_active: true },
];
const memberships = [
  { team_id: "dining", user_id: "emp", role: "member" },
  { team_id: "dining", user_id: "mgr", role: "admin" },
  { team_id: "catering", user_id: "mgr-other", role: "admin" },
];
const types = [{ id: "vac", name: "Vacation" }];
const request = (over = {}) => ({
  id: "r1",
  requester_id: "emp",
  status: "pending",
  denial_reason: null,
  lines: [{ pto_type_id: "vac", start_date: "2026-11-02", end_date: "2026-11-04", holiday_name: null }],
  ...over,
});
const snap = (...requests) => ({ requests, people: people.map((p) => ({ ...p })), memberships, types });

test("dates read like US calendar days", () => {
  assert.equal(formatDay("2026-11-02"), "Mon, Nov 2");
});
test("each kind of request has a one-line summary", () => {
  assert.equal(describeRequest(request(), types), "Vacation · Mon, Nov 2 – Wed, Nov 4");
  assert.equal(
    describeRequest(request({ lines: [{ pto_type_id: "vac", start_date: "2026-11-02", end_date: "2026-11-02", holiday_name: null }] }), types),
    "Vacation · Mon, Nov 2",
  );
  assert.equal(
    describeRequest(request({ lines: [{ pto_type_id: "hd", start_date: "2026-11-27", end_date: "2026-11-27", holiday_name: "Thanksgiving" }] }), types),
    "Holiday Day Off for Thanksgiving · Fri, Nov 27",
  );
  assert.equal(describeRequest(request({ lines: [] }), types), "Time off");
});
test("approvers are the requester's managers and active HR, never the requester", () => {
  assert.deepEqual(approversFor("emp", snap()).map((p) => p.id).sort(), ["hr", "mgr"]);
  assert.deepEqual(approversFor("mgr", snap()).map((p) => p.id), ["hr"]);
});
test("a submit emails each approver once, however many time offs it had", () => {
  const emails = planEmails(
    [{ kind: "submitted", request_id: "r1" }, { kind: "submitted", request_id: "r2" }],
    snap(request(), request({ id: "r2" })),
    APP,
  );
  assert.deepEqual(emails.map((e) => e.to).sort(), ["hr@example.test", "mgr@example.test"]);
  assert.equal(emails[0].subject, "New time off request from Emery Stone");
  assert.ok(emails[0].text.includes("https://pto.example.test/approvals?q=Emery%20Stone"));
});
test("requests already settled at commit email nobody", () => {
  assert.deepEqual(planEmails([{ kind: "submitted", request_id: "r1" }], snap(request({ status: "approved" })), APP), []);
});
test("decisions on requests created in the same batch are dropped (HR bookings)", () => {
  const events = [
    { kind: "submitted", request_id: "r1" },
    { kind: "stamped", request_id: "r1", slot: "god", override: false, actor: "hr" },
  ];
  assert.deepEqual(planEmails(events, snap(request({ status: "approved" })), APP), []);
});
test("a manager's approval tells the requester it now waits on HR", () => {
  const [email, extra] = planEmails(
    [{ kind: "stamped", request_id: "r1", slot: "team", override: false, actor: "mgr" }],
    snap(request()),
    APP,
  );
  assert.equal(extra, undefined);
  assert.equal(email.to, "emp@example.test");
  assert.equal(email.subject, "Morgan Lee approved your time off");
  assert.ok(email.text.includes("Morgan Lee (Manager) approved your time off."));
  assert.ok(email.text.includes("Vacation · Mon, Nov 2 – Wed, Nov 4"));
  assert.ok(email.text.includes("It's now waiting on HR."));
  assert.ok(email.text.includes("https://pto.example.test/requests?req=r1"));
  assert.match(email.html, />Pending</);
});
test("the last approval says it's fully approved", () => {
  const [email] = planEmails(
    [{ kind: "stamped", request_id: "r1", slot: "god", override: false, actor: "hr" }],
    snap(request({ status: "approved" })),
    APP,
  );
  assert.ok(email.text.includes("Harper Reyes (HR) approved your time off."));
  assert.ok(email.text.includes("It's fully approved."));
  assert.match(email.html, />Approved</);
});
test("an HR stamp in the manager slot is named as HR", () => {
  const [email] = planEmails(
    [{ kind: "stamped", request_id: "r1", slot: "team", override: true, actor: "hr" }],
    snap(request()),
    APP,
  );
  assert.ok(email.text.includes("Harper Reyes (HR) approved your time off."));
  assert.ok(email.text.includes("It's now waiting on HR."));
});
test("an HR approval while the manager slot is open waits on the manager", () => {
  const [email] = planEmails(
    [{ kind: "stamped", request_id: "r1", slot: "god", override: false, actor: "hr" }],
    snap(request()),
    APP,
  );
  assert.ok(email.text.includes("It's now waiting on your manager."));
});
test("a denial carries the reason", () => {
  const [email] = planEmails(
    [{ kind: "denied", request_id: "r1", slot: "team", actor: "mgr" }],
    snap(request({ status: "denied", denial_reason: "Short on staff" })),
    APP,
  );
  assert.equal(email.subject, "Morgan Lee denied your time off");
  assert.ok(email.text.includes("Reason: Short on staff"));
  assert.match(email.html, />Denied</);
});
test("taking back an approval names the person's role from their account", () => {
  const [email] = planEmails(
    [{ kind: "unstamped", request_id: "r1", slot: "team", actor: "hr" }],
    snap(request()),
    APP,
  );
  assert.equal(email.subject, "Harper Reyes took back their approval");
  assert.ok(email.text.includes("Harper Reyes (HR) took back their approval."));
  assert.ok(email.text.includes("Your request is pending again."));
});
test("undoing a denial says the request is pending again", () => {
  const [email] = planEmails(
    [{ kind: "undenied", request_id: "r1", slot: "team", actor: "mgr" }],
    snap(request()),
    APP,
  );
  assert.equal(email.subject, "Morgan Lee undid the denial of your time off");
  assert.ok(email.text.includes("Morgan Lee (Manager) undid the denial of your time off."));
  assert.ok(email.text.includes("Your request is pending again."));
});
test("HR undoing a manager's denial is labelled by the HR account, not the slot", () => {
  const [email] = planEmails(
    [{ kind: "undenied", request_id: "r1", slot: "team", actor: "hr" }],
    snap(request()),
    APP,
  );
  assert.equal(email.subject, "Harper Reyes undid the denial of your time off");
  assert.ok(email.text.includes("Harper Reyes (HR) undid the denial of your time off."));
});
test("an unknown actor is shown as Someone", () => {
  const [email] = planEmails(
    [{ kind: "unstamped", request_id: "r1", slot: "god", actor: null }],
    snap(request()),
    APP,
  );
  assert.equal(email.subject, "Someone took back their approval");
});
test("cancelled requests and inactive requesters get nothing", () => {
  const event = [{ kind: "stamped", request_id: "r1", slot: "team", override: false, actor: "mgr" }];
  assert.deepEqual(planEmails(event, snap(request({ status: "cancelled" })), APP), []);
  const inactive = snap(request());
  inactive.people.find((p) => p.id === "emp").is_active = false;
  assert.deepEqual(planEmails(event, inactive, APP), []);
});
test("samples cover every email and go to one address", () => {
  const emails = sampleEmails("owner@example.test", APP);
  assert.equal(emails.length, 6);
  assert.ok(emails.every((e) => e.to === "owner@example.test"));
  assert.equal(emails[0].subject, "New time off request from Emery Stone");
});

test("parseIdList trims, drops empties, and nothing listed is null", () => {
  assert.equal(parseIdList(undefined), null);
  assert.equal(parseIdList(""), null);
  assert.equal(parseIdList(" , "), null);
  assert.deepEqual(parseIdList(" a, b ,,c "), new Set(["a", "b", "c"]));
});
test("an HR allowlist narrows who gets new-request emails as HR, but not as Manager", () => {
  assert.deepEqual(approversFor("emp", snap(), new Set(["nobody"])).map((p) => p.id), ["mgr"]);
  assert.deepEqual(
    approversFor("emp", snap(), new Set(["hr"])).map((p) => p.id).sort(),
    ["hr", "mgr"],
  );
  assert.deepEqual(approversFor("emp", snap(), null).map((p) => p.id).sort(), ["hr", "mgr"]);
});
test("an HR user who also manages the requester's team still gets it, allowlist or not", () => {
  const withHrAsManager = {
    ...snap(request()),
    memberships: [...memberships, { team_id: "dining", user_id: "hr", role: "admin" }],
  };
  assert.deepEqual(
    approversFor("emp", withHrAsManager, new Set(["nobody"])).map((p) => p.id).sort(),
    ["hr", "mgr"],
  );
});
test("planEmails passes the allowlist through to new-request emails", () => {
  const emails = planEmails(
    [{ kind: "submitted", request_id: "r1" }],
    snap(request()),
    APP,
    { hrIds: new Set(["nobody"]) },
  );
  assert.deepEqual(emails.map((e) => e.to), ["mgr@example.test"]);
});
test("decision emails ignore the allowlist", () => {
  const [email] = planEmails(
    [{ kind: "stamped", request_id: "r1", slot: "team", override: false, actor: "mgr" }],
    snap(request()),
    APP,
    { hrIds: new Set(["nobody"]) },
  );
  assert.equal(email.to, "emp@example.test");
});
test("redirectForTest sends every email to one inbox, saying who it was really for", () => {
  const emails = [
    { to: "a@x.test", subject: "Subj A", text: "Text A", html: '<html><body style="margin:0;">Body A</body></html>' },
    { to: "b@x.test", subject: "Subj B", text: "Text B", html: "<html><body>Body B</body></html>" },
  ];
  const [a, b] = redirectForTest(emails, "me@x.test");
  assert.equal(a.to, "me@x.test");
  assert.equal(b.to, "me@x.test");
  assert.equal(a.subject, "[Test] Subj A");
  assert.equal(b.subject, "[Test] Subj B");
  assert.equal(a.text, "TEST MODE: would be sent to a@x.test\n\nText A");
  assert.match(a.html, /<body style="margin:0;"><div[^>]*>Test mode: would be sent to <strong>a@x\.test<\/strong>/);
  assert.match(b.html, /<body><div[^>]*>Test mode: would be sent to <strong>b@x\.test<\/strong>/);
});
test("redirectForTest escapes the real address inside the html banner", () => {
  const [email] = redirectForTest(
    [{ to: "a<b@x.test", subject: "S", text: "T", html: "<html><body>X</body></html>" }],
    "me@x.test",
  );
  assert.match(email.html, /would be sent to <strong>a&lt;b@x\.test<\/strong>/);
});
test("redirectForTest prepends the banner when there is no body tag", () => {
  const [email] = redirectForTest([{ to: "a@x.test", subject: "S", text: "T", html: "<p>no body here</p>" }], "me@x.test");
  assert.match(email.html, /^<div[^>]*>Test mode: would be sent to <strong>a@x\.test<\/strong><\/div><p>/);
});
