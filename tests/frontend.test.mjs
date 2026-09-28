import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { csvCell, toCsv } from "../src/utils/csv.js";
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
const dates = await server.ssrLoadModule("/src/utils/dateHelpers.jsx");
const policy = await server.ssrLoadModule("/src/utils/policyEngine.jsx");
const mappers = await server.ssrLoadModule("/src/data/mappers.jsx");
const helpers = await server.ssrLoadModule("/src/utils/requestHelpers.jsx");
const names = await server.ssrLoadModule("/src/utils/constants.jsx");
const holiday = await server.ssrLoadModule("/src/utils/holidayDayOff.jsx");
const approvals = await server.ssrLoadModule("/src/pages/Approvals.jsx");
after(() => server.close());
test("business days skip regular days off and charge company holidays", () => {
  assert.equal(dates.businessDays("2026-09-07", "2026-09-11", [0, 6]), 5);
  assert.equal(dates.businessDays("2026-09-07", "2026-09-13", [1, 2], []), 5);
});
test("date-only values stay on the intended calendar day", () => {
  assert.equal(dates.toISO(dates.toDateLocal("2026-11-01")), "2026-11-01");
  assert.equal(dates.businessDays("2026-11-01", "2026-11-08", [], []), 8);
});
test("profile mapping preserves multi-team admin membership and explicit empty days off", () => {
  const u = mappers.mapProfile({
    id: "u",
    org_role: "member",
    normal_days_off: [],
    team_memberships: [
      { team_id: "a", role: "employee" },
      { team_id: "b", role: "admin" },
    ],
  });
  assert.equal(u.role, "admin");
  assert.equal(u.team, "b");
  assert.deepEqual(u.normalDaysOff, []);
  assert.equal(u.memberships.length, 2);
});
test("request mapper preserves private notes, line types, and decision metadata", () => {
  const r = mappers.mapRequest({
    id: "r",
    requester_id: "u",
    request_lines: [
      { pto_type_id: "v", start_date: "2026-09-09", end_date: "2026-09-10" },
    ],
    status: "denied",
    note: "Note",
    denial_reason: "Coverage",
  });
  assert.equal(r.userId, "u");
  assert.equal(r.lines[0].type, "v");
  assert.equal(r.denialReason, "Coverage");
});
test("wellness grant requests map without dates and label the days they add", () => {
  const r = mappers.mapRequest({
    id: "w",
    requester_id: "u",
    request_lines: [],
    status: "pending",
    kind: "wellness_grant",
    grant_type_id: "well",
    grant_days: 2,
    grant_year: 2026,
  });
  assert.ok(helpers.isWellnessGrant(r));
  assert.deepEqual(helpers.requestTypeIds(r), ["well"]);
  assert.equal(helpers.requestPrimaryTypeId(r), "well");
  assert.equal(helpers.requestDays(r), 0);
  assert.equal(helpers.requestTypeLabel(r), "Wellness day request");
  assert.equal(helpers.requestRangeLabel(r), "+2 days to balance");
  assert.equal(
    mappers.mapRequest({ id: "t", request_lines: [] }).kind,
    "time_off",
  );
});
const labor = { id: "labor", date: "2026-09-07", name: "Labor Day" },
  dayOffType = { id: "hd", name: "Holiday Day Off", isHolidayDayOff: true },
  dayOff = (start, end = start) => ({
    type: "hd",
    holidayId: "labor",
    start,
    end,
  });
test("holiday windows run from the holiday through 30 days after it", () => {
  const harvest = { id: "harvest", date: "2026-09-20", name: "Harvest" };
  assert.equal(holiday.holidayWindowEnd("2026-09-07"), "2026-10-07");
  assert.deepEqual(
    holiday
      .holidaysCovering([labor, harvest], "2026-09-21", "2026-09-21")
      .map((h) => h.id),
    ["labor", "harvest"],
  );
  assert.deepEqual(
    holiday.holidaysCovering([labor], "2026-10-07", "2026-10-08"),
    [],
  );
  assert.deepEqual(
    holiday
      .holidaysOverlapping([labor, harvest], "2026-10-07", "2026-10-12")
      .map((h) => h.id),
    ["labor", "harvest"],
  );
  assert.deepEqual(
    holiday.holidaysOverlapping([labor], "2026-10-08", "2026-10-09"),
    [],
  );
  assert.deepEqual(
    holiday
      .holidaysOverlapping([labor], "2026-09-01", "2026-09-07")
      .map((h) => h.id),
    ["labor"],
  );
  assert.deepEqual(
    holiday.holidaysCovering([labor], "2026-09-06", "2026-09-06"),
    [],
  );
  assert.equal(
    holiday.holidayNote("Labor Day"),
    "Request time off for Labor Day",
  );
});
test("a holiday allows one pending or approved working day off", () => {
  const check = (lines, existingRequests = []) =>
    policy.validateDraft({
      draft: { lines },
      todayIso: "2026-09-14",
      ptoTypes: [dayOffType],
      holidays: [labor],
      existingRequests,
    });
  assert.ok(check([dayOff("2026-09-21")]).ok);
  const booked = { status: "pending", lines: [dayOff("2026-09-15")] };
  assert.match(
    check([dayOff("2026-09-21")], [booked]).errors[0],
    /balance is short/,
  );
  assert.ok(
    check([dayOff("2026-09-21")], [{ ...booked, status: "cancelled" }]).ok,
  );
  assert.match(
    check([dayOff("2026-09-21", "2026-09-22")]).errors[0],
    /balance is short. This needs 2 days but only 1 remain/,
  );
  assert.match(check([dayOff("2026-10-08")]).errors[0], /must fall within/);
});
test("a booked holiday day off reads as its holiday and turns stale when the holiday is removed or moved", () => {
  const r = mappers.mapRequest({
    id: "h",
    requester_id: "u",
    status: "pending",
    request_lines: [
      {
        pto_type_id: "hd",
        start_date: "2026-09-21",
        end_date: "2026-09-21",
        holiday_id: "labor",
        holiday_name: "Labor Day",
      },
    ],
  });
  assert.equal(helpers.requestTypeLabel(r, [dayOffType]), "Labor Day");
  assert.equal(holiday.requestHolidayIssue(r, [labor]), null);
  assert.equal(holiday.requestHolidayIssue(r, []).kind, "removed");
  assert.equal(
    holiday.requestHolidayIssue(r, [{ ...labor, date: "2026-08-01" }]).kind,
    "moved",
  );
  assert.equal(
    holiday.requestHolidayIssue({ ...r, status: "denied" }, []),
    null,
  );
});
test("date conflicts include pending requests and exclude cancelled requests", () => {
  const req = {
    status: "pending",
    lines: [{ type: "v", start: "2026-09-09", end: "2026-09-10" }],
  };
  assert.ok(policy.findOverlap("2026-09-10", "2026-09-11", [req]));
  assert.equal(
    policy.findOverlap("2026-09-10", "2026-09-11", [
      { ...req, status: "cancelled" },
    ]),
    null,
  );
});
test("CSV safely round-trips quotes, commas, newlines, and formula-like names", () => {
  assert.equal(csvCell('A "quoted", name'), '"A ""quoted"", name"');
  assert.equal(csvCell("=SUM(A1:A2)"), `"'=SUM(A1:A2)"`);
  assert.equal(
    toCsv([
      ["A", "B"],
      ["line\nbreak", "x"],
    ]),
    '"A","B"\r\n"line\nbreak","x"',
  );
});
test("every approvals tab has empty-state copy", () => {
  for (const tab of approvals.APPROVAL_TABS("Waiting on god admin")) {
    const empty = approvals.APPROVAL_EMPTY_STATES[tab.value];
    assert.ok(empty, `no empty state for the "${tab.value}" tab`);
    assert.ok(empty.icon, `no empty-state icon for the "${tab.value}" tab`);
    assert.ok(empty.title, `no empty-state title for the "${tab.value}" tab`);
  }
});
test("a stamp click only asks for confirmation when it touches someone else's stamp", () => {
  const requester = {
      id: "emp",
      isActive: true,
      orgRole: "member",
      role: "employee",
      memberships: [{ teamId: "t1", role: "employee" }],
    },
    teamAdmin = {
      id: "ta",
      isActive: true,
      orgRole: "member",
      role: "admin",
      memberships: [{ teamId: "t1", role: "admin" }],
    },
    god = {
      id: "g1",
      isActive: true,
      orgRole: "god_admin",
      role: "god_admin",
      memberships: [],
    },
    godLead = {
      id: "g3",
      name: "Rae Ito",
      isActive: true,
      orgRole: "god_admin",
      role: "god_admin",
      memberships: [{ teamId: "t1", role: "admin" }],
    },
    otherGod = {
      id: "g2",
      isActive: true,
      orgRole: "god_admin",
      role: "god_admin",
      memberships: [],
    },
    users = [requester, teamAdmin, god, otherGod],
    pending = (stamps = {}) => ({
      id: "r",
      userId: "emp",
      status: "pending",
      stamps: stamps,
    }),
    now = new Date().toISOString();

  assert.deepEqual(helpers.stampAction(teamAdmin, pending(), "team", users), {
    mode: "stamp",
    override: false,
    needsConfirm: false,
  });
  assert.deepEqual(
    helpers.stampAction(
      teamAdmin,
      pending({ team: { by: "ta", at: now } }),
      "team",
      users,
    ),
    { mode: "remove", override: false, needsConfirm: false },
  );
  assert.deepEqual(helpers.stampAction(god, pending(), "god", users), {
    mode: "stamp",
    override: false,
    needsConfirm: false,
  });
  // A god admin standing in for an empty team slot is an override, but there is nothing to clobber.
  assert.deepEqual(helpers.stampAction(god, pending(), "team", users), {
    mode: "stamp",
    override: true,
    needsConfirm: false,
  });
  // A stamp somebody else pressed is taken off, never stamped over, so this asks first.
  assert.deepEqual(
    helpers.stampAction(
      god,
      pending({ team: { by: "ta", at: now } }),
      "team",
      users,
    ),
    { mode: "remove", override: false, needsConfirm: true },
  );
  assert.deepEqual(
    helpers.stampAction(
      otherGod,
      pending({ god: { by: "g1", at: now } }),
      "god",
      users,
    ),
    { mode: "remove", override: false, needsConfirm: true },
  );
  assert.equal(helpers.stampAction(requester, pending(), "team", users), null);
});
// The roster a viewer can read is scoped by RLS — an employee sees only themselves, a team admin
// sees only their teams — so the seal state must never be inferred from it.
const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const today = day(0),
  soon = day(7),
  past = day(-7);
const stampFixture = () => {
  const requester = {
      id: "emp",
      name: "Sam Doe",
      isActive: true,
      orgRole: "member",
      role: "employee",
      memberships: [{ teamId: "t1", role: "employee" }],
    },
    teamAdmin = {
      id: "ta",
      name: "Sarah Kim",
      isActive: true,
      orgRole: "member",
      role: "admin",
      memberships: [{ teamId: "t1", role: "admin" }],
    },
    otherAdmin = {
      id: "oa",
      name: "Pat Ruiz",
      isActive: true,
      orgRole: "member",
      role: "admin",
      memberships: [{ teamId: "t9", role: "admin" }],
    },
    god = {
      id: "g1",
      name: "Marcus Webb",
      isActive: true,
      orgRole: "god_admin",
      role: "god_admin",
      memberships: [],
    },
    // A god admin who also runs the requester's team: filling the empty team slot is that team
    // admin's stamp, not an override of one.
    godLead = {
      id: "g3",
      name: "Rae Ito",
      isActive: true,
      orgRole: "god_admin",
      role: "god_admin",
      memberships: [{ teamId: "t1", role: "admin" }],
    },
    otherGod = {
      id: "g2",
      name: "Ada Stone",
      isActive: true,
      orgRole: "god_admin",
      role: "god_admin",
      memberships: [],
    };
  return {
    requester: requester,
    teamAdmin: teamAdmin,
    otherAdmin: otherAdmin,
    god: god,
    godLead: godLead,
    otherGod: otherGod,
    all: [requester, teamAdmin, otherAdmin, god, godLead, otherGod],
    pending: (stamps = {}, extra = {}) => ({
      id: "r",
      userId: "emp",
      status: "pending",
      stamps: stamps,
      ...extra,
    }),
  };
};

test("a filled team slot is only ever taken off, and an override is only pressed into an empty one", () => {
  const f = stampFixture(),
    now = new Date().toISOString();
  // Stamping in the team admin's place is what an override is, and it needs the slot to be free.
  assert.deepEqual(helpers.stampAction(f.god, f.pending(), "team", f.all), {
    mode: "stamp",
    override: true,
    needsConfirm: false,
  });
  // A god admin who runs this person's team fills the slot as that team admin, not over one.
  assert.deepEqual(helpers.stampAction(f.godLead, f.pending(), "team", f.all), {
    mode: "stamp",
    override: false,
    needsConfirm: false,
  });
  // Once somebody has stamped it, the only thing a click can do is lift it off.
  assert.deepEqual(
    helpers.stampAction(
      f.god,
      f.pending({ team: { by: "ta", at: now } }),
      "team",
      f.all,
    ),
    { mode: "remove", override: false, needsConfirm: true },
  );
  // Including their own override, which behaves like any other stamp of theirs.
  assert.deepEqual(
    helpers.stampAction(
      f.god,
      f.pending({ team: { by: "g1", at: now, override: true } }),
      "team",
      f.all,
    ),
    { mode: "remove", override: false, needsConfirm: false },
  );
  // A team admin's own stamp is the same gesture, so the two roles read alike.
  assert.deepEqual(
    helpers.stampAction(
      f.teamAdmin,
      f.pending({ team: { by: "ta", at: now } }),
      "team",
      f.all,
    ),
    { mode: "remove", override: false, needsConfirm: false },
  );
  // The god slot cannot be replaced either; an occupied one is lifted off.
  assert.deepEqual(
    helpers.stampAction(
      f.otherGod,
      f.pending({ god: { by: "g1", at: now } }),
      "god",
      f.all,
    ),
    { mode: "remove", override: false, needsConfirm: true },
  );
});

test("slot state never calls a slot unfillable from the viewer's own partial roster", () => {
  const f = stampFixture(),
    // What an employee sees of their own request: a roster of one, and no god admins in it.
    mine = [f.requester];
  assert.equal(helpers.slotState(f.pending(), "god", mine).state, "waiting");
  assert.equal(helpers.slotState(f.pending(), "team", mine).state, "waiting");
  // The server's answer, carried on the request, is what decides an X.
  const told = f.pending({ god: { naNow: true }, team: { naNow: false } });
  assert.equal(helpers.slotState(told, "god", mine).state, "na");
  assert.equal(helpers.slotState(told, "team", mine).state, "waiting");
  // A decided request keeps the flags frozen at the moment of the decision.
  const decided = {
    ...f.pending({
      team: { na: true },
      god: { by: "g1", at: "2026-09-18T10:00:00Z" },
    }),
    status: "approved",
  };
  assert.equal(helpers.slotState(decided, "team", mine).state, "na");
});

test("a blocked stamp click explains itself in the viewer's own terms", () => {
  const f = stampFixture(),
    now = new Date().toISOString(),
    reason = (me, req, slot, users = f.all) =>
      helpers.stampBlockedReason(me, req, slot, users);
  assert.match(reason(f.requester, f.pending(), "team"), /your own request/i);
  assert.match(reason(f.requester, f.pending(), "god"), /your own request/i);
  assert.match(reason(f.teamAdmin, f.pending(), "god"), /god admin/i);
  assert.match(reason(f.otherAdmin, f.pending(), "team"), /team/i);
  assert.match(
    reason(f.teamAdmin, f.pending({ god: { by: "g1", at: now } }), "god"),
    /god admin/i,
  );
  assert.match(
    reason(
      f.teamAdmin,
      f.pending(
        { team: { by: "ta", at: now } },
        { lines: [{ type: "v", start: past, end: past }] },
      ),
      "team",
    ),
    /already started/i,
  );
  assert.match(
    reason(f.teamAdmin, { ...f.pending(), status: "denied" }, "team"),
    /denied/i,
  );
  assert.match(
    reason(f.teamAdmin, f.pending({ team: { naNow: true } }), "team"),
    /nobody/i,
  );
  // Anything the viewer may actually do has no reason to give.
  assert.equal(reason(f.teamAdmin, f.pending(), "team"), null);
  assert.equal(
    reason(f.god, f.pending({ team: { by: "ta", at: now } }), "team"),
    null,
  );
});
test("slot state carries the names from the row, for viewers whose roster cannot resolve them", () => {
  const alone = [
      { id: "emp", name: "Sam Doe", role: "employee", memberships: [] },
    ],
    req = {
      id: "r",
      userId: "emp",
      status: "approved",
      decidedByName: "Marcus Webb",
      decidedBy: "g1",
      stamps: {
        team: {
          by: "ta",
          at: "2026-09-18T14:12:00Z",
          override: true,
          overrideOf: "x1",
          byName: "Jen Alvarez",
          byRole: "admin",
          overrideOfName: "Dana Poole",
        },
        god: {
          by: "g1",
          at: "2026-09-18T15:00:00Z",
          byName: "Marcus Webb",
          byRole: "god_admin",
        },
      },
      deniedSlot: null,
    },
    team = helpers.slotState(req, "team", alone),
    god = helpers.slotState(req, "god", alone);
  assert.equal(team.state, "override");
  assert.equal(team.byName, "Jen Alvarez");
  assert.equal(team.byRole, "admin");
  assert.equal(team.overrideOfName, "Dana Poole");
  assert.equal(god.byName, "Marcus Webb");
  assert.equal(god.byRole, "god_admin");
  // A denial is recorded on the request rather than in a slot, so its name comes from there.
  const denied = helpers.slotState(
    { ...req, status: "denied", deniedSlot: "team" },
    "team",
    alone,
  );
  assert.equal(denied.state, "denied");
  assert.equal(denied.byName, "Marcus Webb");
});
// A profile column can be null, and `name ?? ""` defaults only fire for undefined. Every caller
// passes a name straight off a row, so the helpers have to take a null without throwing.
test("name helpers tolerate a missing name", () => {
  for (const missing of [null, void 0, ""]) {
    assert.equal(names.firstName(missing), "");
    assert.equal(names.initials(missing), "");
  }
  assert.equal(names.firstName("Jen Alvarez"), "Jen");
  assert.equal(names.initials("Jen Alvarez"), "JA");
});
test("the red seal is how a denial is taken back, on the same rule as a stamp", () => {
  const f = stampFixture(),
    now = new Date().toISOString(),
    denied = (by, start) => ({
      id: "r",
      userId: "emp",
      status: "denied",
      deniedSlot: "team",
      decidedBy: by,
      decidedAt: now,
      denialReason: "Coverage",
      lines: [{ type: "v", start: start, end: start }],
      stamps: { team: {}, god: { na: true } },
    });
  // The admin who denied it, up until the day the time off begins.
  assert.deepEqual(
    helpers.stampAction(f.teamAdmin, denied("ta", soon), "team", f.all),
    {
      mode: "remove",
      override: false,
      needsConfirm: false,
    },
  );
  // The first day off has arrived, or gone by.
  assert.equal(
    helpers.stampAction(f.teamAdmin, denied("ta", today), "team", f.all),
    null,
  );
  assert.equal(
    helpers.stampAction(f.teamAdmin, denied("ta", past), "team", f.all),
    null,
  );
  assert.match(
    helpers.stampBlockedReason(f.teamAdmin, denied("ta", today), "team", f.all),
    /already started/i,
  );
  // A wellness grant has no dates, so it has no such moment and the window stays open. What bounds
  // it instead is the grant trigger, which refuses to pull days back below the ones already booked.
  assert.equal(
    helpers.stampAction(
      f.teamAdmin,
      { ...denied("ta", past), lines: [] },
      "team",
      f.all,
    ).mode,
    "remove",
  );
  // A god admin, whenever — and reaching into somebody else's decision still asks first.
  assert.deepEqual(
    helpers.stampAction(f.god, denied("ta", past), "team", f.all),
    {
      mode: "remove",
      override: false,
      needsConfirm: true,
    },
  );
  // Another team admin did not make this decision.
  assert.equal(
    helpers.stampAction(f.otherAdmin, denied("ta", soon), "team", f.all),
    null,
  );
  // It names whoever made the decision, so the reader knows who to ask.
  assert.match(
    helpers.stampBlockedReason(f.otherAdmin, denied("ta", soon), "team", f.all),
    /Sarah.*God Admin.*denial/i,
  );
  // Only the seal that turned red lifts it; the other one is settled.
  assert.equal(
    helpers.stampAction(f.god, denied("ta", soon), "god", f.all),
    null,
  );
  // The requester never undoes a decision about themselves.
  assert.equal(
    helpers.stampAction(f.requester, denied("ta", soon), "team", f.all),
    null,
  );
});
