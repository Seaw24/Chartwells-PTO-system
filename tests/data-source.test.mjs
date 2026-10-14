import { test, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
const { createSupabaseDataSource } = await server.ssrLoadModule(
  "/src/data/supabaseDataSource.jsx",
);
const { queryClient } = await server.ssrLoadModule("/src/lib/queryClient.js");
after(() => server.close());
beforeEach(() => queryClient.clear());
function client(tables = {}, failure) {
  const calls = [];
  const api = {
    calls,
    auth: {
      getUser: async () => ({ data: { user: { id: "self" } }, error: null }),
    },
    from(table) {
      let filters = [];
      let single = false;
      const builder = {
        select() {
          return builder;
        },
        eq(key, value) {
          filters.push([key, value]);
          return builder;
        },
        order() {
          return builder;
        },
        not() {
          return builder;
        },
        gte() {
          return builder;
        },
        maybeSingle() {
          single = true;
          return builder;
        },
        single() {
          single = true;
          return builder;
        },
        then(resolve, reject) {
          calls.push(table);
          let rows = (tables[table] ?? []).filter((row) =>
            filters.every(([k, v]) => row[k] === v),
          );
          return Promise.resolve({
            data: single ? (rows[0] ?? null) : rows,
            error: failure?.(table) ?? null,
          }).then(resolve, reject);
        },
      };
      return builder;
    },
    rpc: async (name, args) => {
      calls.push([name, args]);
      if (name === "leave_allowances")
        return {
          data: failure?.(name) ? null : (tables.leave_allowances ?? []),
          error: failure?.(name) ?? null,
        };
      if (args.p_request_id === "bad")
        return { data: null, error: { message: "Not authorized" } };
      return { data: null, error: null };
    },
  };
  return api;
}
test("balance reads share one leave_allowances read across PTO types", async () => {
  const year = new Date().getFullYear();
  const row = (type, amount, used) => ({
    user_id: "u",
    pto_type_id: type,
    leave_year: year,
    starts_on: `${year}-01-01`,
    ends_on: `${year}-12-31`,
    amount,
    used,
  });
  const api = client({ leave_allowances: [row("v", 10, 0), row("s", 5, 0)] });
  const source = createSupabaseDataSource(api);
  const result = await Promise.all([
    source.balanceFor("u", "v"),
    source.balanceFor("u", "s"),
    source.grantFor("u", "v"),
    source.usedFor("u", "v"),
  ]);
  assert.deepEqual(result, [10, 5, 10, 0]);
  assert.equal(
    api.calls.filter((v) => Array.isArray(v) && v[0] === "leave_allowances")
      .length,
    1,
  );
});
test("missing grant remains null, not an invented zero balance", async () => {
  assert.equal(
    await createSupabaseDataSource(
      client({ profiles: [{ id: "u", normal_days_off: [] }] }),
    ).balanceFor("u", "missing"),
    null,
  );
});
test("database failures reject instead of presenting zero usage", async () => {
  const source = createSupabaseDataSource(
    client({}, (name) =>
      name === "leave_allowances" ? { message: "Permission denied" } : null,
    ),
  );
  await assert.rejects(source.usedFor("u", "v"), /permission/i);
});
test("each time off submits as its own request in one call, and Settings never lists the holiday type", async () => {
  const api = client({
    requests: [
      { id: "new", requester_id: "self", request_lines: [], status: "pending" },
    ],
    pto_types: [
      { id: "v", name: "Vacation" },
      { id: "hd", name: "Holiday Day Off", is_holiday_day_off: true },
    ],
  });
  api.rpc = async (name, args) => (
    api.calls.push([name, args]),
    { data: ["new"], error: null }
  );
  const source = createSupabaseDataSource(api);
  const saved = await source.submitRequest({
    lines: [
      {
        type: "v",
        start: "2026-09-18",
        end: "2026-09-18",
        note: " Family trip ",
      },
      {
        type: "hd",
        holidayId: "labor",
        start: "2026-09-21",
        end: "2026-09-21",
        note: "",
      },
    ],
  });
  assert.equal(saved[0].id, "new");
  assert.deepEqual(api.calls.find(Array.isArray), [
    "submit_requests",
    {
      p_requests: [
        {
          type_id: "v",
          start: "2026-09-18",
          end: "2026-09-18",
          holiday_id: null,
          note: "Family trip",
        },
        {
          type_id: "hd",
          start: "2026-09-21",
          end: "2026-09-21",
          holiday_id: "labor",
          note: null,
        },
      ],
    },
  ]);
  assert.deepEqual(
    (await source.getSettingsPtoTypes()).map((t) => t.id),
    ["v"],
  );
});
// request_stamp_facts() may not exist yet, or may fail: the cards must still render, falling back
// to waiting slots and to the catalog for stamper names.
test("request reads survive request_stamp_facts being unavailable", async () => {
  for (const rpc of [
    () => ({ data: null, error: { message: "function does not exist" } }),
    () => {
      throw new Error("network");
    },
  ]) {
    const api = client({
      requests: [
        {
          id: "t",
          requester_id: "other",
          request_lines: [],
          status: "pending",
          team_stamp_by: "ta",
        },
      ],
    });
    api.rpc = async (name, args) => {
      api.calls.push([name, args]);
      return name === "request_stamp_facts"
        ? rpc()
        : { data: null, error: null };
    };
    const source = createSupabaseDataSource(api);
    const rows = await source.getRequests();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].stamps.team.by, "ta");
    // No server answer means no X is claimed, and no name is invented.
    assert.equal(rows[0].stamps.team.naNow, undefined);
    assert.equal(rows[0].stamps.team.byName, undefined);
    assert.equal(rows[0].decidedByName, undefined);
    // The write path re-reads its request through the same facts call.
    assert.equal((await source.unstampRequest("t", "team")).id, "t");
  }
});
test("stamping and denying go through the two-stamp procedures", async () => {
  const api = client({
    requests: [
      { id: "w", requester_id: "other", request_lines: [], status: "pending" },
      { id: "t", requester_id: "other", request_lines: [], status: "pending" },
    ],
  });
  const source = createSupabaseDataSource(api);
  await source.stampRequest("w", "god");
  await source.stampRequest("t", "team", true);
  await source.unstampRequest("t", "team");
  await source.denyRequest("t", "Coverage");
  // Each write re-reads its request, and that read now also pulls the stamp facts the seals need.
  assert.deepEqual(
    api.calls.filter(Array.isArray).map(([name]) => name),
    [
      "stamp_request",
      "request_stamp_facts",
      "stamp_request",
      "request_stamp_facts",
      "unstamp_request",
      "request_stamp_facts",
      "deny_request",
      "request_stamp_facts",
    ],
  );
  assert.deepEqual(
    api.calls
      .filter(Array.isArray)
      .find(
        ([name, args]) => name === "stamp_request" && args.p_slot === "team",
      )[1],
    { p_request_id: "t", p_slot: "team", p_override: true },
  );
});
test("who's off groups lines into view-only requests, and a missing function leaves the view intact", async () => {
  const api = client();
  api.rpc = async (name) => {
    if (name === "who_is_off")
      return {
        data: [
          {
            request_id: "r1",
            requester_id: "bo",
            status: "approved",
            pto_type_id: "v",
            start_date: "2040-03-05",
            end_date: "2040-03-06",
            holiday_id: null,
            holiday_name: null,
          },
          {
            request_id: "r1",
            requester_id: "bo",
            status: "approved",
            pto_type_id: "s",
            start_date: "2040-03-09",
            end_date: "2040-03-09",
            holiday_id: null,
            holiday_name: null,
          },
        ],
        error: null,
      };
    if (name === "team_directory")
      return {
        data: [
          {
            id: "bo",
            name: "Bo Beta",
            memberships: [
              { team_id: "t1", role: "employee" },
              { team_id: "t2", role: "admin" },
            ],
          },
        ],
        error: null,
      };
    return { data: null, error: null };
  };
  const source = createSupabaseDataSource(api);
  assert.deepEqual(await source.whoIsOff(), [
    {
      id: "r1",
      userId: "bo",
      status: "approved",
      viewOnly: true,
      lines: [
        {
          type: "v",
          start: "2040-03-05",
          end: "2040-03-06",
          holidayId: null,
          holidayName: null,
        },
        {
          type: "s",
          start: "2040-03-09",
          end: "2040-03-09",
          holidayId: null,
          holidayName: null,
        },
      ],
    },
  ]);
  assert.deepEqual(await source.teamDirectory(), [
    {
      id: "bo",
      name: "Bo Beta",
      role: "admin",
      team: "t2",
      memberships: [
        { teamId: "t1", role: "employee" },
        { teamId: "t2", role: "admin" },
      ],
      isActive: true,
    },
  ]);
  api.rpc = async () => ({
    data: null,
    error: { message: "function who_is_off() does not exist" },
  });
  assert.deepEqual(await source.whoIsOff(), []);
  assert.deepEqual(await source.teamDirectory(), []);
});
test("the viewer's own copy of a request and of a person wins over the everyone view", async () => {
  const { mergeWhosOff } = await server.ssrLoadModule("/src/utils/whosOff.jsx");
  const mine = { id: "r1", userId: "me", status: "denied", note: "mine" },
    merged = mergeWhosOff({
      requests: [mine],
      users: [{ id: "me", name: "Zed Me", email: "me@x" }],
      offRequests: [
        { id: "r1", userId: "me", status: "denied", viewOnly: true },
        { id: "r2", userId: "bo", status: "pending", viewOnly: true },
      ],
      directory: [
        { id: "me", name: "Zed Me" },
        { id: "bo", name: "Bo Beta" },
      ],
    });
  assert.deepEqual(
    merged.requests.map((r) => [r.id, !!r.viewOnly]),
    [
      ["r1", false],
      ["r2", true],
    ],
  );
  assert.equal(merged.requests[0], mine);
  assert.deepEqual(
    merged.users.map((u) => [u.id, u.email ?? null]),
    [
      ["bo", null],
      ["me", "me@x"],
    ],
  );
});
