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
test("bulk decisions report partial success accurately", async () => {
  const source = createSupabaseDataSource(
    client({
      requests: [
        {
          id: "good",
          requester_id: "other",
          request_lines: [],
          status: "approved",
        },
      ],
    }),
  );
  const r = await source.approveMany(["good", "bad"]);
  assert.equal(r.approved.length, 1);
  assert.equal(r.failed.length, 1);
  assert.equal(r.failed[0].id, "bad");
});
