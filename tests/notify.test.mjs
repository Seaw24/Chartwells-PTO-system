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
