# Everyone sees who's off — design

Date: 2026-10-14

## Goal

Anyone signed in sees the same "who's off" picture on the Calendar and Dashboard that HR (God
Admin) sees today: every team, real names, leave types, approved and pending time off, with the
same team and person filters HR has.

Nothing else about permissions changes. Approving, denying, undoing, booking for others,
balances, the Approvals page, the Team page and Reports keep their current rules.

## What changes for each role

| | Employee today | Manager today | Everyone after |
|---|---|---|---|
| Teams visible | own team, counts only | teams they manage | every team |
| Names and leave types | hidden | own teams | everyone |
| Statuses shown | — | approved, pending | approved, pending |
| Team filter (calendar) | none | none | yes, opens on "All teams" |
| Person filter (calendar) | none | yes | yes |
| Timeline view, "Next off" | no | yes | yes |
| Team filter (dashboard) | yes (only self in it) | yes | yes |

Denied and cancelled requests are never shown for other people. The calendar's status filter
already only offers Approved and Pending, so this holds on both pages.

Clicking a bar opens the request detail only when the viewer can already open that request:
their own, their managed teams' for managers, all for God Admins. Every other bar is view only,
with no pointer cursor and no hover state that suggests it can be clicked. Notes, denial
reasons, stamps, balances and emails stay private.

Deactivated people are not added to anyone's view. HR still sees what it saw before, since its own
reads already cover every request.

## Why not just widen the database rules

`requests`, `request_lines` and `profiles` are limited by RLS to what the viewer may manage.
Opening them to everyone would expose notes, emails and stamps, and would flood the Approvals
page: `pendingForApprover` lists every pending request the caller can read and leaves the
approve/deny check to the server. So the rules stay as they are and the new view comes from
two narrow, read-only functions.

## Database — `supabase/migrations/202610140001_everyone_sees_whos_off.sql` (+ rollback)

Written against live helper names. The active-account check is inlined
(`exists (select 1 from profiles where id = auth.uid() and is_active)`), because the recovered
`active_actor()` does not exist live.

**`who_is_off()`** — `security definer`, `stable`, `search_path = public`. Raises
`Not authenticated.` for an inactive or missing caller. Returns one row per request line of
every `approved` or `pending` request whose requester is active:

- `request_id`, `requester_id`, `status`
- `pto_type_id`, `start_date`, `end_date`, `holiday_id`, `holiday_name`

It returns no notes, reasons, stamps or timestamps. The holiday columns are there so the
existing line helpers treat Holiday Day Off lines exactly as they do now.

**`team_directory()`** — same security shape. Returns one row per active person:

- `id`, `name`, `memberships` (jsonb array of `{team_id, role}`)

No email, org role, normal days off or other profile fields.

Both functions get `grant execute … to authenticated`, plus `revoke … from public, anon`.
Live default privileges grant new functions to `authenticated` already, so the revoke from
`anon` is the part that matters.

## Data source — `src/data/supabaseDataSource.jsx`

- Both reads treat a missing function or failed call as an empty list (like `request_stamp_facts`),
  so each viewer keeps their current view until the migration is applied.
- `whoIsOff()` calls the RPC and groups rows by `request_id` into request-shaped objects:
  `{ id, userId, status, lines: [{ type, start, end, holidayId, holidayName }], viewOnly: true }`.
- `teamDirectory()` returns people shaped like `mapProfile` output for the fields the pages use:
  `{ id, name, team, memberships: [{ teamId, role }], isActive: true }`, with `team` picked the
  same way `mapProfile` picks it (the admin membership, otherwise the first one).

## Shared merge — `src/utils/whosOff.jsx` (new)

`mergeWhosOff({ requests, users, offRows, directory })` returns `{ requests, users }`:

- `requests`: every request the viewer can already read (unchanged, clickable), plus each
  `whoIsOff` request whose id is not already present (marked `viewOnly`).
- `users`: catalog users, plus directory people whose id is not already present.

Both pages call it, so their rules can't drift apart.

## Calendar — `src/pages/CalendarPage.jsx`

- The `calendar-requests` resource also loads `whoIsOff()` and `teamDirectory()` and merges them.
  The merged lists replace `Q` (requests) and `users` throughout the page, including the person
  picker, the Timeline rows, the team-picker counts and `userById` lookups in "All entries".
- The team filter shows for everyone. Its initial value is `"all"` for everyone, managers
  included.
- The person picker, Timeline and "Next off" show for everyone (drop the `canApprove` gates on
  them; `d` stays for anything approval-related).
- The team/person scoping in `_e` and `ee` uses the God Admin branch for every role.
- The employee-only counts mode (`aggregateOnly`, "Names and leave types stay private") is
  removed from the page and the phone layout; everyone gets the named summary.
- On phones, the day panel says "Tap a person to view the request" only when one of the
  entries can be opened, otherwise "Who's off this day".
- `Ea` (bar click) does nothing for a `viewOnly` entry. Chips for those entries render without
  the clickable affordance. The "All entries" modal lists them as plain rows, not buttons.
- `?req=` deep links work only for requests the viewer can open, as now.

## Dashboard — `src/pages/Dashboard.jsx`, `src/components/dashboard/DashboardView.jsx`

- The `dashboard` resource also loads `whoIsOff()` and `teamDirectory()` and builds the coverage
  week from the merged requests and users.
- `onBarClick` ignores `viewOnly` bars. `CoverageBar` and `MobileCoverageBar` render those
  without the button affordance.

## Testing

- `tests/database.test.mjs` (PGlite):
  - An employee in team A gets team B's approved and pending lines from `who_is_off()`, but no
    denied or cancelled ones.
  - A deactivated person's requests and directory entry are left out.
  - A deactivated caller gets `Not authenticated.`
  - `anon` cannot execute either function.
  - The result columns are exactly the listed ones (nothing private leaks).
- `tests/data-source.test.mjs`: `whoIsOff` grouping and `mergeWhosOff` de-duplication. A
  request the viewer can read keeps its full, clickable copy.
- `pnpm build`, then a browser check as an employee, a manager and HR on both pages.

## Rollout

1. Apply the migration in Studio and check that both functions exist on live.
2. Deploy the frontend with the usual AWS steps.

Either order works: before the migration is applied, the new frontend falls back to each viewer's
current view.

## Out of scope

- Any change to approval, booking or balance rules.
- A person filter on the dashboard (planned separately).
- Showing notes or approval details to people who couldn't see them before.
