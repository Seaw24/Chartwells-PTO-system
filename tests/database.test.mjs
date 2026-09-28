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
    fs.readFileSync(
      "supabase/migrations/202609140002_holiday_day_off.sql",
      "utf8",
    ),
  );
  await db.exec(
    fs.readFileSync(
      "supabase/migrations/202609150001_submit_requests.sql",
      "utf8",
    ),
  );
  await db.exec(
    fs.readFileSync(
      "supabase/migrations/202609180001_two_stamp_approval.sql",
      "utf8",
    ),
  );
  // Only needed on the deployed database, but it replaces manages_team/manages_person here too,
  // which is how we know the rewritten bodies answer the same as the bootstrap's.
  await db.exec(
    fs.readFileSync(
      "supabase/migrations/202609180003_employee_access_helpers.sql",
      "utf8",
    ),
  );
  await db.exec(
    fs.readFileSync(
      "supabase/migrations/202609180004_stamp_visibility.sql",
      "utf8",
    ),
  );
  await db.exec(
    fs.readFileSync("supabase/migrations/202609180005_undo_denial.sql", "utf8"),
  );
} catch (error) {
  console.error(error.message, error.position);
  process.exit(1);
}
const admin = "00000000-0000-0000-0000-000000000001",
  employee = "00000000-0000-0000-0000-000000000002",
  other = "00000000-0000-0000-0000-000000000003",
  // Fills the team slot for the employee; the god admin fills the other one.
  lead = "00000000-0000-0000-0000-000000000004",
  type = "00000000-0000-0000-0000-000000000010",
  wellness = "00000000-0000-0000-0000-000000000011",
  team = "00000000-0000-0000-0000-000000000020";
await db.exec(
  `insert into auth.users values('${admin}'),('${employee}'),('${other}'),('${lead}');insert into profiles(id,name,email,org_role,password_setup_required) values('${admin}','Admin','admin@example.test','god_admin',false),('${employee}','Employee','employee@example.test','member',false),('${other}','Other','other@example.test','member',false),('${lead}','Lead','lead@example.test','member',false);insert into teams(id,name) values('${team}','Dining');insert into team_memberships(team_id,user_id) values('${team}','${employee}'),('${team}','${other}');insert into team_memberships(team_id,user_id,role) values('${team}','${lead}','admin');insert into pto_types(id,name,default_days) values('${type}','Vacation',10);insert into pto_types(id,name,default_days,is_wellness) values('${wellness}','Wellness Day',2,true);insert into pto_grants values('${employee}','${type}',extract(year from current_date)::integer,10),('${other}','${type}',extract(year from current_date)::integer,10),('${employee}','${wellness}',extract(year from current_date)::integer,2);`,
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
    as(employee, "select stamp_request($1,'god')", [request]),
    /Not authorized/,
  );
  await assert.rejects(
    as(employee, "select stamp_request($1,'team')", [request]),
    /Not authorized/,
  );
  await assert.rejects(
    as(employee, "update requests set status='approved' where id=$1", [
      request,
    ]),
    /permission denied/,
  );
  // The single-approval path is retired for browser clients.
  await assert.rejects(
    as(admin, "select decide_request($1,true,null)", [request]),
    /permission denied/,
  );
});
test("one stamp leaves a request pending and the second grants it", async () => {
  await as(lead, "select stamp_request($1,'team')", [request]);
  const half = (
    await as(
      employee,
      "select status,team_stamp_by,god_stamp_by from requests where id=$1",
      [request],
    )
  ).rows[0];
  assert.equal(half.status, "pending");
  assert.equal(half.team_stamp_by, lead);
  assert.equal(half.god_stamp_by, null);
  await assert.rejects(
    as(lead, "select stamp_request($1,'god')", [request]),
    /Not authorized/,
  );
  await as(admin, "select stamp_request($1,'god')", [request]);
  assert.equal(
    (await as(employee, "select status from requests where id=$1", [request]))
      .rows[0].status,
    "approved",
  );
});
test("removing a stamp puts a granted request back to pending", async () => {
  await assert.rejects(
    as(other, "select unstamp_request($1,'god')", [request]),
    /Only your own stamp/,
  );
  await as(admin, "select unstamp_request($1,'god')", [request]);
  const back = (
    await as(
      employee,
      "select status,team_stamp_by,god_stamp_by from requests where id=$1",
      [request],
    )
  ).rows[0];
  assert.equal(back.status, "pending");
  // The other stamp stays where it is.
  assert.equal(back.team_stamp_by, lead);
  assert.equal(back.god_stamp_by, null);
});
test("a god admin overrides the team slot only after confirming", async () => {
  await assert.rejects(
    as(admin, "select stamp_request($1,'team')", [request]),
    /Confirm the override/,
  );
  await as(admin, "select stamp_request($1,'team',true)", [request]);
  const over = (
    await as(
      admin,
      "select team_stamp_by,team_stamp_override,team_stamp_override_of from requests where id=$1",
      [request],
    )
  ).rows[0];
  assert.equal(over.team_stamp_by, admin);
  assert.equal(over.team_stamp_override, true);
  // The stamp that was replaced is kept.
  assert.equal(over.team_stamp_override_of, lead);
  await as(admin, "select unstamp_request($1,'team')", [request]);
  await as(lead, "select stamp_request($1,'team')", [request]);
});
test("the balance is checked again as the last stamp lands", async () => {
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
    as(admin, "select stamp_request($1,'god')", [request]),
    /balance is short/,
  );
  await as(
    admin,
    "select set_pto_grant($1,$2,extract(year from current_date)::integer,10)",
    [employee, type],
  );
});
test("a denial needs a reason, records its slot, and stops further stamping", async () => {
  await assert.rejects(
    as(admin, "select deny_request($1,'')", [request]),
    /reason is required/,
  );
  await as(admin, "select deny_request($1,'Coverage needed')", [request]);
  assert.equal(
    (
      await as(employee, "select denied_slot from requests where id=$1", [
        request,
      ])
    ).rows[0].denied_slot,
    "god",
  );
  await assert.rejects(
    as(admin, "select stamp_request($1,'god')", [request]),
    /already changed/,
  );
});
test("a slot nobody can fill is an X, and both X grants on submit", async () => {
  // The lead is the only team admin, so their own request has no team approver.
  assert.equal(
    (await as(admin, "select has_team_approver($1) ok", [lead])).rows[0].ok,
    false,
  );
  await as(
    admin,
    "select set_pto_grant($1,$2,extract(year from current_date)::integer,10)",
    [lead, type],
  );
  const leadRequest = (
    await as(lead, "select submit_request(null,$1::jsonb) id", [
      JSON.stringify([{ type_id: type, start: dates[1], end: dates[1] }]),
    ])
  ).rows[0].id;
  await as(admin, "select stamp_request($1,'god')", [leadRequest]);
  assert.equal(
    (await as(lead, "select status from requests where id=$1", [leadRequest]))
      .rows[0].status,
    "approved",
  );
  // The god admin is in no team and is the only god admin: both slots are an X.
  await as(
    admin,
    "select set_pto_grant($1,$2,extract(year from current_date)::integer,10)",
    [admin, type],
  );
  const ownRequest = (
    await as(admin, "select submit_request(null,$1::jsonb) id", [
      JSON.stringify([{ type_id: type, start: dates[1], end: dates[1] }]),
    ])
  ).rows[0].id;
  const own = (
    await as(
      admin,
      "select status,team_stamp_na,god_stamp_na from requests where id=$1",
      [ownRequest],
    )
  ).rows[0];
  assert.equal(own.status, "approved");
  assert.equal(own.team_stamp_na, true);
  assert.equal(own.god_stamp_na, true);
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
    as(employee, "select stamp_request($1,'god')", [wellnessRequest]),
    /Not authorized/,
  );
});
test("a wellness request needs both stamps, and removing one takes its days back", async () => {
  assert.equal(await wellnessGrant(), 2);
  await as(lead, "select stamp_request($1,'team')", [wellnessRequest]);
  // One stamp is not a grant: the days only land when the second arrives.
  assert.equal(await wellnessGrant(), 2);
  await as(admin, "select stamp_request($1,'god')", [wellnessRequest]);
  assert.equal(await wellnessGrant(), 4);
  await as(admin, "select unstamp_request($1,'god')", [wellnessRequest]);
  assert.equal(await wellnessGrant(), 2);
  await assert.rejects(
    as(admin, "select deny_request($1,' ')", [wellnessRequest]),
    /reason is required/,
  );
});
test("a wellness approval cannot be undone after its days are booked", async () => {
  await as(admin, "select stamp_request($1,'god')", [wellnessRequest]);
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
  await as(lead, "select stamp_request($1,'team')", [booking]);
  await as(admin, "select stamp_request($1,'god')", [booking]);
  await assert.rejects(
    as(admin, "select unstamp_request($1,'god')", [wellnessRequest]),
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
    await as(
      admin,
      "select d::date::text as day from generate_series(current_date+50,current_date+56,interval '1 day') d where extract(dow from d) between 1 and 5 limit 1",
    )
  ).rows[0].day;
  await as(
    admin,
    "insert into holidays(date,name) values($1,'Midweek Holiday')",
    [day],
  );
  assert.equal(
    (
      await as(employee, "select is_working_day($1,$2::date) ok", [
        employee,
        day,
      ])
    ).rows[0].ok,
    true,
  );
});
let holidayId, holidayDayOff;
test("a Holiday Day Off books one working day inside its holiday's window, once", async () => {
  const [day, nextDay] = (
    await as(
      admin,
      "select d::date::text as day from generate_series(current_date+16,current_date+26,interval '1 day') d where extract(dow from d) between 1 and 5 order by d limit 2",
    )
  ).rows.map((r) => r.day);
  holidayId = (
    await as(
      admin,
      "insert into holidays(date,name) values(current_date-3,'Founders Day') returning id",
    )
  ).rows[0].id;
  await assert.rejects(
    as(employee, "select submit_holiday_day_off($1,$2,$3,null)", [
      holidayId,
      day,
      nextDay,
    ]),
    /exactly one working day/,
  );
  await assert.rejects(
    as(
      employee,
      "select submit_holiday_day_off($1,current_date+40,current_date+40,null)",
      [holidayId],
    ),
    /must fall between/,
  );
  holidayDayOff = (
    await as(employee, "select submit_holiday_day_off($1,$2,$2,$3) id", [
      holidayId,
      day,
      "Request time off for Founders Day",
    ])
  ).rows[0].id;
  assert.deepEqual(
    (
      await as(
        employee,
        "select holiday_id, holiday_name from request_lines where request_id=$1",
        [holidayDayOff],
      )
    ).rows[0],
    { holiday_id: holidayId, holiday_name: "Founders Day" },
  );
  await assert.rejects(
    as(employee, "select submit_holiday_day_off($1,$2,$2,null)", [
      holidayId,
      nextDay,
    ]),
    /already used your Founders Day day off/,
  );
  const dayOffType = (
    await as(admin, "select id from pto_types where is_holiday_day_off")
  ).rows[0].id;
  await assert.rejects(
    asOwner(
      "insert into request_lines(request_id,pto_type_id,start_date,end_date) values($1,$2,$3,$3)",
      [holidayDayOff, dayOffType, nextDay],
    ),
    /holiday card/,
  );
});
test("renaming a holiday renames its bookings, and a removed or moved holiday blocks approval", async () => {
  await as(admin, "update holidays set name='Founders Week' where id=$1", [
    holidayId,
  ]);
  assert.equal(
    (
      await as(
        employee,
        "select holiday_name from request_lines where request_id=$1",
        [holidayDayOff],
      )
    ).rows[0].holiday_name,
    "Founders Week",
  );
  await as(admin, "update holidays set date=current_date-60 where id=$1", [
    holidayId,
  ]);
  await assert.rejects(
    asOwner("update requests set status='approved' where id=$1", [
      holidayDayOff,
    ]),
    /outside its window/,
  );
  await as(admin, "update holidays set date=current_date-3 where id=$1", [
    holidayId,
  ]);
  await as(admin, "delete from holidays where id=$1", [holidayId]);
  await assert.rejects(
    asOwner("update requests set status='approved' where id=$1", [
      holidayDayOff,
    ]),
    /no longer a company holiday/,
  );
  assert.equal(
    (
      await as(
        employee,
        "select holiday_name from request_lines where request_id=$1",
        [holidayDayOff],
      )
    ).rows[0].holiday_name,
    "Founders Week",
  );
  await as(employee, "select cancel_request($1)", [holidayDayOff]);
});
test("several time offs submit as separate requests, all or nothing", async () => {
  const [a, b] = (
    await as(
      admin,
      "select d::date::text as day from generate_series(current_date+60,current_date+75,interval '1 day') d where extract(dow from d) between 1 and 5 order by d limit 2",
    )
  ).rows.map((r) => r.day);
  const count = async () =>
    Number(
      (
        await as(
          employee,
          "select count(*) n from requests where requester_id=$1",
          [employee],
        )
      ).rows[0].n,
    );
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
  const made = await as(
    employee,
    "select cardinality(submit_requests($1::jsonb)) n",
    [
      JSON.stringify([
        { type_id: type, start: a, end: a, note: "Trip" },
        { type_id: wellness, start: b, end: b, note: "Rest" },
      ]),
    ],
  );
  assert.equal(Number(made.rows[0].n), 2);
  assert.equal(await count(), before + 2);
  assert.deepEqual(
    (
      await as(
        employee,
        "select note from requests where requester_id=$1 and note in ('Trip','Rest') order by note",
        [employee],
      )
    ).rows.map((r) => r.note),
    ["Rest", "Trip"],
  );
});
test("inactive accounts cannot read private data", async () => {
  await as(admin, "select set_profile_active($1,false)", [employee]);
  assert.equal((await as(employee, "select * from requests")).rows.length, 0);
});
// The browser used to answer this from the roster each viewer is allowed to read, which is how a
// team admin ended up being told no god admin could approve a request while one existed.
// Its own cast and its own request, so nothing an earlier test deactivated or stamped can move
// these answers.
const fEmp = "00000000-0000-0000-0000-0000000000a1",
  fLead = "00000000-0000-0000-0000-0000000000a2",
  fGod = "00000000-0000-0000-0000-0000000000a3",
  fOutsider = "00000000-0000-0000-0000-0000000000a4",
  fTeam = "00000000-0000-0000-0000-0000000000a5";
let facts;
// Three separate dated requests, each on its own clear weekday.
const undoDates = [];
test("stamp facts answer the slot questions the same way for every viewer who can see the request", async () => {
  // as() leaves the session as `authenticated`; seeding needs the owner back.
  await db.exec(
    `reset role;insert into auth.users values('${fEmp}'),('${fLead}'),('${fGod}'),('${fOutsider}');insert into profiles(id,name,email,org_role,password_setup_required) values('${fEmp}','Facts Employee','fe@example.test','member',false),('${fLead}','Facts Lead','fl@example.test','member',false),('${fGod}','Facts God','fg@example.test','god_admin',false),('${fOutsider}','Facts Outsider','fo@example.test','member',false);insert into teams(id,name) values('${fTeam}','Facts Team');insert into team_memberships(team_id,user_id) values('${fTeam}','${fEmp}');insert into team_memberships(team_id,user_id,role) values('${fTeam}','${fLead}','admin');insert into pto_grants values('${fEmp}','${type}',extract(year from current_date)::integer,10);`,
  );
  // Far enough out to clear the blackout an earlier test put on dates[2].
  const far = (
    await db.query(
      "select d::date::text as day from generate_series(current_date+45,current_date+60,interval '1 day') d where extract(dow from d) between 1 and 5 order by d limit 1",
    )
  ).rows[0].day;
  const fresh = (
    await as(fEmp, "select submit_request($1,$2::jsonb) id", [
      "Facts",
      JSON.stringify([{ type_id: type, start: far, end: far }]),
    ])
  ).rows[0].id;
  facts = fresh;
  undoDates.push(
    ...(
      await db.query(
        "select d::date::text as day from generate_series(current_date+61,current_date+95,interval '1 day') d where extract(dow from d) between 1 and 5 order by d limit 4",
      )
    ).rows.map((r) => r.day),
  );
  await as(fLead, "select stamp_request($1,'team')", [fresh]);
  await as(fGod, "select stamp_request($1,'god')", [fresh]);
  const seen = {};
  for (const who of [fEmp, fLead, fGod]) {
    const rows = (
      await as(who, "select * from request_stamp_facts($1)", [fresh])
    ).rows;
    assert.equal(
      rows.length,
      1,
      `${who} should read the facts for this request`,
    );
    seen[who] = rows[0];
  }
  // A god admin exists and the requester has a team admin, so neither slot is an X — and all three
  // viewers are told exactly that.
  for (const [who, row] of Object.entries(seen)) {
    assert.equal(row.god_na_now, false, `god_na_now for ${who}`);
    assert.equal(row.team_na_now, false, `team_na_now for ${who}`);
  }
  assert.deepEqual(seen[fEmp], seen[fLead]);
  assert.deepEqual(seen[fLead], seen[fGod]);
  // Names come back for stamps the viewer could not otherwise resolve.
  assert.equal(seen[fEmp].team_stamp_by_name, "Facts Lead");
  assert.equal(seen[fEmp].team_stamp_by_role, "admin");
  assert.equal(seen[fEmp].god_stamp_by_name, "Facts God");
  assert.equal(seen[fEmp].god_stamp_by_role, "god_admin");
});
test("stamp facts never reach a request the caller cannot read", async () => {
  assert.equal(
    (await as(fOutsider, "select * from request_stamp_facts($1)", [facts])).rows
      .length,
    0,
  );
});
// Undoing a denial went missing: this repo's bootstrap undo_decision() accepted
// status in ('approved','denied'), the deployed one only ever accepted 'approved', and the
// two-stamp migration revoked the function from the browser altogether. So a denial became
// permanent. It is lifted through the seal that turned red, on the same rule that governs taking a
// stamp off: the admin who did it while the window is open, or any god admin. The window closes
// when the time off begins.
test("a denial is lifted by the admin who made it, or by a god admin", async () => {
  const denied = async () => {
    const day = undoDates.shift();
    const id = (
      await as(fEmp, "select submit_request($1,$2::jsonb) id", [
        "Undo",
        JSON.stringify([{ type_id: type, start: day, end: day }]),
      ])
    ).rows[0].id;
    await as(fLead, "select deny_request($1,'Coverage')", [id]);
    return id;
  };
  const first = await denied();
  assert.equal(
    (
      await as(fLead, "select status, denied_slot from requests where id=$1", [
        first,
      ])
    ).rows[0].denied_slot,
    "team",
  );
  // The requester cannot undo somebody else's decision about them.
  await assert.rejects(
    as(fEmp, "select unstamp_request($1,'team')", [first]),
    /denied this|authorized|Only/,
  );
  await as(fLead, "select unstamp_request($1,'team')", [first]);
  const back = (
    await as(
      fLead,
      "select status, denied_slot, denial_reason, undone_by from requests where id=$1",
      [first],
    )
  ).rows[0];
  assert.equal(back.status, "pending");
  assert.equal(back.denied_slot, null);
  assert.equal(back.denial_reason, null);
  assert.equal(back.undone_by, fLead);

  // The window closes when the time off begins, not a fixed time after the decision.
  const second = await denied();
  await db.exec(
    `reset role;update request_lines set start_date = current_date, end_date = current_date where request_id = '${second}'`,
  );
  await assert.rejects(
    as(fLead, "select unstamp_request($1,'team')", [second]),
    /already started/,
  );
  // A god admin may lift it whenever.
  await as(fGod, "select unstamp_request($1,'team')", [second]);
  assert.equal(
    (await as(fGod, "select status from requests where id=$1", [second]))
      .rows[0].status,
    "pending",
  );

  // Only the slot that denied it can lift it.
  const third = await denied();
  await assert.rejects(
    as(fLead, "select unstamp_request($1,'god')", [third]),
    /no stamp to remove|did not deny/,
  );
});
// A wellness grant has no dated lines, so there is no first day off for the window to close on. It
// stays open; what bounds it is the grant trigger, which will not pull days back below the ones
// already booked.
test("a denied wellness grant has no window to miss", async () => {
  const id = (
    await as(fEmp, "select submit_wellness_request(2,$1) id", ["Recharge"])
  ).rows[0].id;
  await as(fLead, "select deny_request($1,'Not this quarter')", [id]);
  assert.equal(
    (await as(fLead, "select decision_window_open($1) ok", [id])).rows[0].ok,
    true,
  );
  await db.exec(
    `reset role;update requests set decided_at = now() - interval '40 days' where id = '${id}'`,
  );
  await as(fLead, "select unstamp_request($1,'team')", [id]);
  assert.equal(
    (await as(fLead, "select status from requests where id=$1", [id])).rows[0]
      .status,
    "pending",
  );
});
