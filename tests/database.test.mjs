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
  await db.exec(
    fs.readFileSync(
      "supabase/migrations/202609140001_wellness_day_requests.sql",
      "utf8",
    ),
  );
  await db.exec(
    fs.readFileSync("supabase/migrations/202609140002_holiday_day_off.sql", "utf8"),
  );
  await db.exec(
    fs.readFileSync("supabase/migrations/202609150001_submit_requests.sql", "utf8"),
  );
} catch (error) {
  console.error(error.message, error.position);
  process.exit(1);
}
const admin = "00000000-0000-0000-0000-000000000001",
  employee = "00000000-0000-0000-0000-000000000002",
  other = "00000000-0000-0000-0000-000000000003",
  type = "00000000-0000-0000-0000-000000000010",
  wellness = "00000000-0000-0000-0000-000000000011",
  team = "00000000-0000-0000-0000-000000000020";
await db.exec(
  `insert into auth.users values('${admin}'),('${employee}'),('${other}');insert into profiles(id,name,email,org_role,password_setup_required) values('${admin}','Admin','admin@example.test','god_admin',false),('${employee}','Employee','employee@example.test','member',false),('${other}','Other','other@example.test','member',false);insert into teams(id,name) values('${team}','Dining');insert into team_memberships(team_id,user_id) values('${team}','${employee}'),('${team}','${other}');insert into pto_types(id,name,default_days) values('${type}','Vacation',10);insert into pto_types(id,name,default_days,is_wellness) values('${wellness}','Wellness Day',2,true);insert into pto_grants values('${employee}','${type}',extract(year from current_date)::integer,10),('${other}','${type}',extract(year from current_date)::integer,10),('${employee}','${wellness}',extract(year from current_date)::integer,2);`,
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
let wellnessRequest;
const wellnessGrant = async () =>
  Number(
    (
      await as(
        admin,
        "select amount from pto_grants where user_id=$1 and pto_type_id=$2",
        [employee, wellness],
      )
    ).rows[0].amount,
  );
test("wellness requests validate the day count and refuse self-approval", async () => {
  await assert.rejects(
    as(employee, "select submit_wellness_request(0,null)"),
    /between 1 and 10/,
  );
  await assert.rejects(
    as(employee, "select submit_wellness_request(11,null)"),
    /between 1 and 10/,
  );
  wellnessRequest = (
    await as(employee, "select submit_wellness_request(2,$1) id", ["Recharge"])
  ).rows[0].id;
  assert.deepEqual(
    (
      await as(
        employee,
        "select kind,status,grant_days,grant_type_id,note from requests where id=$1",
        [wellnessRequest],
      )
    ).rows[0],
    {
      kind: "wellness_grant",
      status: "pending",
      grant_days: 2,
      grant_type_id: wellness,
      note: "Recharge",
    },
  );
  await assert.rejects(
    as(employee, "select decide_wellness_request($1,true,null)", [
      wellnessRequest,
    ]),
    /Not authorized/,
  );
  await assert.rejects(
    as(admin, "select decide_wellness_request($1,true,null)", [request]),
    /not found/,
  );
});
test("approving a wellness request adds its days and undo takes them back", async () => {
  assert.equal(await wellnessGrant(), 2);
  await as(admin, "select decide_wellness_request($1,true,null)", [
    wellnessRequest,
  ]);
  assert.equal(await wellnessGrant(), 4);
  await as(admin, "select undo_decision($1)", [wellnessRequest]);
  assert.equal(await wellnessGrant(), 2);
  await assert.rejects(
    as(admin, "select decide_wellness_request($1,false,' ')", [
      wellnessRequest,
    ]),
    /reason is required/,
  );
});
test("a wellness approval cannot be undone after its days are booked", async () => {
  await as(admin, "select decide_wellness_request($1,true,null)", [
    wellnessRequest,
  ]);
  const days = (
    await as(
      admin,
      "select d::date::text as day from generate_series(current_date+30,current_date+45,interval '1 day') d where extract(dow from d) between 1 and 5 order by d limit 3",
    )
  ).rows.map((r) => ({ type_id: wellness, start: r.day, end: r.day }));
  const booking = (
    await as(employee, "select submit_request(null,$1::jsonb) id", [
      JSON.stringify(days),
    ])
  ).rows[0].id;
  await as(admin, "select decide_request($1,true,null)", [booking]);
  await assert.rejects(
    as(admin, "select undo_decision($1)", [wellnessRequest]),
    /already booked/,
  );
  assert.equal(await wellnessGrant(), 4);
});
// Runs as the table owner, below the procedures, so a trigger's own check is what gets tested.
async function asOwner(sql, args = []) {
  await db.exec("reset role");
  return db.query(sql, args);
}
test("holidays are charged like any other working day", async () => {
  const day = (
    await as(admin, "select d::date::text as day from generate_series(current_date+50,current_date+56,interval '1 day') d where extract(dow from d) between 1 and 5 limit 1")
  ).rows[0].day;
  await as(admin, "insert into holidays(date,name) values($1,'Midweek Holiday')", [day]);
  assert.equal((await as(employee, "select is_working_day($1,$2::date) ok", [employee, day])).rows[0].ok, true);
});
let holidayId, holidayDayOff;
test("a Holiday Day Off books one working day inside its holiday's window, once", async () => {
  const [day, nextDay] = (
    await as(admin, "select d::date::text as day from generate_series(current_date+16,current_date+26,interval '1 day') d where extract(dow from d) between 1 and 5 order by d limit 2")
  ).rows.map((r) => r.day);
  holidayId = (await as(admin, "insert into holidays(date,name) values(current_date-3,'Founders Day') returning id")).rows[0].id;
  await assert.rejects(
    as(employee, "select submit_holiday_day_off($1,$2,$3,null)", [holidayId, day, nextDay]),
    /exactly one working day/,
  );
  await assert.rejects(
    as(employee, "select submit_holiday_day_off($1,current_date+40,current_date+40,null)", [holidayId]),
    /must fall between/,
  );
  holidayDayOff = (
    await as(employee, "select submit_holiday_day_off($1,$2,$2,$3) id", [holidayId, day, "Request time off for Founders Day"])
  ).rows[0].id;
  assert.deepEqual(
    (await as(employee, "select holiday_id, holiday_name from request_lines where request_id=$1", [holidayDayOff])).rows[0],
    { holiday_id: holidayId, holiday_name: "Founders Day" },
  );
  await assert.rejects(
    as(employee, "select submit_holiday_day_off($1,$2,$2,null)", [holidayId, nextDay]),
    /already used your Founders Day day off/,
  );
  const dayOffType = (await as(admin, "select id from pto_types where is_holiday_day_off")).rows[0].id;
  await assert.rejects(
    asOwner("insert into request_lines(request_id,pto_type_id,start_date,end_date) values($1,$2,$3,$3)", [holidayDayOff, dayOffType, nextDay]),
    /holiday card/,
  );
});
test("renaming a holiday renames its bookings, and a removed or moved holiday blocks approval", async () => {
  await as(admin, "update holidays set name='Founders Week' where id=$1", [holidayId]);
  assert.equal(
    (await as(employee, "select holiday_name from request_lines where request_id=$1", [holidayDayOff])).rows[0].holiday_name,
    "Founders Week",
  );
  await as(admin, "update holidays set date=current_date-60 where id=$1", [holidayId]);
  await assert.rejects(
    asOwner("update requests set status='approved' where id=$1", [holidayDayOff]),
    /outside its window/,
  );
  await as(admin, "update holidays set date=current_date-3 where id=$1", [holidayId]);
  await as(admin, "delete from holidays where id=$1", [holidayId]);
  await assert.rejects(
    asOwner("update requests set status='approved' where id=$1", [holidayDayOff]),
    /no longer a company holiday/,
  );
  assert.equal(
    (await as(employee, "select holiday_name from request_lines where request_id=$1", [holidayDayOff])).rows[0].holiday_name,
    "Founders Week",
  );
  await as(employee, "select cancel_request($1)", [holidayDayOff]);
});
test("several time offs submit as separate requests, all or nothing", async () => {
  const [a, b] = (
    await as(admin, "select d::date::text as day from generate_series(current_date+60,current_date+75,interval '1 day') d where extract(dow from d) between 1 and 5 order by d limit 2")
  ).rows.map((r) => r.day);
  const count = async () =>
    Number((await as(employee, "select count(*) n from requests where requester_id=$1", [employee])).rows[0].n);
  const before = await count();
  await assert.rejects(
    as(employee, "select submit_requests($1::jsonb)", [
      JSON.stringify([
        { type_id: type, start: a, end: a, note: "Trip" },
        { type_id: type, start: a, end: a, note: "Same day" },
      ]),
    ]),
    /Time off 2: .*overlap/i,
  );
  assert.equal(await count(), before);
  const made = await as(employee, "select cardinality(submit_requests($1::jsonb)) n", [
    JSON.stringify([
      { type_id: type, start: a, end: a, note: "Trip" },
      { type_id: wellness, start: b, end: b, note: "Rest" },
    ]),
  ]);
  assert.equal(Number(made.rows[0].n), 2);
  assert.equal(await count(), before + 2);
  assert.deepEqual(
    (await as(employee, "select note from requests where requester_id=$1 and note in ('Trip','Rest') order by note", [employee])).rows.map((r) => r.note),
    ["Rest", "Trip"],
  );
});
test("inactive accounts cannot read private data", async () => {
  await as(admin, "select set_profile_active($1,false)", [employee]);
  assert.equal((await as(employee, "select * from requests")).rows.length, 0);
});
