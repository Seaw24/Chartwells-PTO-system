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
after(() => server.close());
test("business days respect custom schedules and holidays", () => {
  assert.equal(
    dates.businessDays("2026-09-07", "2026-09-11", [0, 6], ["2026-09-07"]),
    4,
  );
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
