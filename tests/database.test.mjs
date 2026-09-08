import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
await db.exec(
  `create schema auth;create table auth.users(id uuid primary key);create role authenticated;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
);
try {
  await db.exec(
    fs.readFileSync(
      "supabase/migrations/202609080001_recovered_contract.sql",
      "utf8",
    ),
  );
} catch (error) {
  console.error(error.message, error.position);
  process.exit(1);
}
const admin = "00000000-0000-0000-0000-000000000001",
  employee = "00000000-0000-0000-0000-000000000002",
  other = "00000000-0000-0000-0000-000000000003",
  type = "00000000-0000-0000-0000-000000000010",
  team = "00000000-0000-0000-0000-000000000020";
await db.exec(
  `insert into auth.users values('${admin}'),('${employee}'),('${other}');insert into profiles(id,name,email,org_role,password_setup_required) values('${admin}','Admin','admin@example.test','god_admin',false),('${employee}','Employee','employee@example.test','member',false),('${other}','Other','other@example.test','member',false);insert into teams(id,name) values('${team}','Dining');insert into team_memberships(team_id,user_id) values('${team}','${employee}'),('${team}','${other}');insert into pto_types(id,name,default_days) values('${type}','Vacation',10);insert into pto_grants values('${employee}','${type}',extract(year from current_date)::integer,10),('${other}','${type}',extract(year from current_date)::integer,10);`,
);
async function as(id, sql, args = []) {
  await db.exec(
    `set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`,
  );
  return db.query(sql, args);
}
const dates = (
  await db.query(
    "select d::date::text as day from generate_series(current_date+1,current_date+15,interval '1 day') d where extract(dow from d) between 1 and 5 order by d limit 3",
  )
).rows.map((r) => r.day);
let request;
test("submit stores a pending request with recovered line contract", async () => {
  const r = await as(employee, "select submit_request($1,$2::jsonb) id", [
    "Time off",
    JSON.stringify([{ type_id: type, start: dates[0], end: dates[0] }]),
  ]);
  request = r.rows[0].id;
  assert.equal(
    (await as(employee, "select status from requests where id=$1", [request]))
      .rows[0].status,
    "pending",
  );
});
test("employees cannot see another employee private request", async () => {
  assert.equal(
    (await as(other, "select * from requests where id=$1", [request])).rows
      .length,
    0,
  );
});
test("self-approval and direct request updates are refused", async () => {
  await assert.rejects(
    as(employee, "select decide_request($1,true,null)", [request]),
    /Not authorized/,
  );
  await assert.rejects(
    as(employee, "update requests set status='approved' where id=$1", [
      request,
    ]),
    /permission denied/,
  );
});
test("overlap and balance rules are enforced by the database", async () => {
  await assert.rejects(
    as(employee, "select submit_request(null,$1::jsonb)", [
      JSON.stringify([{ type_id: type, start: dates[0], end: dates[0] }]),
    ]),
    /overlap/,
  );
  await as(
    admin,
    "select set_pto_grant($1,$2,extract(year from current_date)::integer,0)",
    [employee, type],
  );
  await assert.rejects(
    as(admin, "select decide_request($1,true,null)", [request]),
    /balance is short/,
  );
  await as(
    admin,
    "select set_pto_grant($1,$2,extract(year from current_date)::integer,10)",
    [employee, type],
  );
});
test("approve then undo changes status and records the actor", async () => {
  await as(admin, "select decide_request($1,true,null)", [request]);
  assert.equal(
    (await as(employee, "select status from requests where id=$1", [request]))
      .rows[0].status,
    "approved",
  );
  await as(admin, "select undo_decision($1)", [request]);
  assert.equal(
    (await as(employee, "select status from requests where id=$1", [request]))
      .rows[0].status,
    "pending",
  );
  assert.equal(
    (
      await as(admin, "select * from request_audit where request_id=$1", [
        request,
      ])
    ).rows.length,
    3,
  );
});
test("a denial needs a reason and stale decisions are rejected", async () => {
  await assert.rejects(
    as(admin, "select decide_request($1,false,'')", [request]),
    /reason is required/,
  );
  await as(admin, "select decide_request($1,false,'Coverage needed')", [
    request,
  ]);
  await assert.rejects(
    as(admin, "select decide_request($1,true,null)", [request]),
    /already changed/,
  );
});
test("owner can cancel pending leave and aggregate coverage remains available", async () => {
  const r = await as(employee, "select submit_request(null,$1::jsonb) id", [
    JSON.stringify([{ type_id: type, start: dates[1], end: dates[1] }]),
  ]);
  await as(employee, "select cancel_request($1)", [r.rows[0].id]);
  assert.equal(
    (
      await as(employee, "select status from requests where id=$1", [
        r.rows[0].id,
      ])
    ).rows[0].status,
    "cancelled",
  );
  const coverage = await as(employee, "select * from team_coverage($1,$1)", [
    dates[1],
  ]);
  assert.equal(Number(coverage.rows[0].on_shift_count), 2);
});
test("invalid weekdays and unauthorized grants are rejected", async () => {
  await assert.rejects(
    as(employee, "select set_profile_normal_days_off($1,'{7}'::integer[])", [
      employee,
    ]),
    /valid weekdays/,
  );
  await assert.rejects(
    as(employee, "select set_pto_grant($1,$2,2026,100)", [employee, type]),
    /Not authorized/,
  );
});
test("admin config procedures create types, windows, blackouts, and teams", async () => {
  const t = (
    await as(
      admin,
      "select save_pto_type(null,'Wellness','#123456',2,true,true,$1::jsonb) id",
      [JSON.stringify([{ start: dates[0], end: dates[2] }])],
    )
  ).rows[0].id;
  assert.equal(
    (await as(admin, "select * from date_rules where pto_type_id=$1", [t])).rows
      .length,
    1,
  );
  await as(admin, "select save_blackout(null,$1,$1,'Busy',null)", [dates[2]]);
  await assert.rejects(
    as(employee, "select submit_request(null,$1::jsonb)", [
      JSON.stringify([{ type_id: type, start: dates[2], end: dates[2] }]),
    ]),
    /blackout/,
  );
  await as(admin, "select save_team(null,'Catering','Events','[]'::jsonb)");
});
test("inactive accounts cannot read private data", async () => {
  await as(admin, "select set_profile_active($1,false)", [employee]);
  assert.equal((await as(employee, "select * from requests")).rows.length, 0);
});
