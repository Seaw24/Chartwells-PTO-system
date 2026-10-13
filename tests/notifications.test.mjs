import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bootDatabase,
  NET_HTTP_POST_STUB,
  NET_HTTP_POST_FAILING,
} from "./helpers/db.mjs";

const db = await bootDatabase();
const hr = "00000000-0000-0000-0000-0000000000a1",
  manager = "00000000-0000-0000-0000-0000000000a2",
  employee = "00000000-0000-0000-0000-0000000000a3",
  type = "00000000-0000-0000-0000-0000000000b1",
  team = "00000000-0000-0000-0000-0000000000c1";
await db.exec(
  `insert into auth.users values('${hr}'),('${manager}'),('${employee}');insert into profiles(id,name,email,org_role,password_setup_required) values('${hr}','Harper Reyes','hr@example.test','god_admin',false),('${manager}','Morgan Lee','manager@example.test','member',false),('${employee}','Emery Stone','employee@example.test','member',false);insert into teams(id,name) values('${team}','Dining');insert into team_memberships(team_id,user_id) values('${team}','${employee}');insert into team_memberships(team_id,user_id,role) values('${team}','${manager}','admin');insert into pto_types(id,name,default_days) values('${type}','Vacation',20);insert into pto_grants values('${employee}','${type}',extract(year from current_date)::integer,20);`,
);
const days = (
  await db.query(
    "select d::date::text as day from generate_series(current_date+1,current_date+30,interval '1 day') d where extract(dow from d) between 1 and 5 order by d limit 10",
  )
).rows.map((r) => r.day);

async function as(id, sql, args = []) {
  await db.exec(
    `set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`,
  );
  return db.query(sql, args);
}
async function asOwner(sql = "") {
  await db.exec(`reset role;${sql}`);
}
async function calls() {
  await asOwner();
  return (await db.query("select url, body, headers from net.calls order by id"))
    .rows;
}
async function clearCalls() {
  await asOwner("delete from net.calls;");
}
async function submit(who, ...picked) {
  const items = picked.map((d) => ({ type_id: type, start: d, end: d }));
  return (
    await as(who, "select submit_requests($1::jsonb) ids", [
      JSON.stringify(items),
    ])
  ).rows[0].ids;
}
// Runs one action and returns the events of the single call it made.
async function eventsOf(action) {
  await clearCalls();
  await action();
  const sent = await calls();
  assert.equal(sent.length, 1, "expected exactly one call");
  return sent[0].body.events;
}
async function statusOf(id) {
  await asOwner();
  return (await db.query("select status from requests where id=$1", [id]))
    .rows[0].status;
}

let pair, denied;
test("nothing is sent until notifications are configured", async () => {
  await clearCalls();
  await submit(employee, days[0]);
  assert.deepEqual(await calls(), []);
});
test("a submit with two time offs makes one call carrying both", async () => {
  await asOwner(
    "insert into notification_settings(function_url,secret) values('http://functions:9000/notify','test-secret');",
  );
  await clearCalls();
  pair = await submit(employee, days[1], days[2]);
  const sent = await calls();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, "http://functions:9000/notify");
  assert.equal(sent[0].headers["x-notify-secret"], "test-secret");
  assert.deepEqual(
    sent[0].body.events,
    pair.map((id) => ({ kind: "submitted", request_id: id })),
  );
});
test("a manager stamp reports the team slot and the manager", async () => {
  const events = await eventsOf(() =>
    as(manager, "select stamp_request($1,'team')", [pair[0]]),
  );
  assert.deepEqual(events, [
    { kind: "stamped", request_id: pair[0], slot: "team", override: false, actor: manager },
  ]);
});
test("an HR stamp reports the HR slot and the HR user", async () => {
  const events = await eventsOf(() =>
    as(hr, "select stamp_request($1,'god')", [pair[0]]),
  );
  assert.deepEqual(events, [
    { kind: "stamped", request_id: pair[0], slot: "god", override: false, actor: hr },
  ]);
  assert.equal(await statusOf(pair[0]), "approved");
});
test("taking a stamp back reports the slot and who took it", async () => {
  const events = await eventsOf(() =>
    as(hr, "select unstamp_request($1,'god')", [pair[0]]),
  );
  assert.deepEqual(events, [
    { kind: "unstamped", request_id: pair[0], slot: "god", actor: hr },
  ]);
});
test("HR replacing a manager's stamp sends nothing", async () => {
  await as(manager, "select stamp_request($1,'team')", [pair[1]]);
  await clearCalls();
  await as(hr, "select stamp_request($1,'team',true)", [pair[1]]);
  assert.deepEqual(await calls(), []);
});
test("a denial reports the slot and who denied", async () => {
  [denied] = await submit(employee, days[3]);
  const events = await eventsOf(() =>
    as(manager, "select deny_request($1,'Short on staff that week')", [denied]),
  );
  assert.deepEqual(events, [
    { kind: "denied", request_id: denied, slot: "team", actor: manager },
  ]);
});
test("undoing a denial reports the slot and who undid it", async () => {
  const events = await eventsOf(() =>
    as(manager, "select unstamp_request($1,'team')", [denied]),
  );
  assert.deepEqual(events, [
    { kind: "undenied", request_id: denied, slot: "team", actor: manager },
  ]);
});
test("cancelling a request sends nothing", async () => {
  const [id] = await submit(employee, days[4]);
  await clearCalls();
  await as(employee, "select cancel_request($1)", [id]);
  assert.deepEqual(await calls(), []);
});
test("a rolled-back submit sends nothing", async () => {
  await clearCalls();
  await db.exec("begin");
  await submit(employee, days[5]);
  await db.exec("rollback");
  assert.deepEqual(await calls(), []);
});
test("a failing call never blocks the action", async () => {
  await asOwner(NET_HTTP_POST_FAILING);
  try {
    const [id] = await submit(employee, days[6]);
    assert.equal(await statusOf(id), "pending");
  } finally {
    await asOwner(NET_HTTP_POST_STUB);
  }
});
