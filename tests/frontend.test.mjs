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
const timeline = await server.ssrLoadModule("/src/components/team/TeamTimeline.jsx");
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
  for (const tab of approvals.APPROVAL_TABS("Waiting on HR")) {
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
  assert.match(reason(f.teamAdmin, f.pending(), "god"), /\bHR\b/);
  assert.match(reason(f.otherAdmin, f.pending(), "team"), /team/i);
  assert.match(
    reason(f.teamAdmin, f.pending({ god: { by: "g1", at: now } }), "god"),
    /\bHR\b/,
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
    /Sarah.*\bHR\b.*denial/i,
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
test("HR bookings may use past dates; every other rule still applies", () => {
  const type = { id: "vac", name: "Vacation", allowBackdate: false };
  const draft = (start) => ({ lines: [{ type: "vac", start, end: start }] });
  const base = {
    todayIso: "2026-09-28",
    balances: { vac: 5 },
    ptoTypes: [type],
  };
  const past = policy.validateDraft({ ...base, draft: draft("2026-09-21") });
  assert.equal(past.ok, false);
  assert.match(past.lineResults[0].errors.join(" "), /in the past/);
  assert.equal(
    policy.validateDraft({ ...base, draft: draft("2026-09-21"), allowPast: true })
      .ok,
    true,
  );
  // Balance still binds an HR booking.
  const short = policy.validateDraft({
    ...base,
    balances: { vac: 0 },
    draft: draft("2026-09-21"),
    allowPast: true,
  });
  assert.equal(short.ok, false);
  assert.match(short.lineResults[0].errors.join(" "), /balance is short/);
});
test("stamp facts carry who in HR booked a request, when the database says so", () => {
  const request = mappers.mapRequest({
    id: "r1",
    requester_id: "u",
    status: "approved",
    request_lines: [],
  });
  const [booked] = mappers.applyStampFacts([request], [
    { request_id: "r1", booked_by_name: "Dana Smith" },
  ]);
  assert.equal(booked.bookedByName, "Dana Smith");
  const [plain] = mappers.applyStampFacts([request], [{ request_id: "r1" }]);
  assert.equal(plain.bookedByName, null);
});
test("roles read as HR and Manager while the stored values stay the same", () => {
  assert.equal(names.ROLE_META.god_admin.label, "HR");
  assert.equal(names.ROLE_META.admin.label, "Manager");
  assert.equal(names.isGodAdmin("god_admin"), true);
});
test("an HR booking goes to book_requests_for with the person and the same item shape", async () => {
  const { createSupabaseDataSource } = await server.ssrLoadModule(
    "/src/data/supabaseDataSource.jsx",
  );
  const calls = [];
  const client = {
    rpc: async (name, args) => (calls.push({ name, args }), { data: [], error: null }),
  };
  const source = createSupabaseDataSource(client);
  await source.bookRequestsFor("person-1", {
    lines: [
      { type: "vac", start: "2026-09-21", end: "2026-09-21", note: " Called in " },
      { type: "hol", start: "2026-12-28", end: "2026-12-28", holidayId: "h1", note: "" },
    ],
  });
  assert.deepEqual(calls, [
    {
      name: "book_requests_for",
      args: {
        p_requester: "person-1",
        p_requests: [
          { type_id: "vac", start: "2026-09-21", end: "2026-09-21", holiday_id: null, note: "Called in" },
          { type_id: "hol", start: "2026-12-28", end: "2026-12-28", holiday_id: "h1", note: null },
        ],
      },
    },
  ]);
});
test("leave years follow each type's reset day, and Vacation keeps calendar years until Oct 1, 2027", async () => {
  const ly = await server.ssrLoadModule("/src/utils/leaveYear.jsx");
  const vac = { resetMonth: 10, resetDay: 1, firstReset: "2027-10-01" };
  assert.equal(ly.leaveYearFor(vac, "2026-09-28"), 2026);
  assert.equal(ly.leaveYearFor(vac, "2027-09-30"), 2026);
  assert.equal(ly.leaveYearFor(vac, "2027-10-01"), 2027);
  assert.equal(ly.leaveYearFor(vac, "2025-12-31"), 2025);
  assert.equal(ly.leaveYearStart(vac, 2026), "2026-01-01");
  assert.equal(ly.leaveYearEnd(vac, 2026), "2027-09-30");
  assert.equal(ly.leaveYearLabel(vac, 2027), "Oct 1, 2027 – Sep 30, 2028");
  assert.equal(ly.nextReset(vac, "2026-09-28"), "2027-10-01");
  const sick = { resetMonth: 1, resetDay: 1, firstReset: null };
  assert.equal(ly.leaveYearLabel(sick, 2027), "2027");
  assert.equal(ly.nextReset(sick, "2026-09-28"), "2027-01-01");
  // A rule already in effect with no transition.
  const july = { resetMonth: 7, resetDay: 1, firstReset: null };
  assert.equal(ly.leaveYearFor(july, "2027-06-30"), 2026);
  assert.equal(ly.leaveYearFor(july, "2027-07-01"), 2027);
  assert.equal(ly.nextOccurrence(10, 1, "2026-09-28"), "2026-10-01");
  assert.equal(ly.nextOccurrence(10, 1, "2026-10-01"), "2027-10-01");
});
test("a line crossing a reset day is checked against each leave year it touches", () => {
  const type = { id: "vac", name: "Vacation", resetMonth: 10, resetDay: 1, firstReset: null };
  const allowances = [
    { typeId: "vac", leaveYear: 2026, startsOn: "2026-10-01", endsOn: "2027-09-30", amount: 10, used: 9, balance: 1 },
    { typeId: "vac", leaveYear: 2027, startsOn: "2027-10-01", endsOn: "2028-09-30", amount: 10, used: 0, balance: 10 },
  ];
  const check = (start, end) =>
    policy.validateDraft({
      draft: { lines: [{ type: "vac", start, end }] },
      todayIso: "2026-11-02",
      ptoTypes: [type],
      allowances,
    });
  // Wed Sep 29 + Thu Sep 30 come out of 2026 (1 left); Fri Oct 1 + Mon Oct 4 out of 2027.
  const crossing = check("2027-09-29", "2027-10-04");
  assert.equal(crossing.ok, false);
  assert.match(
    crossing.lineResults[0].errors.join(" "),
    /Vacation balance is short\. This needs 2 days but only 1 remain/,
  );
  // Booking ahead is checked against next year's allowance, and says so when short.
  assert.equal(check("2027-10-01", "2027-10-04").ok, true);
  const ahead = check("2027-10-01", "2027-10-29");
  assert.match(
    ahead.lineResults[0].errors.join(" "),
    /Vacation balance is short for Oct 1, 2027 – Sep 30, 2028/,
  );
});
test("allowance reads pick the leave year of the date asked about", async () => {
  const { createSupabaseDataSource } = await server.ssrLoadModule(
    "/src/data/supabaseDataSource.jsx",
  );
  const rows = [
    { user_id: "u", pto_type_id: "vac", leave_year: 2026, starts_on: "2026-01-01", ends_on: "2027-09-30", amount: 12, used: 2 },
    { user_id: "u", pto_type_id: "vac", leave_year: 2027, starts_on: "2027-10-01", ends_on: "2028-09-30", amount: 12, used: 0 },
  ];
  const calls = [];
  const client = {
    rpc: async (name, args) => (calls.push({ name, args }), { data: rows, error: null }),
  };
  const source = createSupabaseDataSource(client);
  assert.equal(await source.balanceFor("u", "vac", "2027-09-30"), 10);
  assert.equal(await source.balanceFor("u", "vac", "2027-10-01"), 12);
  assert.equal(await source.grantFor("u", "vac", "2027-10-02"), 12);
  assert.equal(calls[0].name, "leave_allowances");
  await source.setGrant("u", "vac", 15, 2027);
  assert.deepEqual(calls.at(-1), {
    name: "set_pto_grant",
    args: { p_user_id: "u", p_type_id: "vac", p_leave_year: 2027, p_amount: 15 },
  });
});
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
    {
      role: "admin",
      team: "b",
      memberships: [
        { teamId: "b", role: "admin" },
        { teamId: "c", role: "employee" },
      ],
    },
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
      {
        id: "r1",
        userId: "u1",
        status: "approved",
        viewOnly: true,
        lines: [{ type: "v", start: "2026-10-13", end: "2026-10-14" }],
      },
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
