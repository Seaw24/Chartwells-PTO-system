# Chartwells PTO

A paid-time-off system for a **30-person university dining department** that replaced HR's email-and-whiteboard process with **one place to request, approve and see who is off**. Every leave rule runs inside the database, so a request that breaks policy is refused no matter which screen or script sent it.

Built for the Chartwells Higher Education dining team at the University of Utah. Kitchen staff use it from their phones mid-shift; managers and HR use it from the back office.

> **Impact:** one shared record of every request, decision, note and rejection reason · leave rules enforced in Postgres, not in the browser · an email to the right people on every submit and decision.

---

## The problem

Time off used to run through email threads and a whiteboard in the office:

| Before | What went wrong |
| --- | --- |
| Requests by email | Approvals got lost in inboxes, and nobody could find why a request was denied |
| Coverage on a whiteboard | Managers checked overlaps by eye, and the board only showed what someone remembered to write |
| Balances in HR's head or a spreadsheet | Staff could not see what they had left, and HR answered the same question over and over |
| Blackout weeks and holidays | Rules lived in people's memory, so they were applied unevenly across teams |

## What the app does

1. **Requests.** Staff book one or more ranges of time off in one form. Each range is checked against their schedule, holidays, balance, booking windows, blackout dates, overlapping requests and the leave year.
2. **Two-stamp approval.** Every request has a team slot (the manager) and an HR slot. It is granted once both are settled. Either one can deny, and a denial is final unless undone. If nobody can fill a slot (a manager's own request with no co-manager, a lone HR user), the slot settles itself.
3. **Who's off.** A team timeline on the dashboard shows the week or month for every team, so coverage is the first thing people see.
4. **Balances and leave years.** Each leave type has its own leave year with a configurable reset day. Balances come from grants minus booked days.
5. **Holiday day off.** Each holiday opens a 30-day window where a person can book one working day against it.
6. **HR tools.** HR can book on someone's behalf, provision accounts, edit people and teams, set PTO types and blackouts, and export reports to CSV.
7. **Email notifications.** Managers and HR hear about new requests; the requester hears about approvals, denials and reversals.

---

## Architecture

```mermaid
flowchart LR
    subgraph Client["React app (S3 + CloudFront)"]
        UI[Pages: Dashboard, Requests,<br/>Approvals, Calendar, Reports, Settings]
        Q["TanStack Query cache<br/>deduped reads, invalidate on write"]
    end

    subgraph Supabase["Self-hosted Supabase (Docker on EC2)"]
        A[Supabase Auth]
        RPC["Postgres RPCs<br/>submit, stamp, deny, undo, book_for"]
        RLS["Row-level security<br/>owner, manager, HR scopes"]
        DB[("Postgres<br/>requests, lines, grants,<br/>teams, rules, audit")]
        TRG["Commit-time trigger<br/>pg_net, one call per transaction"]
        F1[Edge Function: employee-access]
        F2[Edge Function: notify]
    end

    UI --> Q --> RPC --> DB
    Q --> RLS --> DB
    UI --> A
    UI --> F1 --> A
    DB --> TRG --> F2 --> M[Gmail SMTP]
```

**Three layers:**

- **Frontend (`src/`)**: React 18 and Vite. Screens only render and call the data source. TanStack Query owns server state: it dedupes reads, refreshes the views a write touches, keeps current data on screen during a background refresh and blocks double submits.
- **Database (`supabase/migrations/`)**: the system of record and the rule engine. Writes go through validated RPCs, reads go through row-level security, and every submit and decision leaves an audit entry. Every migration since September ships with a rollback file.
- **Edge Functions (`supabase/functions/`)**: `employee-access` creates accounts and resets temporary passwords with the service-role key, which never reaches the browser. `notify` plans and sends the emails.

---

## How the rules work

**1 · Validate in the database.** `submit_request` calls `assert_request_valid`, which checks working days from the person's schedule, holidays, overlaps with pending or approved requests, remaining balance, booking windows, blackouts and leave-year boundaries. A multi-range form goes through `submit_requests` in one transaction, so either every range saves or none does.

**2 · Scope reads with row-level security.** Active staff can read the roster, configuration and who is off. Request details and grants are visible only to their owner, that person's managers and HR. `who_is_off` and `team_coverage` return the shared view without exposing private notes.

**3 · Stamp, never overwrite.** Approval is two stamp slots on the request, each with who stamped it and when. The RPCs reject self-approval and stale decisions. Undoing a denial or taking back an approval is its own audited action, labelled with the account that did it.

**4 · Notify at commit.** A trigger collects every submit and decision in a transaction and sends one `pg_net` call to `notify` at commit, so a rolled-back change never sends an email. `plan.ts` decides who gets what, `email.ts` builds the markup and `send.ts` is the only file that knows the mail provider. Email is best-effort: a failed send is logged and never undoes the action.

---

## Tech stack

- **Frontend:** React 18, Vite, Tailwind CSS, React Router, TanStack Query, Recharts, date-fns
- **Backend:** Supabase (Postgres, Auth, Edge Functions in TypeScript), PL/pgSQL RPCs, row-level security, `pg_net`
- **Email:** Gmail SMTP through the `notify` Edge Function, with a test mode
- **Hosting:** AWS S3 and CloudFront for the frontend, self-hosted Supabase in Docker on EC2, deploys through AWS Systems Manager
- **Testing:** Node's test runner, PGlite (Postgres in WebAssembly) to run the real migrations, and a local Supabase-shaped fixture server for browser checks

---

## Project structure

```
src/
├── pages/                  # Dashboard, MyRequests, Approvals, CalendarPage, Reports, Settings, Profile
├── components/             # requests/, team/, calendar/, dashboard/, settings/, layout/, ui/
├── data/
│   ├── supabaseDataSource.jsx  # every table read and RPC call
│   └── mappers.jsx             # database rows to UI records
├── context/                # Auth, Org, Catalog, DataVersion
├── hooks/useResource.jsx   # screen subscriptions to the query cache
├── lib/queryClient.js      # read dedupe and invalidation
└── utils/                  # policyEngine, leaveYear, holidayDayOff, whosOff, csv

supabase/
├── migrations/             # schema, RLS, RPCs; each change has a _rollback.sql
└── functions/
    ├── employee-access/    # account creation, temporary-password reset
    └── notify/             # plan.ts, email.ts, send.ts

tests/                      # database (PGlite), notify, notifications, frontend, query cache
scripts/deploy-aws.mjs      # checked, backed-up deploy with --dry-run
```

---

## Getting started (development)

Use Node.js 22 or newer and pnpm 11.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
# Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local
pnpm dev
```

Only the public anon key belongs in Vite variables. Service-role keys stay on the server.

```sh
pnpm check   # source checks
pnpm test    # database, function and frontend tests
pnpm build
```

### Try it without a Supabase project

```sh
pnpm test:fixture
# In another terminal:
VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=fixture-anon-public-key pnpm dev
```

Sign in as `jordan@example.test` with any password. The fixture is an in-memory, Supabase-shaped test server. Its data resets on restart, and it is never deployed.

### Backend and deployment

Database setup, roles, notification settings and maintenance notes are in [supabase/README.md](supabase/README.md). Deployment runs through `scripts/deploy-aws.mjs`: `--dry-run` checks the targets without changing anything, and a real run builds, copies each Edge Function folder to the server, restarts the functions container, backs up `index.html`, uploads hashed assets to S3, publishes the new index and invalidates CloudFront. Old hashed assets stay, so cached pages keep working, and a failed function swap rolls back.

---

## Testing

- **Database:** the PGlite tests run the real migrations, then exercise submits, stamps, denials, undo, HR booking, leave years and row-level access as different roles.
- **Notifications:** `notify` tests cover who gets which email, the HR recipient setting, test mode and commit-time sending through a recording `pg_net` stub.
- **Frontend:** query dedupe and invalidation, failed writes, partial bulk decisions, dates and schedules, and CSV escaping (quoted cells and spreadsheet formula prefixes).

---

## Design decisions worth calling out

- **The database is the rule engine.** Validation lives in RPCs, not React. A request from any client, a script or a future mobile app meets the same rules, and the UI cannot drift from policy.
- **Coverage first.** The dashboard opens on who is off, because that is the question managers actually ask. Balances come second.
- **No surprise refusals.** The form shows which rule a request hits before it is sent, and status never relies on color alone, so it reads at a glance on a kitchen floor.
- **Reversible schema changes.** Each migration since September has a rollback file and was written to run on the live schema, re-runnable and additive where possible.
- **Email can fail without breaking anything.** Notifications fire at commit and are best-effort, so a mail outage never blocks an approval.
