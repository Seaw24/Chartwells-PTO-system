# Dashboard absorbs the Team page — design

Date: 2026-10-15

## Goal

The Dashboard and the Team page draw nearly the same team timeline. Keep one: the Dashboard takes
the Team page's timeline UI and UX, keeps its own click-a-day-to-request and the personal summary
and balances below, and the Team page is removed.

Shift coverage goes away with it: no "On shift" totals, no "Short …"/"Covered" labels, no warning
triangles. The timeline shows who is off, not whether a team is short.

## What the Dashboard shows after

**Header** (Team page layout)

- Eyebrow with the range label ("Oct 11–17"), title "Team coverage", and a summary line:
  "N people off this week/month" or "Everyone's in this week/month", then
  "Pick any day to request time off."
- Prev/next arrows, Today, the range label, the team filter ("All teams" plus each team, with
  member counts), and the Week/Month toggle.

**Timeline** (Team page `DesktopTeamTimeline` / `MobileTeamTimeline`)

- Every team, every person on it, including people who are in ("In this week" on phones).
- Bars for approved and pending time off, pending dashed, as now.
- Teams collapse and expand from their header row.
- Week and Month views; prev/next moves by one week or one month.
- The leave-type legend under the timeline.

**From the Dashboard**

- Day headers are buttons: hover shows the "+", click opens a new request starting that day.
  Works in Week and Month. Days before today are disabled, as now. On phones, the day strip at
  the top (week view) is tappable the same way; phone Month view has no day strip, so requests
  there go through the New Request button.
- Data comes from `mergeWhosOff` (`who_is_off()` + `team_directory()` on top of the viewer's own
  reads), so everyone sees every team.
- Bars the viewer cannot open are view only (`viewOnly`), as on the current Dashboard.
- `PersonalSummary` (balances, upcoming, pending) stays below the timeline, unchanged.

**Initial expand/collapse**

- HR (`god_admin`): every team expanded, in the normal team order.
- Everyone else: the teams they belong to (any membership) come first and are expanded; all other
  teams are listed after them, collapsed.
- Picking a single team in the team filter shows that team expanded.
- Toggling stays in component state for the visit; nothing is remembered.

**Clicking a name**

- Opens the `EmployeeProfile` drawer only when `canViewPerson(viewer, person)` is true: yourself,
  your team for managers, anyone for HR. Other names render as plain text, with no button,
  pointer cursor or hover state.
- The drawer keeps its current behaviour (history, balances, normal days off, book on behalf),
  wired the way `TeamPage` wires it today, including `RequestDetailModal`'s "open person".

## Removed

- Coverage UI: `TeamCoverageTotals` ("On shift" row), the "Short …"/"Covered" labels in team
  headers on desktop and mobile, the warning triangles and coverage bars in `MobileTeamSummary`,
  and the coverage fields in `buildTeamTimeline` (`coverage`, `shortDays`, `size` from coverage
  rows). The Dashboard no longer calls `coverageForRange`; `useCoverage` goes.
- Both "Names and leave types stay private" messages (Dashboard mobile, Team timeline mobile).
- The Dashboard's own timeline: `CoverageTimeline`, `CoverageGrid`, `CoverageHeader`,
  `CoverageTeam`, `CoveragePerson`, `CoverageBar`, `CoverageTotals`, `MobileCoverage`,
  `MobileCoverageBar`, `LeaveLegend`, and `src/components/dashboard/Coverage.jsx`.
- `src/pages/TeamPage.jsx`, the `/team` route, its `AppLayout` title entry, and the Team links in
  the sidebar and the mobile menu. `/team` redirects to `/`.

Kept: `TeamDrawer` (used by the Profile page), `coverageForRange` in the data source (harmless,
may be used later), `PersonalSummary`, `BalanceRings`, `BalanceRow`.

## Code shape

- `src/components/team/TeamTimeline.jsx` keeps the timeline: `buildTeamTimeline`, desktop and
  mobile views, bars, rows. It gains:
  - `minRequestIso` / `onStartRequest` props, passed down to `TeamHeader` and
    `MobileTeamSummary`, which render day cells as buttons when `onStartRequest` is given.
  - `canOpenPerson(user)` prop; `TeamPersonRow` and the mobile person row render a button only
    when it returns true.
  - `viewOnly` carried onto bars, with the non-clickable styling from the current Dashboard bars.
- `src/pages/Dashboard.jsx` holds the page state the Team page had (unit, anchor date, team filter,
  collapsed map, selected person, open request) plus the Dashboard's personal summary and
  request starting. The view (header, timeline, legend, `PersonalSummary`) goes in
  `src/components/dashboard/DashboardView.jsx`, which shrinks to that view, the legend and the
  personal summary pieces.
- Team ordering and the initial collapsed map come from one small helper,
  `initialTeamLayout(viewer, teams)` → `{ teams, collapsed }`, so it can be tested on its own.

## Data

- One resource for the page: `getRequests()`, `whoIsOff()`, `teamDirectory()`, the viewer's own
  requests and balances (as the Dashboard loads now), merged with `mergeWhosOff`.
- `who_is_off()` is not date-bounded, so moving between weeks and months does not refetch.
- Holidays come from the catalog, as on the Dashboard now.
- If `who_is_off()` is missing or fails, each viewer falls back to what their own reads return
  (managers their teams, employees themselves), with no message.

## Testing

- Unit tests (`tests/`, node test runner): `initialTeamLayout` for HR, a single-team employee and a
  manager on two teams; `buildTeamTimeline` no longer returns coverage fields and carries
  `viewOnly`.
- `pnpm build`.
- Browser check against the live backend as an employee, a manager and HR: desktop and phone,
  Week and Month, day click opens a request, past days disabled, names open the drawer only where
  allowed, view-only bars inert, `/team` lands on the Dashboard, no Team link in either nav.

## Rollout

Frontend only, no migration. Deploy with the usual AWS steps.

## Out of scope

- Any permission change.
- A person filter on the Dashboard.
- Remembering collapse state between visits.
