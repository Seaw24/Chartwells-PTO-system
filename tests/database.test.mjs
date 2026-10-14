import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { bootDatabase } from "./helpers/db.mjs";
const db = await bootDatabase();
const admin = "00000000-0000-0000-0000-000000000001",
  employee = "00000000-0000-0000-0000-000000000002",
  other = "00000000-0000-0000-0000-000000000003",
  // Fills the team slot for the employee; the god admin fills the other one.
  lead = "00000000-0000-0000-0000-000000000004",
  type = "00000000-0000-0000-0000-000000000010",
  wellness = "00000000-0000-0000-0000-000000000011",
  team = "00000000-0000-0000-0000-000000000020";
await db.exec(
  `insert into auth.users values('${admin}'),('${employee}'),('${other}'),('${lead}');insert into profiles(id,name,email,org_role,password_setup_required) values('${admin}','Admin','admin@example.test','god_admin',false),('${employee}','Employee','employee@example.test','member',false),('${other}','Other','other@example.test','member',false),('${lead}','Lead','lead@example.test','member',false);insert into teams(id,name) values('${team}','Dining');insert into team_memberships(team_id,user_id) values('${team}','${employee}'),('${team}','${other}');insert into team_memberships(team_id,user_id,role) values('${team}','${lead}','admin');insert into pto_types(id,name,default_days) values('${type}','Vacation',10);insert into pto_types(id,name,default_days) values('${wellness}','Wellness Day',2);insert into pto_grants values('${employee}','${type}',extract(year from current_date)::integer,10),('${other}','${type}',extract(year from current_date)::integer,10),('${employee}','${wellness}',extract(year from current_date)::integer,2);`,
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
test("Wellness Day top-up requests are gone, and Wellness Day is an ordinary type", async () => {
  assert.deepEqual(
    (
      await db.query(
        "select to_regprocedure('public.submit_wellness_request(integer,text)') s, to_regprocedure('public.decide_wellness_request(uuid,boolean,text)') d, to_regprocedure('public.apply_wellness_grant()') a",
      )
    ).rows[0],
    { s: null, d: null, a: null },
  );
  assert.deepEqual(
    (
      await db.query(
        "select table_name, column_name from information_schema.columns where table_schema='public' and column_name in ('kind','grant_type_id','grant_days','grant_year','is_wellness')",
      )
    ).rows,
    [],
  );
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
// HR booking on someone's behalf. Its own cast: an HR user, an employee with a manager, a new
// hire who has never signed in and has no team, and an inactive account.
const hHr = "00000000-0000-0000-0000-0000000000b1",
  hEmp = "00000000-0000-0000-0000-0000000000b2",
  hLead = "00000000-0000-0000-0000-0000000000b3",
  hNew = "00000000-0000-0000-0000-0000000000b4",
  hGone = "00000000-0000-0000-0000-0000000000b5",
  hTeam = "00000000-0000-0000-0000-0000000000b6";
const hFuture = [],
  hPast = [];
const book = (who, items) =>
  as(hHr, "select book_requests_for($1,$2::jsonb) ids", [
    who,
    JSON.stringify(items),
  ]);
test("HR booking: setup", async () => {
  await db.exec(
    `reset role;insert into auth.users values('${hHr}'),('${hEmp}'),('${hLead}'),('${hNew}'),('${hGone}');
     insert into profiles(id,name,email,org_role,password_setup_required,is_active) values
       ('${hHr}','Dana Hr','dana@example.test','god_admin',false,true),
       ('${hEmp}','Hana Emp','hana@example.test','member',false,true),
       ('${hLead}','Lee Lead','lee@example.test','member',false,true),
       ('${hNew}','Nia New','nia@example.test','member',true,true),
       ('${hGone}','Gil Gone','gil@example.test','member',false,false);
     insert into teams(id,name) values('${hTeam}','HR Booking Crew');
     insert into team_memberships(team_id,user_id) values('${hTeam}','${hEmp}');
     insert into team_memberships(team_id,user_id,role) values('${hTeam}','${hLead}','admin');
     insert into pto_grants
       select p, '${type}', y, 5
       from unnest(array['${hEmp}','${hNew}','${hGone}']::uuid[]) p,
            generate_series(extract(year from current_date)::integer-1, extract(year from current_date)::integer+1) y
     on conflict do nothing;`,
  );
  hFuture.push(
    ...(
      await asOwner(
        "select d::date::text as day from generate_series(current_date+30,current_date+45,interval '1 day') d where extract(dow from d) between 1 and 5 order by d limit 3",
      )
    ).rows.map((r) => r.day),
  );
  hPast.push(
    ...(
      await asOwner(
        "select d::date::text as day from generate_series(current_date-12,current_date-2,interval '1 day') d where extract(dow from d) between 1 and 5 order by d limit 2",
      )
    ).rows.map((r) => r.day),
  );
});
test("only HR can book for someone else, never for themselves or an inactive account", async () => {
  const item = [{ type_id: type, start: hFuture[0], end: hFuture[0] }];
  await assert.rejects(
    as(hLead, "select book_requests_for($1,$2::jsonb)", [
      hEmp,
      JSON.stringify(item),
    ]),
    /Only HR can book/,
  );
  await assert.rejects(
    as(hEmp, "select book_requests_for($1,$2::jsonb)", [
      hLead,
      JSON.stringify(item),
    ]),
    /Only HR can book/,
  );
  await assert.rejects(book(hHr, item), /normal request for your own/);
  await assert.rejects(book(hGone, item), /not active/);
});
let hBooked;
test("an HR booking is approved at once with HR in both slots", async () => {
  hBooked = (
    await book(hEmp, [
      { type_id: type, start: hFuture[0], end: hFuture[0], note: "Called in" },
    ])
  ).rows[0].ids[0];
  const row = (
    await as(
      hEmp,
      "select status,note,god_stamp_by,team_stamp_by,team_stamp_override,decided_by from requests where id=$1",
      [hBooked],
    )
  ).rows[0];
  assert.deepEqual(row, {
    status: "approved",
    note: "Called in",
    god_stamp_by: hHr,
    team_stamp_by: hHr,
    team_stamp_override: true,
    decided_by: hHr,
  });
});
test("HR may book past dates; the employee still may not", async () => {
  await assert.rejects(
    as(hEmp, "select submit_requests($1::jsonb)", [
      JSON.stringify([{ type_id: type, start: hPast[0], end: hPast[0] }]),
    ]),
    /in the past/,
  );
  const id = (
    await book(hEmp, [{ type_id: type, start: hPast[0], end: hPast[0] }])
  ).rows[0].ids[0];
  assert.equal(
    (await as(hEmp, "select status from requests where id=$1", [id])).rows[0]
      .status,
    "approved",
  );
});
test("every other rule still applies, and errors name the person", async () => {
  await assert.rejects(
    book(hEmp, [{ type_id: type, start: hFuture[0], end: hFuture[0] }]),
    /Hana already has a request that overlaps/,
  );
  await assert.rejects(
    book(hEmp, [
      { type_id: type, start: hFuture[1], end: hFuture[1] },
      { type_id: type, start: hFuture[0], end: hFuture[0] },
    ]),
    /Time off 2: Hana already has/,
  );
  // Nothing from a refused booking is kept.
  assert.equal(
    Number(
      (
        await as(
          hHr,
          "select count(*) n from requests r join request_lines l on l.request_id=r.id where r.requester_id=$1 and l.start_date=$2",
          [hEmp, hFuture[1]],
        )
      ).rows[0].n,
    ),
    0,
  );
  await asOwner(
    `update pto_grants set amount=0 where user_id='${hEmp}' and pto_type_id='${type}'`,
  );
  await assert.rejects(
    book(hEmp, [{ type_id: type, start: hFuture[2], end: hFuture[2] }]),
    /balance is short for Hana/,
  );
  await asOwner(
    `update pto_grants set amount=5 where user_id='${hEmp}' and pto_type_id='${type}'`,
  );
});
test("HR can book a Holiday Day Off for someone who has never signed in", async () => {
  const holiday = (
    await asOwner(
      "insert into holidays(date,name) values(current_date-5,'Staff Day') returning id",
    )
  ).rows[0].id;
  const day = (
    await asOwner(
      "select d::date::text as day from generate_series(current_date+1,current_date+24,interval '1 day') d where extract(dow from d) between 1 and 5 order by d desc limit 1",
    )
  ).rows[0].day;
  await assert.rejects(
    as(hNew, "select submit_holiday_day_off($1,$2,$2,null)", [holiday, day]),
    /Finish account setup/,
  );
  const id = (await book(hNew, [{ holiday_id: holiday, start: day, end: day }]))
    .rows[0].ids[0];
  // No manager, so the Manager slot is an X and HR's stamp alone grants it.
  assert.deepEqual(
    (
      await as(
        hHr,
        "select status,team_stamp_by,team_stamp_na,god_stamp_by from requests where id=$1",
        [id],
      )
    ).rows[0],
    { status: "approved", team_stamp_by: null, team_stamp_na: true, god_stamp_by: hHr },
  );
});
test("the booked-by-HR marker is visible to HR only", async () => {
  const facts = (who) =>
    as(who, "select booked_by_name from request_stamp_facts($1)", [hBooked]);
  assert.equal((await facts(hHr)).rows[0].booked_by_name, "Dana Hr");
  assert.equal((await facts(hEmp)).rows[0].booked_by_name, null);
  assert.equal((await facts(hLead)).rows[0].booked_by_name, null);
  await assert.rejects(
    as(hEmp, "select * from hr_bookings"),
    /permission denied/,
  );
  await assert.rejects(
    as(hHr, "select * from hr_bookings"),
    /permission denied/,
  );
});
test("the internal file-as-someone functions are not callable from the browser", async () => {
  await assert.rejects(
    as(hHr, "select submit_request_as($1,null,$2::jsonb,$3)", [
      hEmp,
      JSON.stringify([{ type_id: type, start: hFuture[2], end: hFuture[2] }]),
      hHr,
    ]),
    /permission denied/,
  );
  await assert.rejects(
    as(hEmp, "select submit_requests_as($1,$2::jsonb,$3)", [
      hEmp,
      JSON.stringify([{ type_id: type, start: hPast[1], end: hPast[1] }]),
      hHr,
    ]),
    /permission denied/,
  );
  await assert.rejects(
    as(hEmp, "select submit_holiday_day_off_as($1,$2,$3,$3,null,$4)", [
      hEmp,
      holidayId,
      hFuture[2],
      hHr,
    ]),
    /permission denied/,
  );
});

// Leave years per type. Fixed far-future dates keep these independent of today; HR bookings are used
// to file them because they may be in the past by the time this runs.
const lyType = "00000000-0000-0000-0000-0000000000c1";
const one = async (sql, args = []) => (await asOwner(sql, args)).rows[0];
test("Vacation keeps its current allowance until its first Oct 1 reset in 2027", async () => {
  // The migration's Vacation update ran before this file's data existed, so run that statement
  // again. (The whole file no longer re-runs: 202610130001 dropped the columns its old
  // grant_amount() body reads.)
  await db.exec("reset role");
  const vacationUpdate = fs
    .readFileSync("supabase/migrations/202609280002_leave_year_reset.sql", "utf8")
    .match(/update public\.pto_types\nset reset_month = 10[^;]*;/)[0];
  await db.exec(vacationUpdate);
  const vac = await one(
    "select reset_month, reset_day, first_reset::text from pto_types where id=$1",
    [type],
  );
  assert.deepEqual(vac, { reset_month: 10, reset_day: 1, first_reset: "2027-10-01" });
  const y = await one(
    `select leave_year_for($1,'2025-06-01') a, leave_year_for($1,'2026-03-01') b,
            leave_year_for($1,'2027-09-30') c, leave_year_for($1,'2027-10-01') d,
            leave_year_start($1,2026)::text s26, leave_year_end($1,2026)::text e26,
            leave_year_start($1,2027)::text s27, leave_year_end($1,2027)::text e27,
            leave_year_end($1,2025)::text e25, leave_year_label($1,2027) l27`,
    [type],
  );
  assert.deepEqual(y, {
    a: 2025, b: 2026, c: 2026, d: 2027,
    s26: "2026-01-01", e26: "2027-09-30",
    s27: "2027-10-01", e27: "2028-09-30",
    e25: "2025-12-31", l27: "Oct 1, 2027 – Sep 30, 2028",
  });
  // A type still on Jan 1 reads as plain calendar years.
  assert.equal(
    (await one("select leave_year_label($1,2027) l", [wellness])).l,
    "2027",
  );
});
test("a request crossing a reset day is charged to each leave year it touches", async () => {
  await asOwner(
    `insert into pto_types(id,name,default_days,reset_month,reset_day,first_reset)
     values('${lyType}','Reset Test',3,3,1,'2030-03-01')`,
  );
  // Feb 27-28, 2030 fall in the 2029 leave year (Jan 1, 2029 - Feb 28, 2030); Mar 1 and Mar 4 in 2030.
  await book(hEmp, [{ type_id: lyType, start: "2030-02-27", end: "2030-03-04" }]);
  assert.deepEqual(
    await one(
      "select pto_used($1,$2,2029) y29, pto_used($1,$2,2030) y30, pto_balance($1,$2,2030) left30",
      [hEmp, lyType],
    ),
    { y29: 2, y30: 2, left30: 1 },
  );
  await assert.rejects(
    book(hEmp, [{ type_id: lyType, start: "2030-03-05", end: "2030-03-06" }]),
    /Reset Test balance is short for Hana for Mar 1, 2030 – Feb 28, 2031\. This needs 2 day\(s\) but only 1 remain/,
  );
});
test("a new leave year starts from the person's last amount", async () => {
  await asOwner(
    `insert into pto_grants(user_id,pto_type_id,leave_year,amount) values('${hEmp}','${lyType}',2029,7)`,
  );
  assert.equal(
    (await one("select grant_amount($1,$2,2031) n", [hEmp, lyType])).n,
    7,
  );
  // Someone who never had a row gets the type's default.
  assert.equal(
    (await one("select grant_amount($1,$2,2031) n", [hLead, lyType])).n,
    3,
  );
});
test("allowances are readable by the person, their managers and HR only", async () => {
  const rows = async (who, whose) =>
    (
      await as(who, "select * from leave_allowances($1)", [whose])
    ).rows;
  const own = await rows(hEmp, hEmp);
  assert.ok(own.length > 0);
  assert.ok(own.every((r) => r.user_id === hEmp));
  // Last, this and next leave year for every type with a yearly allowance.
  assert.equal(
    new Set(own.filter((r) => r.pto_type_id === type).map((r) => r.leave_year)).size,
    3,
  );
  assert.equal((await rows(hEmp, hLead)).length, 0);
  assert.ok((await rows(hLead, hEmp)).length > 0);
  assert.ok((await rows(hHr, hEmp)).length > 0);
  await assert.rejects(
    as(hEmp, "select grant_amount($1,$2,2030)", [hEmp, type]),
    /permission denied/,
  );
});
test("only HR changes when a type resets, and only from a future date on that day", async () => {
  const set = (who, m, d, from) =>
    as(who, "select set_leave_reset($1,$2,$3,$4::date)", [lyType, m, d, from]);
  await assert.rejects(set(hLead, 7, 1, "2031-07-01"), /Only HR/);
  await assert.rejects(set(hHr, 2, 29, "2032-02-29"), /February 29/);
  await assert.rejects(set(hHr, 7, 1, "2031-08-01"), /fall on the reset day/);
  await assert.rejects(
    as(hHr, "select set_leave_reset($1,7,1,current_date - 1)", [lyType]),
    /future date/,
  );
  await set(hHr, 7, 1, "2031-07-01");
  // Years before the first reset under the new rule are calendar years again.
  assert.deepEqual(
    await one(
      "select leave_year_end($1,2030)::text e30, leave_year_start($1,2031)::text s31",
      [lyType],
    ),
    { e30: "2031-06-30", s31: "2031-07-01" },
  );
});

// Everyone sees who is off on every team. Its own cast on two teams, with far-future dates so no
// earlier request overlaps.
const wA = "00000000-0000-0000-0000-0000000000d1",
  wB = "00000000-0000-0000-0000-0000000000d2",
  wGone = "00000000-0000-0000-0000-0000000000d3",
  wTeamA = "00000000-0000-0000-0000-0000000000d4",
  wTeamB = "00000000-0000-0000-0000-0000000000d5";
const wRequest = {
  approved: "00000000-0000-0000-0000-0000000000e1",
  pending: "00000000-0000-0000-0000-0000000000e2",
  denied: "00000000-0000-0000-0000-0000000000e3",
  cancelled: "00000000-0000-0000-0000-0000000000e4",
  gone: "00000000-0000-0000-0000-0000000000e5",
};
test("who's off: setup", async () => {
  await db.exec(
    `reset role;insert into auth.users values('${wA}'),('${wB}'),('${wGone}');
     insert into profiles(id,name,email,org_role,password_setup_required,is_active) values
       ('${wA}','Ada Alpha','ada@example.test','member',false,true),
       ('${wB}','Bo Beta','bo@example.test','member',false,true),
       ('${wGone}','Gus Gone','gus@example.test','member',false,false);
     insert into teams(id,name) values('${wTeamA}','Alpha Kitchen'),('${wTeamB}','Beta Kitchen');
     insert into team_memberships(team_id,user_id) values('${wTeamA}','${wA}'),('${wTeamB}','${wB}'),('${wTeamB}','${wGone}');
     insert into requests(id,requester_id,status,note) values
       ('${wRequest.approved}','${wB}','approved','private note'),
       ('${wRequest.pending}','${wB}','pending',null),
       ('${wRequest.denied}','${wB}','denied',null),
       ('${wRequest.cancelled}','${wB}','cancelled',null),
       ('${wRequest.gone}','${wGone}','approved',null);
     insert into request_lines(request_id,pto_type_id,start_date,end_date) values
       ('${wRequest.approved}','${type}','2040-03-05','2040-03-06'),
       ('${wRequest.pending}','${type}','2040-03-12','2040-03-12'),
       ('${wRequest.denied}','${type}','2040-03-19','2040-03-19'),
       ('${wRequest.cancelled}','${type}','2040-03-26','2040-03-26'),
       ('${wRequest.gone}','${type}','2040-04-02','2040-04-02');`,
  );
});
test("an employee sees another team's approved and pending time off, and nothing private", async () => {
  // Their own view of requests is still limited to themselves.
  assert.equal(
    (await as(wA, "select * from requests where requester_id=$1", [wB])).rows
      .length,
    0,
  );
  const result = await as(
    wA,
    "select * from who_is_off() where requester_id=any($1::uuid[]) order by start_date",
    [[wB, wGone]],
  );
  assert.deepEqual(
    result.fields.map((f) => f.name),
    [
      "request_id",
      "requester_id",
      "status",
      "pto_type_id",
      "start_date",
      "end_date",
      "holiday_id",
      "holiday_name",
    ],
  );
  assert.deepEqual(
    result.rows.map((r) => [r.request_id, r.status]),
    [
      [wRequest.approved, "approved"],
      [wRequest.pending, "pending"],
    ],
  );
});
test("the directory lists active people with their teams only", async () => {
  const result = await as(
    wA,
    "select * from team_directory() where id=any($1::uuid[]) order by name",
    [[wA, wB, wGone]],
  );
  assert.deepEqual(
    result.fields.map((f) => f.name),
    ["id", "name", "memberships"],
  );
  assert.deepEqual(
    result.rows.map((r) => [r.name, r.memberships]),
    [
      ["Ada Alpha", [{ team_id: wTeamA, role: "employee" }]],
      ["Bo Beta", [{ team_id: wTeamB, role: "employee" }]],
    ],
  );
});
test("a deactivated account cannot read who's off or the directory", async () => {
  await assert.rejects(as(wGone, "select * from who_is_off()"), /Not authenticated/);
  await assert.rejects(
    as(wGone, "select * from team_directory()"),
    /Not authenticated/,
  );
  await db.exec("reset role");
  const grants = (
    await db.query(
      "select p.proname, has_function_privilege('public', p.oid, 'execute') pub from pg_proc p where p.proname in ('who_is_off','team_directory') order by 1",
    )
  ).rows;
  assert.deepEqual(grants, [
    { proname: "team_directory", pub: false },
    { proname: "who_is_off", pub: false },
  ]);
});
