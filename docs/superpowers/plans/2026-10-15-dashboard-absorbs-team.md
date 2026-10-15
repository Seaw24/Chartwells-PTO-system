# Dashboard Absorbs the Team Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Dashboard shows the Team page's timeline (Week/Month, prev/next, collapsible teams, full roster, profile drawer) with click-a-day-to-request and the personal summary below; shift coverage UI and the Team page are removed.

**Architecture:** `src/components/team/TeamTimeline.jsx` stays the one timeline: its builder drops coverage and carries `viewOnly`, and its views gain day-click and a `canOpenPerson` gate. `src/pages/Dashboard.jsx` takes over the page state from `TeamPage.jsx`; `DashboardView.jsx` loses its own week timeline. Spec: `docs/superpowers/specs/2026-10-15-dashboard-absorbs-team-design.md`.

**Tech Stack:** React 18, react-router-dom, date-fns, lucide-react, Vite; tests with `node --test` loading source through Vite `ssrLoadModule`.

## Global Constraints

- Frontend only; no migration, no permission change.
- `src/index.css` is compiled Tailwind: only use utility classes that already appear in the codebase (copy class strings from existing components).
- Everyone sees every team via `mergeWhosOff`; bars with `viewOnly` are not clickable.
- HR (`god_admin`) starts with every team expanded; everyone else gets their own teams first and expanded, other teams after and collapsed. A single team picked in the filter is shown expanded.
- Names open `EmployeeProfile` only when `canViewPerson(viewer, person)`; otherwise plain text.
- No "On shift" row, no "Short …"/"Covered" labels, no warning triangles, no "Names and leave types stay private" messages.
- Toolchain: `export PATH=~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH` and `PNPM=~/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm`.

---

### Task 1: Timeline builder without coverage, plus initial team layout

**Files:**
- Modify: `src/components/team/TeamTimeline.jsx` (`buildTeamTimeline`, `Vp`, `useCoverage`, imports)
- Test: `tests/frontend.test.mjs`

**Interfaces:**
- Produces: `buildTeamTimeline({ todayIso, anchorIso, unit, users, requests, teams, holidays })` → `{ unit, days, rangeStart, rangeEnd, teams: [{ id, name, size, rows, offCount, anyoneOff }], totalOff, rangeLabel }`; each bar has `viewOnly: boolean`. No `coverage`/`shortDays`.
- Produces: `initialTeamLayout(viewer, teams)` → `{ teams, collapsed }` where `collapsed` is `{ [teamId]: true }`.

- [ ] **Step 1: Write the failing tests** (append to `tests/frontend.test.mjs`, and add `const timeline = await server.ssrLoadModule("/src/components/team/TeamTimeline.jsx");` next to the other loads)

```js
test("HR opens every team; everyone else gets their own teams first and open", () => {
  const teams = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const hr = timeline.initialTeamLayout({ role: "god_admin", memberships: [] }, teams);
  assert.deepEqual(hr.teams.map((t) => t.id), ["a", "b", "c"]);
  assert.deepEqual(hr.collapsed, {});
  const emp = timeline.initialTeamLayout(
    { role: "employee", team: "c", memberships: [{ teamId: "c", role: "employee" }] },
    teams,
  );
  assert.deepEqual(emp.teams.map((t) => t.id), ["c", "a", "b"]);
  assert.deepEqual(emp.collapsed, { a: true, b: true });
  const mgr = timeline.initialTeamLayout(
    { role: "admin", team: "b", memberships: [{ teamId: "b", role: "admin" }, { teamId: "c", role: "employee" }] },
    teams,
  );
  assert.deepEqual(mgr.teams.map((t) => t.id), ["b", "c", "a"]);
  assert.deepEqual(mgr.collapsed, { a: true });
  const none = timeline.initialTeamLayout({ role: "employee", memberships: [] }, teams);
  assert.deepEqual(none.collapsed, {});
});
test("the team timeline lists the whole roster, carries view-only bars, and has no coverage", () => {
  const data = timeline.buildTeamTimeline({
    todayIso: "2026-10-15",
    anchorIso: "2026-10-15",
    unit: "week",
    teams: [{ id: "a", name: "A" }],
    users: [
      { id: "u1", name: "Ann", team: "a", memberships: [{ teamId: "a" }] },
      { id: "u2", name: "Bob", team: "a", memberships: [{ teamId: "a" }] },
    ],
    requests: [
      { id: "r1", userId: "u1", status: "approved", viewOnly: true,
        lines: [{ type: "v", start: "2026-10-13", end: "2026-10-14" }] },
    ],
  });
  const team = data.teams[0];
  assert.equal(team.size, 2);
  assert.equal(team.rows.length, 2);
  assert.equal(team.offCount, 1);
  assert.equal(data.totalOff, 1);
  assert.equal(team.rows[0].bars[0].viewOnly, true);
  assert.equal("coverage" in team, false);
  assert.equal("shortDays" in team, false);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `$PNPM test 2>&1 | grep -E "^not ok|^# (pass|fail)"`
Expected: both new tests fail (`initialTeamLayout is not a function`, `coverage` present).

- [ ] **Step 3: Implement**

In `buildTeamTimeline`: remove the `coverageRows` parameter, the `b` coverage-row filter, the `j` coverage map and `S` short-days; set `N = x.length`; add `viewOnly: !!C.viewOnly` to each bar; set `R = _.filter((E) => E.bars.length > 0).length`; return `{ id, name, size: N, rows: _, offCount: R, anyoneOff: R > 0 }`. Delete `Vp` and `useCoverage`, and the now-unused `useResource`/`useDataSource` imports. Add:

```js
// HR sees every team open. Everyone else gets the teams they belong to first and open, with the
// rest after them, collapsed.
export function initialTeamLayout(viewer, teams = []) {
  if (isGodAdmin(viewer?.role)) return { teams, collapsed: {} };
  const ids = new Set((viewer?.memberships ?? []).map((m) => m.teamId));
  viewer?.team && ids.add(viewer.team);
  const mine = teams.filter((t) => ids.has(t.id));
  if (mine.length === 0) return { teams, collapsed: {} };
  const rest = teams.filter((t) => !ids.has(t.id));
  return {
    teams: [...mine, ...rest],
    collapsed: Object.fromEntries(rest.map((t) => [t.id, true])),
  };
}
```

(import `isGodAdmin` from `../../utils/constants.jsx`.)

- [ ] **Step 4: Run tests** — `$PNPM test`, expected all pass.

- [ ] **Step 5: Commit** — `git commit -am "Team timeline: drop shift coverage, carry view-only bars, add initial layout"`

### Task 2: Timeline views — day click, name gate, view-only bars, no coverage UI

**Files:**
- Modify: `src/components/team/TeamTimeline.jsx` (`DesktopTeamTimeline`, `TeamHeader`, `TeamSection`, `TeamPersonRow`, `TeamRequestBar`, `TeamCoverageTotals` (delete), `MobileTeamTimeline`, `MobileTeamSummary`, `MobileTeamBar`)

**Interfaces:**
- Consumes: Task 1 team shape (no `coverage`/`shortDays`).
- Produces: `DesktopTeamTimeline` and `MobileTeamTimeline` accept `{ data, collapsed, onToggleTeam, activeUserId, canOpenPerson, onSelectPerson, onBarClick, highlightId, minRequestIso, onStartRequest }`.

- [ ] **Step 1: `TeamHeader`** takes `minRequestIso, onStartRequest`. Each day cell becomes a `<button type="button">` when `onStartRequest` is set, with `disabled` for `minRequestIso && iso < minRequestIso`, `title="Request time off"`, `aria-label={\`Request time off starting ${iso}\`}`, the `group relative … press` hover classes and the `Vendor_Plus` corner badge copied from `CoverageHeader` in `DashboardView.jsx` (badge only in week view, i.e. `!dense`). Keep the existing cell layout and today/weekend backgrounds.
- [ ] **Step 2: `TeamSection`** header line shows `"N off"` when `team.anyoneOff`, otherwise the check + `" Everyone in"`. Remove the triangle/"Short" branch and the `TeamCoverageTotals` render; delete `TeamCoverageTotals`.
- [ ] **Step 3: `TeamPersonRow`** gets `canOpen`. When false, the name cell is a `<div>` with the same classes minus `press-card` and `group-hover/row:bg-panel/60`, and the full-row overlay button is not rendered. `TeamSection` passes `canOpen={canOpenPerson ? canOpenPerson(y.user) : true}`.
- [ ] **Step 4: `TeamRequestBar` / `MobileTeamBar`** with `bar.viewOnly`: `aria-disabled`, `cursor-default`, no `press`/`hover:*` classes, click handler only stops propagation (the bar click never reaches `onBarClick`).
- [ ] **Step 5: `MobileTeamTimeline`** header right side: `"N off"` or check + `" All in"` (no Short branch). Person rows render as a button only when `canOpenPerson(user)`; otherwise a `<div>` with the same layout and no trailing chevron. The empty-team branch shows `"No one on this team."` instead of the private message.
- [ ] **Step 6: `MobileTeamSummary`** takes `minRequestIso, onStartRequest`, drops all coverage math, and renders each day as a button (styles copied from `MobileCoverage`'s day buttons: `disabled` + `opacity-45` for past days, `active:bg-accent-soft/70`), showing only the weekday letter and date.
- [ ] **Step 7:** Remove now-unused imports (`Vendor_TriangleAlert`, `useEntered`), import `Vendor_Plus`. Run `$PNPM test` and `$PNPM build`; both pass.
- [ ] **Step 8: Commit** — `"Team timeline: click a day to request, gate names, inert view-only bars"`

### Task 3: Dashboard uses the team timeline

**Files:**
- Modify: `src/pages/Dashboard.jsx`, `src/components/dashboard/DashboardView.jsx`
- Delete: `src/components/dashboard/Coverage.jsx`

**Interfaces:**
- Consumes: Task 1 `buildTeamTimeline`, `initialTeamLayout`; Task 2 view props; `canViewPerson` from `src/components/team/EmployeeProfile.jsx`; `mergeWhosOff`, `WhosOffCatalog`.

- [ ] **Step 1: `DashboardView`** props: `{ activeUser, todayIso, users, requests, holidays, personal, loading, onStartRequest, onBarClick, canOpenPerson, onSelectPerson }`. State as in `TeamPageView`: unit, anchor, team filter (initial `"all"`), collapsed (initial from `initialTeamLayout(activeUser, teams).collapsed`). Teams come from `initialTeamLayout(activeUser, teams).teams` filtered by the team filter; `collapsed` passed to the timelines is `{}` when one team is picked. Header markup copied from `TeamPageView` with title `"Team coverage"`, the summary line, then `"Pick any day to request time off."`. Timelines: `DesktopTeamTimeline` / `MobileTeamTimeline` with `minRequestIso={todayIso}`, then `LeaveLegend`, then `PersonalSummary`. Delete `CoverageTimeline`, `CoverageGrid`, `CoverageHeader`, `CoverageTeam`, `CoveragePerson`, `CoverageBar`, `CoverageTotals`, `MobileCoverage`, `MobileCoverageBar`, the `Xs/Lx/to/Ec` constants and unused imports.
- [ ] **Step 2: `Dashboard`** resource drops `coverageForRange`; returns `{ requests, offRequests, directory, myRequests, balances }`. Holidays from the catalog. Add the selected-person state and the `["person", id, …]` detail resource, `setNormalDaysOff` handler, `EmployeeProfile` and `RequestDetailModal` (`onOpenPerson`) wiring copied from `TeamPage`. `canOpenPerson = (u) => canViewPerson(activeUser, u)`. `onBarClick = (bar) => bar.viewOnly || setOpenRequest(bar.requestId)`.
- [ ] **Step 3:** `git rm src/components/dashboard/Coverage.jsx`; `$PNPM test` and `$PNPM build` pass.
- [ ] **Step 4: Commit** — `"Dashboard: show the team timeline with week/month, roster and profiles"`

### Task 4: Remove the Team page

**Files:**
- Delete: `src/pages/TeamPage.jsx`
- Modify: `src/App.jsx` (import, `/team` route), `src/components/layout/AppLayout.jsx` (`"/team"` title, mobile menu link), `src/components/layout/Sidebar.jsx` (Team link)

- [ ] **Step 1:** Replace the `/team` route with `<Vendor_Route path="team" element={<Vendor_Navigate to="/" replace={!0} />} />`; remove the `TeamPage` import; delete the file; remove the two nav entries and the title entry; drop `Vendor_Users` imports if they become unused.
- [ ] **Step 2:** `grep -rn "TeamPage\|\"/team\"" src` returns only the redirect route. `$PNPM test`, `$PNPM build` pass.
- [ ] **Step 3: Commit** — `"Remove the Team page; /team goes to the Dashboard"`

### Task 5: Verify in the browser, then deploy

- [ ] **Step 1:** Run the dev server against the real backend and check, desktop and phone width, Week and Month: day click opens a request starting that day; past days disabled; HR all expanded; employee/manager own teams first and expanded; single-team filter expanded; names open the drawer only where allowed; view-only bars inert; no coverage UI or private messages; `/team` lands on `/`; no Team nav link.
- [ ] **Step 2:** Ask the user before deploying; then follow the AWS frontend deploy steps (build → back up S3 → upload assets then `index.html` → invalidate CloudFront `E28QGWFC6YNZD5`).
