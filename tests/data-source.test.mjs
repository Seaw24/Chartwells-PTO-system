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
      if (args.p_request_id === "bad")
        return { data: null, error: { message: "Not authorized" } };
      return { data: null, error: null };
    },
  };
  return api;
}
test("balance reads share grants, schedules, and approved requests across PTO types", async () => {
  const year = new Date().getFullYear();
  const api = client({
    profiles: [{ id: "u", normal_days_off: [0, 6] }],
    holidays: [],
    pto_grants: [
      { user_id: "u", pto_type_id: "v", leave_year: year, amount: 10 },
      { user_id: "u", pto_type_id: "s", leave_year: year, amount: 5 },
    ],
    requests: [],
  });
  const source = createSupabaseDataSource(api);
  const result = await Promise.all([
    source.balanceFor("u", "v"),
    source.balanceFor("u", "s"),
    source.grantFor("u", "v"),
    source.usedFor("u", "v"),
  ]);
  assert.deepEqual(result, [10, 5, 10, 0]);
  assert.equal(api.calls.filter((v) => v === "profiles").length, 1);
  assert.equal(api.calls.filter((v) => v === "pto_grants").length, 1);
  assert.equal(api.calls.filter((v) => v === "requests").length, 1);
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
    client({ profiles: [{ id: "u", normal_days_off: [0, 6] }] }, (table) =>
      table === "requests" ? { message: "Permission denied" } : null,
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
      {
        id: "w",
        requester_id: "other",
        request_lines: [],
        status: "pending",
        kind: "wellness_grant",
      },
      { id: "t", requester_id: "other", request_lines: [], status: "pending" },
    ],
  });
  const source = createSupabaseDataSource(api);
  // The same procedures serve time off and wellness grants.
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
