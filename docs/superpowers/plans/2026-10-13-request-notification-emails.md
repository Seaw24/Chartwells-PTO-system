# Request Notification Emails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Email approvers when time off is submitted, and email the requester when a Manager or HR approves, denies, or undoes a decision.

**Architecture:** Triggers on `public.requests` collect what happened during a transaction into a transaction-local setting. A deferred constraint trigger sends the whole list in one `pg_net` call to a new `notify` Edge Function at commit. The function loads the rows with the service role, turns events into emails with pure modules (`plan.ts`, `email.ts`), and sends them over Gmail SMTP (`send.ts`). The app gains `?q=` on Approvals, `?req=` on My Requests, and a return-to-link after sign-in.

**Tech Stack:** Postgres 17 + pg_net 0.20.3 (self-hosted Supabase), Supabase edge-runtime v1.74 (Deno, `npm:` imports), nodemailer, React 18 + react-router 6 (Vite), Node 24 `node:test` with PGlite. Node 24 strips TypeScript types, so tests import the `.ts` modules directly.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-13-request-notification-emails-design.md`.
- Toolchain: no `node`/`pnpm` on PATH. Before any command below, run
  `export PATH="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"`
  (check `ls ~/.cache/codex-runtimes/` if the path is missing).
- Migrations must run on **both** the deployed schema and the recovered test schema. They may only call helpers that exist live (`is_god_admin()`, `auth.uid()`, and the functions from earlier migrations in this repo). Live default privileges grant every new function and table to `authenticated`, so revoke internal objects explicitly.
- Role wording: stored `god_admin` is shown as **HR**; team membership `admin` is shown as **Manager**.
- Approver email: subject `New time off request from {name}`, body "You got a time off request from **{name}**.", button "Review in Approvals", link `{APP_URL}/approvals?q={url-encoded name}`.
- Requester email: subjects `{actor} approved your time off`, `{actor} denied your time off`, `{actor} took back their approval`, `{actor} undid the denial of your time off`. Button "View request", link `{APP_URL}/requests?req={id}`.
- Status sentences: "It's fully approved.", "It's now waiting on HR.", "It's now waiting on your manager.", "Your request is pending again."
- Dates in emails: US format, `Mon, Nov 2`; ranges `Mon, Nov 2 – Wed, Nov 4`.
- Email colours (light-theme tokens converted to hex): navy `#12233B`, navy-fg `#EEF2F7`, accent `#F5723D`, accent-strong `#C5512A`, accent-ink `#B3421E`, ink `#1D2735`, ink-soft `#4A5361`, ink-mute `#656E7A`, line `#DCE0E6`, surface `#F2F5F9`, card `#FDFEFF`, panel `#EAEDF2`; approved `#D9F9E8`/`#007146`, pending `#FFEECB`/`#8B5E22`, denied `#FFE6E7`/`#C12445`. Radii: chip 7px, btn 9px, card 13px.
- Secrets (`GMAIL_APP_PASSWORD`, `NOTIFY_SECRET`, service keys) never go in git, chat, or command output.
- Production changes (Task 8) need the owner's go-ahead at each step.
- Work in the worktree `/Users/u1614968/projects/Chartwells-PTO-system-emails` on branch `request-emails` (already created; `node_modules` is a symlink to the main checkout). Never touch `/Users/u1614968/projects/Chartwells-PTO-system`: another session has uncommitted work there.
- Wellness Day top-up requests were removed in `202610130001_remove_wellness_requests.sql`: `requests.kind`, `grant_days`, `grant_type_id`, `grant_year` and `pto_types.is_wellness` no longer exist. Nothing in this feature may read them.

## File Structure

| File | Responsibility |
| --- | --- |
| `tests/helpers/db.mjs` (new) | Boots PGlite with the Auth stub, a recording `pg_net` stub, and every migration. Shared by both DB test files. |
| `tests/database.test.mjs` (modify) | Uses the shared boot instead of its inline copy. |
| `supabase/migrations/202610130002_request_notifications.sql` (new) | Settings table, collect trigger, send-at-commit trigger. |
| `supabase/migrations/202610130002_request_notifications_rollback.sql` (new) | Drops all of the above. |
| `tests/notifications.test.mjs` (new) | DB tests: which events are reported, one call per transaction, best-effort. |
| `supabase/functions/notify/email.ts` (new) | HTML + text for both emails. Pure. |
| `supabase/functions/notify/plan.ts` (new) | Events + rows → list of emails; sample set. Pure. |
| `tests/notify.test.mjs` (new) | Unit tests for `plan.ts` and `email.ts`. |
| `supabase/functions/notify/send.ts` (new) | Gmail SMTP sender (the only provider-specific file). |
| `supabase/functions/notify/index.ts` (new) | HTTP entry: secret check, load rows, plan, send. |
| `src/utils/returnPath.jsx` (new) | `safeReturnPath()` for the post-sign-in redirect. |
| `src/App.jsx`, `src/pages/Login.jsx`, `src/pages/Approvals.jsx`, `src/pages/MyRequests.jsx` (modify) | Link handling. |
| `tests/frontend.test.mjs` (modify) | `safeReturnPath` tests. |
| `scripts/deploy-aws.mjs` (modify) | Deploy whole function folders (`employee-access`, `notify`), with `--function=<name>`. |
| `supabase/README.md` (modify) | How notifications are configured and switched off. |

---

### Task 0: Branch

Done: worktree `/Users/u1614968/projects/Chartwells-PTO-system-emails`, branch `request-emails`, based on `0255bdd Remove Wellness Day top-up requests`.

---

### Task 1: Shared database test boot with a pg_net stub

**Files:**
- Create: `tests/helpers/db.mjs`
- Modify: `tests/database.test.mjs:1-63`

**Interfaces:**
- Produces: `bootDatabase(): Promise<PGlite>`, `MIGRATIONS: string[]`, `NET_HTTP_POST_STUB: string`, `NET_HTTP_POST_FAILING: string`. In the booted DB, `net.calls(id, url, body jsonb, headers jsonb)` records every `net.http_post` call.

- [ ] **Step 1: Create `tests/helpers/db.mjs`**

```js
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";

// Every migration, in the order they run on the deployed database.
export const MIGRATIONS = [
  "202609080001_recovered_contract.sql",
  "202609140001_wellness_day_requests.sql",
  "202609140002_holiday_day_off.sql",
  "202609150001_submit_requests.sql",
  "202609180001_two_stamp_approval.sql",
  // Only needed on the deployed database, but it replaces manages_team/manages_person here too,
  // which is how we know the rewritten bodies answer the same as the bootstrap's.
  "202609180003_employee_access_helpers.sql",
  "202609180004_stamp_visibility.sql",
  "202609180005_undo_denial.sql",
  "202609280001_hr_booking.sql",
  "202609280002_leave_year_reset.sql",
  "202610130001_remove_wellness_requests.sql",
];

// Supabase Auth, reduced to what the migrations use.
const AUTH_STUB = `create schema auth;create table auth.users(id uuid primary key);create role authenticated;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`;

// pg_net's http_post with its real signature. Calls are recorded in net.calls instead of sent.
export const NET_HTTP_POST_STUB = `create or replace function net.http_post(url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb, headers jsonb default '{"Content-Type": "application/json"}'::jsonb, timeout_milliseconds integer default 5000) returns bigint language sql as $$insert into net.calls(url, body, headers) values (http_post.url, http_post.body, http_post.headers) returning id$$;`;

// The same signature, failing the way an unreachable pg_net would.
export const NET_HTTP_POST_FAILING = `create or replace function net.http_post(url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb, headers jsonb default '{"Content-Type": "application/json"}'::jsonb, timeout_milliseconds integer default 5000) returns bigint language plpgsql as $$begin raise exception 'network down'; end$$;`;

const NET_STUB = `create schema net;create table net.calls(id bigint generated always as identity primary key, url text, body jsonb, headers jsonb);${NET_HTTP_POST_STUB}`;

export async function bootDatabase() {
  const db = new PGlite();
  await db.exec(AUTH_STUB + NET_STUB);
  for (const file of MIGRATIONS) {
    try {
      await db.exec(fs.readFileSync(`supabase/migrations/${file}`, "utf8"));
    } catch (error) {
      console.error(file, error.message, error.position);
      process.exit(1);
    }
  }
  return db;
}
```

- [ ] **Step 2: Point `tests/database.test.mjs` at it**

Replace everything from line 1 down to and including the `} catch (error) { … process.exit(1); }` block (the line before `const admin = "00000000-…0001",`) with:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { bootDatabase } from "./helpers/db.mjs";
const db = await bootDatabase();
```

Before replacing, check the list in `tests/helpers/db.mjs` matches the files the old block loaded, in the same order (it should end with `202610130001_remove_wellness_requests.sql`). The file still uses `fs` further down (it re-reads `202609280002_leave_year_reset.sql` in a later test), so keep `import fs from "node:fs";` if `grep -n "fs\." tests/database.test.mjs` still finds a use; drop the `PGlite` import.

- [ ] **Step 3: Run the existing DB tests**

Run: `node --test tests/database.test.mjs`
Expected: all tests pass, same count as before the change (`git stash; node --test tests/database.test.mjs | tail -8; git stash pop` shows the earlier count).

- [ ] **Step 4: Commit**

```bash
git add tests/helpers/db.mjs tests/database.test.mjs
git commit -m "Share the database test boot and add a recording pg_net stub"
```

---

### Task 2: Migration that reports request events at commit

**Files:**
- Create: `supabase/migrations/202610130002_request_notifications.sql`
- Create: `supabase/migrations/202610130002_request_notifications_rollback.sql`
- Modify: `tests/helpers/db.mjs` (append to `MIGRATIONS`)
- Test: `tests/notifications.test.mjs`

**Interfaces:**
- Consumes: `bootDatabase`, `NET_HTTP_POST_STUB`, `NET_HTTP_POST_FAILING` (Task 1).
- Produces: table `public.notification_settings(id boolean pk default true, function_url text, secret text)`. One `net.http_post` per committed transaction that touched requests, with body `{ "events": NotifyEvent[] }` and header `x-notify-secret`. Event shapes (consumed by Task 4):
  - `{ kind: "submitted", request_id }`
  - `{ kind: "stamped", request_id, slot: "team"|"god", override: boolean, actor: uuid }`
  - `{ kind: "unstamped", request_id, slot, actor: uuid|null }`
  - `{ kind: "denied", request_id, slot, actor: uuid|null }`
  - `{ kind: "undenied", request_id, slot, actor: uuid|null }`

- [ ] **Step 1: Write the failing tests** — create `tests/notifications.test.mjs`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bootDatabase,
  NET_HTTP_POST_STUB,
  NET_HTTP_POST_FAILING,
} from "./helpers/db.mjs";

const db = await bootDatabase();
const hr = "00000000-0000-0000-0000-0000000000a1",
  manager = "00000000-0000-0000-0000-0000000000a2",
  employee = "00000000-0000-0000-0000-0000000000a3",
  type = "00000000-0000-0000-0000-0000000000b1",
  team = "00000000-0000-0000-0000-0000000000c1";
await db.exec(
  `insert into auth.users values('${hr}'),('${manager}'),('${employee}');insert into profiles(id,name,email,org_role,password_setup_required) values('${hr}','Harper Reyes','hr@example.test','god_admin',false),('${manager}','Morgan Lee','manager@example.test','member',false),('${employee}','Emery Stone','employee@example.test','member',false);insert into teams(id,name) values('${team}','Dining');insert into team_memberships(team_id,user_id) values('${team}','${employee}');insert into team_memberships(team_id,user_id,role) values('${team}','${manager}','admin');insert into pto_types(id,name,default_days) values('${type}','Vacation',20);insert into pto_grants values('${employee}','${type}',extract(year from current_date)::integer,20);`,
);
const days = (
  await db.query(
    "select d::date::text as day from generate_series(current_date+1,current_date+30,interval '1 day') d where extract(dow from d) between 1 and 5 order by d limit 10",
  )
).rows.map((r) => r.day);

async function as(id, sql, args = []) {
  await db.exec(
    `set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`,
  );
  return db.query(sql, args);
}
async function asOwner(sql = "") {
  await db.exec(`reset role;${sql}`);
}
async function calls() {
  await asOwner();
  return (await db.query("select url, body, headers from net.calls order by id"))
    .rows;
}
async function clearCalls() {
  await asOwner("delete from net.calls;");
}
async function submit(who, ...picked) {
  const items = picked.map((d) => ({ type_id: type, start: d, end: d }));
  return (
    await as(who, "select submit_requests($1::jsonb) ids", [
      JSON.stringify(items),
    ])
  ).rows[0].ids;
}
// Runs one action and returns the events of the single call it made.
async function eventsOf(action) {
  await clearCalls();
  await action();
  const sent = await calls();
  assert.equal(sent.length, 1, "expected exactly one call");
  return sent[0].body.events;
}
async function statusOf(id) {
  await asOwner();
  return (await db.query("select status from requests where id=$1", [id]))
    .rows[0].status;
}

let pair, denied;
test("nothing is sent until notifications are configured", async () => {
  await clearCalls();
  await submit(employee, days[0]);
  assert.deepEqual(await calls(), []);
});
test("a submit with two time offs makes one call carrying both", async () => {
  await asOwner(
    "insert into notification_settings(function_url,secret) values('http://functions:9000/notify','test-secret');",
  );
  await clearCalls();
  pair = await submit(employee, days[1], days[2]);
  const sent = await calls();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, "http://functions:9000/notify");
  assert.equal(sent[0].headers["x-notify-secret"], "test-secret");
  assert.deepEqual(
    sent[0].body.events,
    pair.map((id) => ({ kind: "submitted", request_id: id })),
  );
});
test("a manager stamp reports the team slot and the manager", async () => {
  const events = await eventsOf(() =>
    as(manager, "select stamp_request($1,'team')", [pair[0]]),
  );
  assert.deepEqual(events, [
    { kind: "stamped", request_id: pair[0], slot: "team", override: false, actor: manager },
  ]);
});
test("an HR stamp reports the HR slot and the HR user", async () => {
  const events = await eventsOf(() =>
    as(hr, "select stamp_request($1,'god')", [pair[0]]),
  );
  assert.deepEqual(events, [
    { kind: "stamped", request_id: pair[0], slot: "god", override: false, actor: hr },
  ]);
  assert.equal(await statusOf(pair[0]), "approved");
});
test("taking a stamp back reports the slot and who took it", async () => {
  const events = await eventsOf(() =>
    as(hr, "select unstamp_request($1,'god')", [pair[0]]),
  );
  assert.deepEqual(events, [
    { kind: "unstamped", request_id: pair[0], slot: "god", actor: hr },
  ]);
});
test("HR replacing a manager's stamp sends nothing", async () => {
  await as(manager, "select stamp_request($1,'team')", [pair[1]]);
  await clearCalls();
  await as(hr, "select stamp_request($1,'team',true)", [pair[1]]);
  assert.deepEqual(await calls(), []);
});
test("a denial reports the slot and who denied", async () => {
  [denied] = await submit(employee, days[3]);
  const events = await eventsOf(() =>
    as(manager, "select deny_request($1,'Short on staff that week')", [denied]),
  );
  assert.deepEqual(events, [
    { kind: "denied", request_id: denied, slot: "team", actor: manager },
  ]);
});
test("undoing a denial reports the slot and who undid it", async () => {
  const events = await eventsOf(() =>
    as(manager, "select unstamp_request($1,'team')", [denied]),
  );
  assert.deepEqual(events, [
    { kind: "undenied", request_id: denied, slot: "team", actor: manager },
  ]);
});
test("cancelling a request sends nothing", async () => {
  const [id] = await submit(employee, days[4]);
  await clearCalls();
  await as(employee, "select cancel_request($1)", [id]);
  assert.deepEqual(await calls(), []);
});
test("a rolled-back submit sends nothing", async () => {
  await clearCalls();
  await db.exec("begin");
  await submit(employee, days[5]);
  await db.exec("rollback");
  assert.deepEqual(await calls(), []);
});
test("a failing call never blocks the action", async () => {
  await asOwner(NET_HTTP_POST_FAILING);
  try {
    const [id] = await submit(employee, days[6]);
    assert.equal(await statusOf(id), "pending");
  } finally {
    await asOwner(NET_HTTP_POST_STUB);
  }
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test tests/notifications.test.mjs`
Expected: FAIL — `relation "notification_settings" does not exist` in the second test, and the event tests fail on `expected exactly one call`.

- [ ] **Step 3: Write the migration** — create `supabase/migrations/202610130002_request_notifications.sql`

```sql
-- Request notification emails. Submitting time off, and every decision on it, is collected during
-- the transaction and handed to the `notify` Edge Function in one pg_net call when it commits. The
-- function works out who to email; the database only reports what happened.
--
-- Why at commit: one submit can create several requests (one per time off in the request panel),
-- and approvers should get one email for the lot. pg_net only sends once the transaction commits,
-- so a rolled-back action sends nothing, and a failed call is caught so it can never undo an action.
--
-- Nothing is sent until notification_settings has its one row (the function URL and the shared
-- secret), so this can be applied before the function is deployed. Deleting that row turns
-- notifications off. Runs on the deployed schema (pg_net 0.20.3) and on the test schema (a pg_net
-- stub). Re-runnable.
begin;

create table if not exists public.notification_settings (
  id boolean primary key default true check (id),
  function_url text not null,
  secret text not null
);
-- Holds the shared secret: no browser role may read it.
alter table public.notification_settings enable row level security;
revoke all on table public.notification_settings from public;
revoke all on table public.notification_settings from authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on table public.notification_settings from anon';
  end if;
end$$;

-- Adds one event to this transaction's list. The list lives in a transaction-local setting, so it
-- is gone after commit or rollback.
create or replace function public.queue_request_notification(p_event jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config(
    'pto.notify_events',
    (coalesce(nullif(current_setting('pto.notify_events', true), ''), '[]')::jsonb
      || jsonb_build_array(p_event))::text,
    true);
end$$;

-- What happened to a request, read from the row change so every code path counts. An HR override
-- that swaps one Manager-slot stamper for another is not an event: that slot was already approved.
create or replace function public.collect_request_notifications() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform queue_request_notification(jsonb_build_object('kind', 'submitted', 'request_id', new.id));
    return null;
  end if;

  if old.team_stamp_by is null and new.team_stamp_by is not null then
    perform queue_request_notification(jsonb_build_object('kind', 'stamped', 'request_id', new.id,
      'slot', 'team', 'override', new.team_stamp_override, 'actor', new.team_stamp_by));
  elsif old.team_stamp_by is not null and new.team_stamp_by is null then
    perform queue_request_notification(jsonb_build_object('kind', 'unstamped', 'request_id', new.id,
      'slot', 'team', 'actor', auth.uid()));
  end if;

  if old.god_stamp_by is null and new.god_stamp_by is not null then
    perform queue_request_notification(jsonb_build_object('kind', 'stamped', 'request_id', new.id,
      'slot', 'god', 'override', false, 'actor', new.god_stamp_by));
  elsif old.god_stamp_by is not null and new.god_stamp_by is null then
    perform queue_request_notification(jsonb_build_object('kind', 'unstamped', 'request_id', new.id,
      'slot', 'god', 'actor', auth.uid()));
  end if;

  if old.status = 'pending' and new.status = 'denied' then
    perform queue_request_notification(jsonb_build_object('kind', 'denied', 'request_id', new.id,
      'slot', new.denied_slot, 'actor', new.decided_by));
  elsif old.status = 'denied' and new.status = 'pending' then
    perform queue_request_notification(jsonb_build_object('kind', 'undenied', 'request_id', new.id,
      'slot', old.denied_slot, 'actor', coalesce(new.undone_by, auth.uid())));
  end if;
  return null;
end$$;

drop trigger if exists requests_collect_notifications on public.requests;
create trigger requests_collect_notifications
after insert or update of status, team_stamp_by, god_stamp_by on public.requests
for each row execute function public.collect_request_notifications();

-- At commit: the first firing sends the whole list in one call and clears it; the rest find it
-- empty. A failed call is only a warning.
create or replace function public.send_request_notifications() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  events jsonb := nullif(current_setting('pto.notify_events', true), '')::jsonb;
  settings notification_settings;
begin
  if events is null then
    return null;
  end if;
  perform set_config('pto.notify_events', '', true);
  select * into settings from notification_settings where id;
  if not found then
    return null;
  end if;
  begin
    perform net.http_post(
      url := settings.function_url,
      body := jsonb_build_object('events', events),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', settings.secret),
      timeout_milliseconds := 10000);
  exception when others then
    raise warning 'Request notifications were not sent: %', sqlerrm;
  end;
  return null;
end$$;

drop trigger if exists requests_send_notifications on public.requests;
create constraint trigger requests_send_notifications
after insert or update on public.requests
deferrable initially deferred
for each row execute function public.send_request_notifications();

-- Internal only. Live default privileges grant new functions to authenticated, so revoke explicitly.
revoke execute on function public.queue_request_notification(jsonb) from public;
revoke execute on function public.collect_request_notifications() from public;
revoke execute on function public.send_request_notifications() from public;
revoke execute on function public.queue_request_notification(jsonb) from authenticated;
revoke execute on function public.collect_request_notifications() from authenticated;
revoke execute on function public.send_request_notifications() from authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public.queue_request_notification(jsonb) from anon';
    execute 'revoke execute on function public.collect_request_notifications() from anon';
    execute 'revoke execute on function public.send_request_notifications() from anon';
  end if;
end$$;

commit;
```

- [ ] **Step 4: Write the rollback** — create `supabase/migrations/202610130002_request_notifications_rollback.sql`

```sql
-- Removes request notification emails. Requests themselves are untouched.
begin;
drop trigger if exists requests_send_notifications on public.requests;
drop trigger if exists requests_collect_notifications on public.requests;
drop function if exists public.send_request_notifications();
drop function if exists public.collect_request_notifications();
drop function if exists public.queue_request_notification(jsonb);
drop table if exists public.notification_settings;
commit;
```

- [ ] **Step 5: Load it in the test boot** — in `tests/helpers/db.mjs`, add as the last `MIGRATIONS` entry:

```js
  "202610130002_request_notifications.sql",
```

- [ ] **Step 6: Run all DB tests**

Run: `node --test tests/notifications.test.mjs tests/database.test.mjs`
Expected: all pass (11 new tests; `database.test.mjs` unchanged count — it never configures settings, so it makes no calls).

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/202610130002_request_notifications.sql supabase/migrations/202610130002_request_notifications_rollback.sql tests/helpers/db.mjs tests/notifications.test.mjs
git commit -m "Report request submissions and decisions to the notify function at commit"
```

---

### Task 3: Email markup (`email.ts`)

**Files:**
- Create: `supabase/functions/notify/email.ts`
- Test: `tests/notify.test.mjs`

**Interfaces:**
- Produces (used by Task 4):
  - `type Status = "approved" | "pending" | "denied"`
  - `type DecisionKind = "stamped" | "denied" | "unstamped" | "undenied"`
  - `type Role = "Manager" | "HR"`
  - `type EmailContent = { subject: string; html: string; text: string }`
  - `type DecisionInput = { kind: DecisionKind; actorName: string; actorRole: Role; summary: string; status: Status; statusLine: string | null; reason: string | null; link: string }`
  - `escapeHtml(value: string): string`
  - `newRequestEmail(p: { requesterName: string; link: string }): EmailContent`
  - `decisionEmail(p: DecisionInput): EmailContent`

- [ ] **Step 1: Write the failing tests** — create `tests/notify.test.mjs`

```js
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
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test tests/notify.test.mjs`
Expected: FAIL — `Cannot find module '…/supabase/functions/notify/email.ts'`.

- [ ] **Step 3: Write `supabase/functions/notify/email.ts`**

```ts
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
const font =
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
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/notify.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/notify/email.ts tests/notify.test.mjs
git commit -m "Add notification email markup in the product's look"
```

---

### Task 4: Who gets what (`plan.ts`)

**Files:**
- Create: `supabase/functions/notify/plan.ts`
- Modify: `tests/notify.test.mjs` (append)

**Interfaces:**
- Consumes: `newRequestEmail`, `decisionEmail`, `DecisionInput`, `DecisionKind`, `Role`, `Status` (Task 3); event shapes (Task 2).
- Produces (used by Task 5):
  - `type NotifyEvent = { kind: "submitted" | DecisionKind; request_id: string; slot?: "team" | "god" | null; override?: boolean; actor?: string | null }`
  - `type Person = { id: string; name: string; email: string | null; org_role: string; is_active: boolean }`
  - `type Membership = { team_id: string; user_id: string; role: string }`
  - `type RequestLine = { pto_type_id: string; start_date: string; end_date: string; holiday_name: string | null }`
  - `type RequestRow = { id: string; requester_id: string; status: string; denial_reason: string | null; lines: RequestLine[] }`
  - `type PtoType = { id: string; name: string }`
  - `type Snapshot = { requests: RequestRow[]; people: Person[]; memberships: Membership[]; types: PtoType[] }`
  - `type OutgoingEmail = { to: string; subject: string; html: string; text: string }`
  - `formatDay(iso: string): string`, `describeRequest(r: RequestRow, types: PtoType[]): string`, `approversFor(requesterId: string, snapshot: Snapshot): Person[]`
  - `planEmails(events: NotifyEvent[], snapshot: Snapshot, appUrl: string): OutgoingEmail[]`
  - `sampleEmails(to: string, appUrl: string): OutgoingEmail[]`

- [ ] **Step 1: Write the failing tests** — append to `tests/notify.test.mjs`

```js
import {
  formatDay,
  describeRequest,
  approversFor,
  planEmails,
  sampleEmails,
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
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test tests/notify.test.mjs`
Expected: FAIL — `Cannot find module '…/supabase/functions/notify/plan.ts'`.

- [ ] **Step 3: Write `supabase/functions/notify/plan.ts`**

```ts
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
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/notify.test.mjs`
Expected: PASS (21 tests).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/notify/plan.ts tests/notify.test.mjs
git commit -m "Work out who gets which notification email"
```

---

### Task 5: The `notify` Edge Function (sender + HTTP entry) and docs

**Files:**
- Create: `supabase/functions/notify/send.ts`
- Create: `supabase/functions/notify/index.ts`
- Modify: `supabase/README.md` (append a section)

**Interfaces:**
- Consumes: `planEmails`, `sampleEmails`, `NotifyEvent`, `OutgoingEmail` (Task 4); request body from Task 2.
- Produces: `POST /notify` with header `x-notify-secret`. Body `{ events: NotifyEvent[] }` or `{ samples_to: string }`. Returns `{ sent: number, failed: number }`; 403 without the right secret. Env: `NOTIFY_SECRET`, `APP_URL`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM_NAME`, plus the existing `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

There is no Deno locally; these two files are checked on the server in Task 8 (samples send and a 403 probe). Keep them thin: all logic lives in the tested modules.

- [ ] **Step 1: Write `supabase/functions/notify/send.ts`**

```ts
// Sends over Gmail SMTP with an App Password. The only file that knows the provider: moving to
// Resend or another account means changing this file and the settings, nothing else.
import nodemailer from "npm:nodemailer@6.9.16";
import type { OutgoingEmail } from "./plan.ts";

export async function sendAll(emails: OutgoingEmail[]): Promise<{ sent: number; failed: number }> {
  if (emails.length === 0) return { sent: 0, failed: 0 };
  const user = Deno.env.get("GMAIL_USER");
  const pass = Deno.env.get("GMAIL_APP_PASSWORD");
  if (!user || !pass) throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be set.");
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    // Google shows App Passwords in groups of four; the spaces are not part of it.
    auth: { user, pass: pass.replace(/\s+/g, "") },
  });
  const from = { name: Deno.env.get("EMAIL_FROM_NAME") ?? "Chartwells PTO", address: user };
  let sent = 0;
  let failed = 0;
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
  transport.close();
  return { sent, failed };
}
```

- [ ] **Step 2: Write `supabase/functions/notify/index.ts`**

```ts
// Called by the database (pg_net) when a request is submitted or decided. This function is reachable
// through CloudFront and the runtime does not check JWTs, so the shared secret is the only gate.
import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { planEmails, sampleEmails } from "./plan.ts";
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
    const emails = planEmails(
      events,
      {
        requests: requests.data ?? [],
        people: people.data ?? [],
        memberships: memberships.data ?? [],
        types: types.data ?? [],
      },
      appUrl,
    );
    const result = await sendAll(emails);
    console.log(`notify: ${events.length} events, ${result.sent} sent, ${result.failed} failed`);
    return reply(result);
  } catch (error) {
    console.error("notify failed", error);
    return reply({ error: "Notification failed" }, 500);
  }
});
```

- [ ] **Step 3: Document it** — append to `supabase/README.md`

```markdown
## Request notification emails

`migrations/202610130002_request_notifications.sql` reports every submit and decision on `requests` to the `notify` Edge Function in one `pg_net` call per transaction, at commit. The function (`functions/notify/`) emails the requester's Managers and all HR about new requests, and emails the requester when someone approves, denies, takes back an approval or undoes a denial. Who gets what is decided in `plan.ts`; the markup is in `email.ts`; `send.ts` is the only file that knows the mail provider (Gmail SMTP for now).

Configuration:

- Function environment (server `.env` and the `functions` service in `docker-compose.yml`): `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM_NAME`, `APP_URL`, `NOTIFY_SECRET`. Changing the Google account password revokes the App Password.
- Database: one row in `notification_settings` with the function URL (`http://functions:9000/notify` inside the Docker network) and the same `NOTIFY_SECRET`. No row, no calls: deleting it is the off switch.
- Checking the design: `POST /notify` with `{"samples_to": "you@example.com"}` and the secret header sends one of each email to that address.

Email is best-effort: a failed call is a warning in the database log and never undoes the action; send failures are in the edge-functions container log.
```

- [ ] **Step 4: Run the whole suite**

Run: `node --test tests/*.test.mjs`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/notify/send.ts supabase/functions/notify/index.ts supabase/README.md
git commit -m "Add the notify Edge Function that sends request emails over Gmail"
```

---

### Task 6: Links from emails land in the right place

**Files:**
- Create: `src/utils/returnPath.jsx`
- Modify: `src/App.jsx` (imports; `AuthGuard`)
- Modify: `src/pages/Login.jsx` (imports; redirect effect)
- Modify: `src/pages/Approvals.jsx:177-188` (the `?req=` effect)
- Modify: `src/pages/MyRequests.jsx` (imports; state; effect; modal)
- Test: `tests/frontend.test.mjs` (append)

**Interfaces:**
- Produces: `safeReturnPath(raw: unknown): string`.

- [ ] **Step 1: Write the failing test** — append to `tests/frontend.test.mjs`

```js
test("sign-in only returns to paths inside the app", async () => {
  const { safeReturnPath } = await server.ssrLoadModule("/src/utils/returnPath.jsx");
  assert.equal(safeReturnPath("/approvals?q=Emery%20Stone"), "/approvals?q=Emery%20Stone");
  assert.equal(safeReturnPath("/requests?req=abc"), "/requests?req=abc");
  assert.equal(safeReturnPath("//evil.example/x"), "/");
  assert.equal(safeReturnPath("/\\evil.example"), "/");
  assert.equal(safeReturnPath("https://evil.example"), "/");
  assert.equal(safeReturnPath("/login"), "/");
  assert.equal(safeReturnPath("/welcome"), "/");
  assert.equal(safeReturnPath(undefined), "/");
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test tests/frontend.test.mjs`
Expected: FAIL — the new test cannot load `/src/utils/returnPath.jsx`.

- [ ] **Step 3: Create `src/utils/returnPath.jsx`**

```js
// Where to go after signing in. Only paths inside this app are allowed, so a crafted sign-in link
// can't send someone to another site.
export function safeReturnPath(raw) {
  if (typeof raw !== "string" || !raw.startsWith("/")) return "/";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  if (raw.startsWith("/login") || raw.startsWith("/welcome")) return "/";
  return raw;
}
```

- [ ] **Step 4: Run the test**

Run: `node --test tests/frontend.test.mjs`
Expected: PASS.

- [ ] **Step 5: Remember where a signed-out visitor was going** — `src/App.jsx`

Add after `import { Navigate as Vendor_Navigate } from "react-router-dom";`:

```js
import { useLocation as Vendor_useLocation } from "react-router-dom";
```

In `AuthGuard`, replace:

```js
export function AuthGuard({ children: children }) {
  const { user: user, loading: loading } = useAuth();
```

with:

```js
export function AuthGuard({ children: children }) {
  const { user: user, loading: loading } = useAuth(),
    location = Vendor_useLocation();
```

and in the same function replace the last branch:

```js
  ) : (
    <Vendor_Navigate to="/login" replace={!0} />
  );
}
export function WelcomeRoute() {
```

with:

```js
  ) : (
    <Vendor_Navigate
      to="/login"
      replace={!0}
      state={{ from: location.pathname + location.search }}
    />
  );
}
export function WelcomeRoute() {
```

- [ ] **Step 6: Go back there after signing in** — `src/pages/Login.jsx`

Add after `import { useNavigate as Vendor_useNavigate } from "react-router-dom";`:

```js
import { useLocation as Vendor_useLocation } from "react-router-dom";
import { safeReturnPath } from "../utils/returnPath.jsx";
```

Replace:

```js
  const e = Vendor_useNavigate(),
    { user: user, signIn: signIn, error: error } = useAuth(),
```

with:

```js
  const e = Vendor_useNavigate(),
    location = Vendor_useLocation(),
    { user: user, signIn: signIn, error: error } = useAuth(),
```

Replace:

```js
  React.useEffect(() => {
    user &&
      e(user.passwordSetupRequired ? "/welcome" : "/", {
        replace: !0,
      });
  }, [user, e]);
```

with:

```js
  React.useEffect(() => {
    user &&
      e(
        user.passwordSetupRequired
          ? "/welcome"
          : safeReturnPath(location.state?.from),
        {
          replace: !0,
        },
      );
  }, [user, e, location.state]);
```

- [ ] **Step 7: `?q=` fills the Approvals search** — `src/pages/Approvals.jsx`

Replace:

```js
  (void 0,
    React.useEffect(() => {
      const F = D.get("req");
      F &&
        (C(F),
        q(
          {},
          {
            replace: !0,
          },
        ));
    }, [D, q]));
```

with:

```js
  (void 0,
    React.useEffect(() => {
      // Links from emails: ?req= opens one request, ?q= fills the search with a requester's name.
      const F = D.get("req"),
        se = D.get("q");
      if (!F && se === null) return;
      (F && C(F),
        se !== null && _(se),
        q(
          {},
          {
            replace: !0,
          },
        ));
    }, [D, q]));
```

- [ ] **Step 8: `?req=` opens a request in My Requests** — `src/pages/MyRequests.jsx`

Add after `import { RequestCard } from "../components/requests/RequestCard.jsx";`:

```js
import { useSearchParams as Vendor_useSearchParams } from "react-router-dom";
import { RequestDetailModal } from "../components/requests/RequestDetailModal.jsx";
```

Replace:

```js
    [f, p] = React.useState(null);
  const { data: y = null } = useResource(
    ["my-requests"],
    () => requestsForUser(e.id),
    true,
  );
```

with:

```js
    [f, p] = React.useState(null),
    [detailId, setDetailId] = React.useState(null),
    [searchParams, setSearchParams] = Vendor_useSearchParams();
  const { data: y = null } = useResource(
    ["my-requests"],
    () => requestsForUser(e.id),
    true,
  );
  // A link from an email (?req=) opens that request.
  React.useEffect(() => {
    const id = searchParams.get("req");
    if (!id) return;
    setDetailId(id);
    setSearchParams({}, { replace: !0 });
  }, [searchParams, setSearchParams]);
```

Replace:

```js
      <ConfirmDialog
        open={!!f}
```

with:

```js
      <RequestDetailModal
        requestId={detailId}
        open={!!detailId}
        onClose={() => setDetailId(null)}
        onChanged={u}
      />
      <ConfirmDialog
        open={!!f}
```

- [ ] **Step 9: Check source, tests and build**

Run: `node scripts/check-source.mjs && node --test tests/*.test.mjs && node scripts/run-vite.mjs`
Expected: source check passes (no undeclared globals), all tests pass, Vite build succeeds.

- [ ] **Step 10: Try it in the browser against the real backend**

**Implementer: skip this step** — the controller does it with the owner after the branch is reviewed. Run the dev server (`node scripts/run-vite.mjs --dev`, `.env.local` points at the live backend). In a signed-out private window open `http://localhost:5173/approvals?q=Test`, sign in as an HR or Manager account, and confirm you land on Approvals with "Test" in the search box. Then open `http://localhost:5173/requests?req=<one of your own request ids>` and confirm the request pop-up opens and the URL drops `?req=`. (Ask the owner to sign in; don't handle their password.)

- [ ] **Step 11: Commit**

```bash
git add src/utils/returnPath.jsx src/App.jsx src/pages/Login.jsx src/pages/Approvals.jsx src/pages/MyRequests.jsx tests/frontend.test.mjs
git commit -m "Open email links in the right place, including after signing in"
```

---

### Task 7: Deploy whole function folders

**Files:**
- Modify: `scripts/deploy-aws.mjs`

**Interfaces:**
- Produces: `node scripts/deploy-aws.mjs --function-only [--function=notify]` copies every `.ts` file of each function folder to `/opt/chartwells/chartwells-supabase/volumes/functions/<name>/`, backs the old folder up to `/opt/chartwells/function-backups/<stamp>/<name>` (outside the served folder, because every folder in there is served as a function), then restarts the edge-functions container once.

- [ ] **Step 1: Replace the single-file constants**

Replace:

```js
const functionPath =
  "/opt/chartwells/chartwells-supabase/volumes/functions/employee-access/index.ts";
```

with:

```js
const functionsRoot = "/opt/chartwells/chartwells-supabase/volumes/functions";
// Outside functionsRoot: every folder in there is served as a function.
const backupRoot = "/opt/chartwells/function-backups";
const onlyFunction = process.argv
  .find((arg) => arg.startsWith("--function="))
  ?.slice("--function=".length);
const functionNames = ["employee-access", "notify"].filter(
  (name) => !onlyFunction || name === onlyFunction,
);
if (onlyFunction && functionNames.length === 0) {
  throw new Error(`Unknown function: ${onlyFunction}`);
}
```

Add `readdirSync` to the `node:fs` import:

```js
import { readdirSync, readFileSync } from "node:fs";
```

- [ ] **Step 2: Add an SSM helper** — after `function waitForCommand(commandId) { … }` add:

```js
function ssm(commands) {
  const commandId = aws(
    "ssm", "send-command",
    "--instance-ids", instance,
    "--document-name", "AWS-RunShellScript",
    "--parameters", JSON.stringify({ commands }),
    "--query", "Command.CommandId",
    "--output", "text",
  );
  return waitForCommand(commandId);
}
```

- [ ] **Step 3: Replace the `if (deployFunction) { … }` deploy block** (the one that builds `commands` for `employee-access`) with:

```js
if (deployFunction) {
  for (const name of functionNames) {
    const dir = resolve("supabase/functions", name);
    const target = `${functionsRoot}/${name}`;
    const backup = `${backupRoot}/${stamp}/${name}`;
    const staging = `${backupRoot}/${stamp}/${name}.next`;
    ssm(["set -eu", `mkdir -p '${staging}'`]);
    // One command per file keeps each SSM call well under its parameter size limit.
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".ts")).sort()) {
      const source = readFileSync(resolve(dir, file));
      const sha = createHash("sha256").update(source).digest("hex");
      ssm([
        "set -eu",
        `printf '%s' '${source.toString("base64")}' | base64 -d > '${staging}/${file}'`,
        `echo '${sha}  ${staging}/${file}' | sha256sum -c - >/dev/null`,
      ]);
    }
    ssm([
      "set -eu",
      `chmod 755 '${staging}'`,
      `chmod 644 '${staging}'/*`,
      `if [ -e '${target}' ]; then mv '${target}' '${backup}'; fi`,
      `mv '${staging}' '${target}'`,
    ]);
    console.log(`Edge Function ${name} deployed. Server backup: ${backup}`);
  }
  ssm(["set -eu", "docker restart supabase-edge-functions >/dev/null"]);
  console.log("Edge Functions restarted.");
}
```

- [ ] **Step 4: Dry run**

Run: `node scripts/deploy-aws.mjs --function-only --function=notify --dry-run`
Expected: `AWS account 836548369971; checking function.` then `Dry run complete. No AWS resources were changed.` (needs a live `aws login` session).

- [ ] **Step 5: Commit**

```bash
git add scripts/deploy-aws.mjs
git commit -m "Deploy whole Edge Function folders, one function at a time if asked"
```

---

### Task 8: Production rollout (owner approves each step)

Run every server command through SSM (`aws ssm send-command … AWS-RunShellScript`, as in `scripts/deploy-aws.mjs`) unless it says the owner runs it. Never print `.env` values. Stop and report if any step fails.

- [ ] **Step 1: Confirm `employee-access` on the server matches the repo** (the full deploy would replace it)

Another session has uncommitted `employee-access` changes in the main checkout, so this branch's copy may not be what is live. Always deploy with `--function=notify`. (For the record: compare `sha256sum …/volumes/functions/employee-access/index.ts` on the server with `shasum -a 256` of both checkouts' copies and tell the owner.)

- [ ] **Step 2: Back up server config and add the non-secret settings** (owner approves)

```bash
set -eu
cd /opt/chartwells/chartwells-supabase
stamp=$(date +%Y%m%d-%H%M%S)
cp .env ".env.bak-notify-$stamp"
cp docker-compose.yml "docker-compose.yml.bak-notify-$stamp"
grep -q '^NOTIFY_SECRET=' .env || echo "NOTIFY_SECRET=$(openssl rand -hex 32)" >> .env
grep -q '^APP_URL=' .env || echo 'APP_URL=https://d2hxxrhfzq1k3r.cloudfront.net' >> .env
grep -q '^EMAIL_FROM_NAME=' .env || echo 'EMAIL_FROM_NAME="Chartwells PTO"' >> .env
python3 - <<'PY'
import re
p = "docker-compose.yml"
s = open(p).read()
if "NOTIFY_SECRET:" not in s:
    anchor = '      VERIFY_JWT: "${FUNCTIONS_VERIFY_JWT}"\n'
    assert s.count(anchor) == 1, "functions VERIFY_JWT line not found exactly once"
    s = s.replace(anchor, anchor + "".join(
        f"      {k}: ${{{k}}}\n"
        for k in ["GMAIL_USER", "GMAIL_APP_PASSWORD", "EMAIL_FROM_NAME", "APP_URL", "NOTIFY_SECRET"]))
    open(p, "w").write(s)
PY
docker compose config --quiet && echo "compose OK; backups .env.bak-notify-$stamp docker-compose.yml.bak-notify-$stamp"
```

Expected: `compose OK; …` (docker compose may warn that `GMAIL_USER`/`GMAIL_APP_PASSWORD` are unset; that is the next step).

- [ ] **Step 3: The owner adds the Gmail credentials themselves**

The owner opens AWS console → Systems Manager → Session Manager → Start session on `i-0ab29bf3040dc6657`, and pastes:

```bash
bash -c 'read -p "Gmail address: " GU; read -s -p "App Password: " GP; echo; printf "GMAIL_USER=%s\nGMAIL_APP_PASSWORD=\"%s\"\n" "$GU" "$GP" | sudo tee -a /opt/chartwells/chartwells-supabase/.env >/dev/null; echo saved'
```

Then verify (names only): `grep -c '^GMAIL_' /opt/chartwells/chartwells-supabase/.env` → `2`.

- [ ] **Step 4: Deploy the function and recreate the container** (owner approves; a few seconds of downtime for `employee-access`)

Local: `node scripts/deploy-aws.mjs --function-only --function=notify`.
Server: `cd /opt/chartwells/chartwells-supabase && docker compose up -d functions && sleep 5 && docker inspect supabase-edge-functions --format '{{range .Config.Env}}{{println .}}{{end}}' | cut -d= -f1 | grep -E 'GMAIL|NOTIFY|APP_URL|EMAIL_FROM'`
Expected: the five names listed.

- [ ] **Step 5: Probe the gate and send the samples** (owner gives the address — ideally their work Outlook inbox — and approves)

```bash
set -eu
cd /opt/chartwells/chartwells-supabase
SECRET=$(grep '^NOTIFY_SECRET=' .env | cut -d= -f2-)
docker exec -i supabase-db psql -U postgres -v ON_ERROR_STOP=1 -v secret="$SECRET" -v to="OWNER_ADDRESS" <<'SQL'
select net.http_post('http://functions:9000/notify', '{"events":[]}'::jsonb, headers := '{"Content-Type":"application/json","x-notify-secret":"wrong"}'::jsonb) as bad;
select net.http_post('http://functions:9000/notify', jsonb_build_object('samples_to', :'to'), headers := jsonb_build_object('Content-Type','application/json','x-notify-secret', :'secret'), timeout_milliseconds := 30000) as good;
select pg_sleep(20);
select id, status_code, content from net._http_response order by id desc limit 2;
SQL
```

Expected: one response `403 {"error":"Forbidden"}` and one `200 {"sent":6,"failed":0}`. If `sent` is 0, read `docker logs --tail 50 supabase-edge-functions` (nodemailer/SMTP errors). The owner checks the six emails in Outlook and on a phone; adjust `email.ts` if needed (repeat Task 3 tests, redeploy with `--function=notify`).

- [ ] **Step 6: Apply the migration and turn notifications on** (owner approves)

Copy the migration to the server through SSM (base64, sha256-checked, like the deploy script), then:

```bash
set -eu
cd /opt/chartwells/chartwells-supabase
SECRET=$(grep '^NOTIFY_SECRET=' .env | cut -d= -f2-)
docker exec -i supabase-db psql -U postgres -v ON_ERROR_STOP=1 < /tmp/202610130002_request_notifications.sql
docker exec -i supabase-db psql -U postgres -v ON_ERROR_STOP=1 -v secret="$SECRET" <<'SQL'
insert into public.notification_settings (function_url, secret)
values ('http://functions:9000/notify', :'secret')
on conflict (id) do update set function_url = excluded.function_url, secret = excluded.secret;
select tgname from pg_trigger where tgrelid = 'public.requests'::regclass and tgname like 'requests_%notifications' order by 1;
select has_table_privilege('authenticated', 'public.notification_settings', 'select') as browser_can_read;
SQL
```

Expected: `requests_collect_notifications`, `requests_send_notifications`; `browser_can_read = f`.

- [ ] **Step 7: Deploy the frontend** (owner approves)

Back up the bucket first: `aws s3 sync s3://chartwells-pto-app-836548369971 ~/Downloads/chartwells-pto-s3-backup-20261013`. Then `node scripts/deploy-aws.mjs --frontend-only`, `aws cloudfront wait invalidation-completed --distribution-id E28QGWFC6YNZD5 --id <id>`, and check `curl -s https://d2hxxrhfzq1k3r.cloudfront.net/ | grep -o 'assets/index-[^"]*\.js'` names the new bundle.

- [ ] **Step 8: Live check with the owner**

A real submit emails every Manager and HR user in that person's org, so the owner chooses how to test (for example, submit and cancel a one-day request from their own account after warning HR). Confirm: approvers get one email; approving/denying emails the requester; links open the filtered Approvals page and the request pop-up. Check `docker logs --tail 50 supabase-edge-functions` for `notify: … sent`.

- [ ] **Step 9: Merge**

After the owner is happy, use superpowers:finishing-a-development-branch to merge `request-emails` into `main`.

Rollback, if needed: `delete from public.notification_settings;` stops all calls at once. Full removal: run `202610130002_request_notifications_rollback.sql`, restore the `.env`/`docker-compose.yml` backups from Step 2, and `docker compose up -d functions`.
