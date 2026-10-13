// Called by the database (pg_net) when a request is submitted or decided. This function is reachable
// through CloudFront and the runtime does not check JWTs, so the shared secret is the only gate.
import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { parseIdList, planEmails, sampleEmails } from "./plan.ts";
import type { NotifyEvent } from "./plan.ts";
import { sendAll } from "./send.ts";

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// Compares every byte, so the secret can't be guessed one character at a time.
function sameSecret(given: string, expected: string): boolean {
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) diff |= (a[i] ?? 0) ^ b[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const secret = Deno.env.get("NOTIFY_SECRET");
  if (!secret || !sameSecret(req.headers.get("x-notify-secret") ?? "", secret)) {
    return reply({ error: "Forbidden" }, 403);
  }
  const appUrl = Deno.env.get("APP_URL");
  if (!appUrl) return reply({ error: "APP_URL is not set." }, 500);
  let body: { events?: unknown; samples_to?: unknown };
  try {
    body = await req.json();
  } catch {
    return reply({ error: "Invalid JSON" }, 400);
  }
  try {
    if (typeof body.samples_to === "string") {
      return reply(await sendAll(sampleEmails(body.samples_to, appUrl)));
    }
    const events = (Array.isArray(body.events) ? body.events : []) as NotifyEvent[];
    const ids = [...new Set(events.map((e) => e.request_id))];
    if (ids.length === 0) return reply({ sent: 0, failed: 0 });
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const [requests, people, memberships, types] = await Promise.all([
      admin
        .from("requests")
        .select(
          "id,requester_id,status,denial_reason,lines:request_lines(pto_type_id,start_date,end_date,holiday_name)",
        )
        .in("id", ids),
      admin.from("profiles").select("id,name,email,org_role,is_active"),
      admin.from("team_memberships").select("team_id,user_id,role"),
      admin.from("pto_types").select("id,name"),
    ]);
    for (const result of [requests, people, memberships, types]) {
      if (result.error) throw result.error;
    }
    const hrIds = parseIdList(Deno.env.get("NOTIFY_HR_IDS"));
    const emails = planEmails(
      events,
      {
        requests: requests.data ?? [],
        people: people.data ?? [],
        memberships: memberships.data ?? [],
        types: types.data ?? [],
      },
      appUrl,
      { hrIds },
    );
    const result = await sendAll(emails);
    console.log(`notify: ${events.length} events, ${result.sent} sent, ${result.failed} failed`);
    return reply(result);
  } catch (error) {
    console.error("notify failed", error);
    return reply({ error: "Notification failed" }, 500);
  }
});
