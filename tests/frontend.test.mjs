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
const holiday = await server.ssrLoadModule("/src/utils/holidayDayOff.jsx");
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
  assert.equal(mappers.mapRequest({ id: "t", request_lines: [] }).kind, "time_off");
});
const labor = { id: "labor", date: "2026-09-07", name: "Labor Day" },
  dayOffType = { id: "hd", name: "Holiday Day Off", isHolidayDayOff: true },
  dayOff = (start, end = start) => ({ type: "hd", holidayId: "labor", start, end });
test("holiday windows run from the holiday through 30 days after it", () => {
  const harvest = { id: "harvest", date: "2026-09-20", name: "Harvest" };
  assert.equal(holiday.holidayWindowEnd("2026-09-07"), "2026-10-07");
  assert.deepEqual(
    holiday.holidaysCovering([labor, harvest], "2026-09-21", "2026-09-21").map((h) => h.id),
    ["labor", "harvest"],
  );
  assert.deepEqual(holiday.holidaysCovering([labor], "2026-10-07", "2026-10-08"), []);
  assert.deepEqual(holiday.holidaysCovering([labor], "2026-09-06", "2026-09-06"), []);
  assert.equal(holiday.holidayNote("Labor Day"), "Request time off for Labor Day");
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
  assert.match(check([dayOff("2026-09-21")], [booked]).errors[0], /balance is short/);
  assert.ok(check([dayOff("2026-09-21")], [{ ...booked, status: "cancelled" }]).ok);
  assert.match(check([dayOff("2026-09-21", "2026-09-22")]).errors[0], /exactly one working day/);
  assert.match(check([dayOff("2026-10-08")]).errors[0], /must fall within/);
});
test("a booked holiday day off reads as its holiday and turns stale when the holiday is removed or moved", () => {
  const r = mappers.mapRequest({
    id: "h",
    requester_id: "u",
    status: "pending",
    request_lines: [
      { pto_type_id: "hd", start_date: "2026-09-21", end_date: "2026-09-21", holiday_id: "labor", holiday_name: "Labor Day" },
    ],
  });
  assert.equal(helpers.requestTypeLabel(r, [dayOffType]), "Labor Day");
  assert.equal(holiday.requestHolidayIssue(r, [labor]), null);
  assert.equal(holiday.requestHolidayIssue(r, []).kind, "removed");
  assert.equal(holiday.requestHolidayIssue(r, [{ ...labor, date: "2026-08-01" }]).kind, "moved");
  assert.equal(holiday.requestHolidayIssue({ ...r, status: "denied" }, []), null);
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
