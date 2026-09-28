-- HR books time off on someone's behalf. The booking is approved on the spot with HR's stamp,
-- may use past dates, and is marked as an HR booking that only HR can see.
--
-- Role names: "HR" in the app is org_role 'god_admin' (is_god_admin()), and "Manager" is team
-- membership role 'admin'. Only the labels changed; the stored values and SQL names did not.
--
-- How it works: the bodies of submit_request, submit_holiday_day_off and submit_requests move into
-- internal *_as functions that take the person to file for, plus who booked it (null for a normal
-- request). The public functions become wrappers with the same signatures and behaviour, so every
-- rule still lives in one place. The *_as functions are revoked from every browser role; the only
-- new browser entry point is book_requests_for(), which checks the caller is HR.
--
-- The *_as bodies are the live bodies as read on 2026-09-28, changed only where an HR booking
-- differs: no past-date check, no account-setup gate for a Holiday Day Off, and errors that name
-- the person instead of saying "you".
--
-- Runs on the deployed schema and on the recovered schema the tests build. The recovered schema
-- lacks a few helpers the live submit_request uses; they are created only when missing, so the
-- deployed database keeps its own. Re-runnable.
begin;

-- ---------------------------------------------------------------------------
-- Helpers the live submit_request relies on (created only where missing, i.e. in tests)
-- ---------------------------------------------------------------------------

do $shim$
begin
  if to_regprocedure('public.leave_year_of(date)') is null then
    execute $f$create function public.leave_year_of(p_date date) returns integer
      language sql immutable set search_path to '' as $$ select extract(year from p_date)::integer $$$f$;
  end if;
  if to_regprocedure('public.year_start(integer)') is null then
    execute $f$create function public.year_start(p_year integer) returns date
      language sql immutable set search_path to '' as $$ select make_date(p_year, 1, 1) $$$f$;
  end if;
  if to_regprocedure('public.year_end(integer)') is null then
    execute $f$create function public.year_end(p_year integer) returns date
      language sql immutable set search_path to '' as $$ select (make_date(p_year, 1, 1) + interval '1 year - 1 day')::date $$$f$;
  end if;
  if to_regprocedure('public.pto_used(uuid, uuid, integer)') is null then
    execute $f$create function public.pto_used(p_user_id uuid, p_type_id uuid, p_leave_year integer) returns integer
      language sql stable security definer set search_path to '' as $$
        select coalesce(sum(
          public.charged_days(
            p_user_id,
            greatest(l.start_date, public.year_start(p_leave_year)),
            least(l.end_date,      public.year_end(p_leave_year))
          )
        ), 0)::integer
        from public.request_lines l
        join public.requests r on r.id = l.request_id
        where r.requester_id = p_user_id
          and r.status = 'approved'
          and l.pto_type_id = p_type_id
          and l.start_date <= public.year_end(p_leave_year)
          and l.end_date   >= public.year_start(p_leave_year)
      $$$f$;
    execute 'revoke execute on function public.pto_used(uuid, uuid, integer) from public';
  end if;
  if to_regprocedure('public.pto_balance(uuid, uuid, integer)') is null then
    execute $f$create function public.pto_balance(p_user_id uuid, p_type_id uuid, p_leave_year integer) returns integer
      language sql stable security definer set search_path to '' as $$
        select (g.amount - public.pto_used(p_user_id, p_type_id, p_leave_year))::integer
        from public.pto_grants g
        where g.user_id = p_user_id
          and g.pto_type_id = p_type_id
          and g.leave_year = p_leave_year
      $$$f$;
    execute 'revoke execute on function public.pto_balance(uuid, uuid, integer) from public';
  end if;
end$shim$;

-- ---------------------------------------------------------------------------
-- Which requests HR booked
-- ---------------------------------------------------------------------------

-- Kept off the requests table on purpose: requesters and managers can read every column of the
-- requests they see, and the "booked by HR" marker is for HR only. Nobody in the browser reads or
-- writes this table directly; book_requests_for() writes it and request_stamp_facts() reads it.
create table if not exists public.hr_bookings (
  request_id uuid primary key references public.requests(id) on delete cascade,
  booked_by uuid not null references public.profiles(id),
  booked_at timestamptz not null default now()
);
alter table public.hr_bookings enable row level security;
revoke all on table public.hr_bookings from public;
revoke all on table public.hr_bookings from authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on table public.hr_bookings from anon';
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- Filing time off for a given person
-- ---------------------------------------------------------------------------

-- The live submit_request body, filing for p_requester. p_booked_by is the HR user when this is an
-- HR booking, and null for a person's own request.
create or replace function public.submit_request_as(p_requester uuid, p_note text, p_lines jsonb, p_booked_by uuid)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_uid        uuid := p_requester;
  v_hr         boolean := p_booked_by is not null;
  v_name       text;
  v_request_id uuid;
  v_line       record;
  v_other      record;
  v_type       record;
  v_days       integer;
  v_balance    integer;
  v_needed     integer;
  v_year       integer;
begin
  select split_part(p.name, ' ', 1) into v_name
  from public.profiles p where p.id = v_uid and p.is_active;
  if not found then
    raise exception 'That account is not active.';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Add at least one PTO line.';
  end if;

  -- Materialise the submitted lines once, typed, so every check below reads the same rows.
  create temp table submitted_lines on commit drop as
  select (value->>'type_id')::uuid as pto_type_id,
         (value->>'start')::date   as start_date,
         (value->>'end')::date     as end_date,
         ordinality               as line_no
  from jsonb_array_elements(p_lines) with ordinality;

  for v_line in select * from submitted_lines order by line_no loop
    select * into v_type from public.pto_types t
      where t.id = v_line.pto_type_id and t.is_active;
    if not found then
      raise exception 'Line %: that PTO type is not available.', v_line.line_no;
    end if;

    if v_line.end_date < v_line.start_date then
      raise exception 'Line %: the end date is before the start date.', v_line.line_no;
    end if;

    -- Past dates. Backdating by one day is a property of the TYPE (allow_backdate, 003), not a
    -- hardcoded check for 'sick', so a new backdatable type is a row and never a code change.
    -- HR bookings may use any past date.
    if not v_hr then
      if v_type.allow_backdate then
        if v_line.start_date < current_date - 1 then
          raise exception 'Line %: % can be filed for today or yesterday at the earliest.',
            v_line.line_no, v_type.name;
        end if;
      elsif v_line.start_date < current_date then
        raise exception 'Line %: that start date is in the past.', v_line.line_no;
      end if;
    end if;

    -- Restricted windows. Every single day must sit inside one, matching the client's
    -- .every() rather than "the range touches a window somewhere".
    if v_type.requires_window then
      if exists (
        select 1 from generate_series(v_line.start_date, v_line.end_date, interval '1 day') as d(day)
        where not exists (
          select 1 from public.date_rules dr
          where dr.pto_type_id = v_line.pto_type_id
            and d.day::date between dr.start_date and dr.end_date
        )
      ) then
        raise exception 'Line %: % is only available during its booking windows.',
          v_line.line_no, v_type.name;
      end if;
    end if;

    -- Blackout: department-wide ones, plus any explicitly linked to this type.
    select b.reason into v_other
    from public.blackout_dates b
    where b.start_date <= v_line.end_date
      and b.end_date   >= v_line.start_date
      and (
        b.applies_to_all
        or exists (select 1 from public.blackout_types bt
                   where bt.blackout_id = b.id and bt.pto_type_id = v_line.pto_type_id)
      )
    limit 1;
    if found then
      raise exception 'Line %: those dates overlap a blackout period (%).',
        v_line.line_no, v_other.reason;
    end if;

    -- Overlap with another line in this same submission, any type.
    if exists (
      select 1 from submitted_lines s
      where s.line_no <> v_line.line_no
        and s.start_date <= v_line.end_date
        and s.end_date   >= v_line.start_date
    ) then
      raise exception 'Line % overlaps another line in this request. Keep each date range separate.',
        v_line.line_no;
    end if;

    -- Overlap with the requester's own live requests.
    if exists (
      select 1
      from public.request_lines l
      join public.requests r on r.id = l.request_id
      where r.requester_id = v_uid
        and r.status in ('pending', 'approved')
        and l.start_date <= v_line.end_date
        and l.end_date   >= v_line.start_date
    ) then
      if v_hr then
        raise exception 'Line %: % already has a request that overlaps these dates.',
          v_line.line_no, v_name;
      end if;
      raise exception 'Line %: you already have a request that overlaps these dates.',
        v_line.line_no;
    end if;
  end loop;

  -- Balance, per type, across the whole submission. Checked after the per-line loop because it is
  -- a property of the request, not of a line: three vacation lines each within balance can still
  -- overdraw it together. This is the check a trigger could not have made.
  -- Grouped by type AND leave year, not type alone: a grant is keyed (person, type, year), so a
  -- request straddling 31 December must be checked against each year's own allowance.
  for v_line in
    select s.pto_type_id,
           public.leave_year_of(s.start_date) as yr,
           coalesce(sum(public.charged_days(v_uid, s.start_date, s.end_date)), 0)::integer as needed
    from submitted_lines s
    group by s.pto_type_id, public.leave_year_of(s.start_date)
  loop
    v_year    := v_line.yr;
    v_needed  := v_line.needed;
    v_balance := public.pto_balance(v_uid, v_line.pto_type_id, v_year);
    select t.name into v_type from public.pto_types t where t.id = v_line.pto_type_id;

    if v_balance is null then
      if v_hr then
        raise exception '% has no allowance set for % for %. Set it on their profile first.',
          v_type.name, v_name, v_year;
      end if;
      raise exception '% has no allowance set for you for %. Ask your manager.',
        v_type.name, v_year;
    end if;
    if v_needed > v_balance then
      if v_hr then
        raise exception '% balance is short for %. This needs % day(s) but only % remain.',
          v_type.name, v_name, v_needed, v_balance;
      end if;
      raise exception '% balance is short. This needs % day(s) but only % remain.',
        v_type.name, v_needed, v_balance;
    end if;
  end loop;

  insert into public.requests (requester_id, status, note)
  values (v_uid, 'pending', nullif(trim(coalesce(p_note, '')), ''))
  returning id into v_request_id;

  insert into public.request_lines (request_id, pto_type_id, start_date, end_date)
  select v_request_id, s.pto_type_id, s.start_date, s.end_date from submitted_lines s;

  drop table submitted_lines;
  return v_request_id;
end $$;

-- A person's own request. Same signature and behaviour as before.
create or replace function public.submit_request(p_note text, p_lines jsonb)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'You must be signed in to request time off.';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_uid and p.is_active) then
    raise exception 'Your account is not active. Contact your manager.';
  end if;
  return public.submit_request_as(v_uid, p_note, p_lines, null);
end $$;

-- The live submit_holiday_day_off body, filing for p_requester. An HR booking skips the
-- account-setup gate (HR may book for someone who has never signed in) and the past-date check.
-- The holiday's 30-day window and every other rule still apply.
create or replace function public.submit_holiday_day_off_as(
  p_requester uuid, p_holiday_id uuid, p_start date, p_end date, p_note text, p_booked_by uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_hr boolean := p_booked_by is not null;
  v_name text;
  me profiles;
  holiday holidays;
  day_off_type pto_types;
  blackout_reason text;
  new_id uuid;
begin
  -- Locking the profile row keeps two submissions for the same holiday from both passing the
  -- one-day check.
  select * into me from profiles where id = p_requester for update;
  if not found or not me.is_active then
    if v_hr then
      raise exception 'That account is not active.';
    end if;
    raise exception 'Finish account setup before requesting leave.';
  end if;
  if not v_hr and me.password_setup_required then
    raise exception 'Finish account setup before requesting leave.';
  end if;
  v_name := split_part(me.name, ' ', 1);
  select * into holiday from holidays where id = p_holiday_id;
  if not found then
    raise exception 'That holiday is no longer on the list. Refresh and pick again.';
  end if;
  select * into day_off_type from pto_types where is_holiday_day_off and is_active;
  if not found then
    raise exception 'Holiday Day Off is not set up yet. Ask an administrator.';
  end if;
  if p_start is null or p_end is null or p_end < p_start then
    raise exception 'Choose a start and end date.';
  end if;
  if not v_hr and p_start < current_date then
    raise exception 'That start date is in the past.';
  end if;
  if p_start < holiday.date or p_end > holiday.date + 30 then
    raise exception '% time off must fall between % and %.',
      holiday.name, to_char(holiday.date, 'Mon FMDD'), to_char(holiday.date + 30, 'Mon FMDD');
  end if;
  if (
    select count(*) from generate_series(p_start, p_end, interval '1 day') d
    where not extract(dow from d)::integer = any (coalesce(me.normal_days_off, array[0, 6]))
  ) <> 1 then
    raise exception 'A Holiday Day Off covers exactly one working day.';
  end if;
  select b.reason into blackout_reason
  from blackout_dates b
  where b.start_date <= p_end
    and b.end_date >= p_start
    and (b.applies_to_all or exists (
      select 1 from blackout_types bt where bt.blackout_id = b.id and bt.pto_type_id = day_off_type.id
    ))
  limit 1;
  if found then
    raise exception 'Those dates overlap a blackout period (%).', blackout_reason;
  end if;
  if exists (
    select 1 from request_lines l join requests r on r.id = l.request_id
    where r.requester_id = me.id and r.status in ('pending', 'approved')
      and l.start_date <= p_end and l.end_date >= p_start
  ) then
    if v_hr then
      raise exception '% already has a request that overlaps these dates.', v_name;
    end if;
    raise exception 'You already have a request that overlaps these dates.';
  end if;
  if exists (
    select 1 from request_lines l join requests r on r.id = l.request_id
    where r.requester_id = me.id and r.status in ('pending', 'approved') and l.holiday_id = holiday.id
  ) then
    if v_hr then
      raise exception '% already used their % day off.', v_name, holiday.name;
    end if;
    raise exception 'You already used your % day off.', holiday.name;
  end if;
  insert into requests (requester_id, status, note)
  values (me.id, 'pending', nullif(trim(p_note), ''))
  returning id into new_id;
  insert into request_lines (request_id, pto_type_id, start_date, end_date, holiday_id, holiday_name)
  values (new_id, day_off_type.id, p_start, p_end, holiday.id, holiday.name);
  return new_id;
end$$;

-- A person's own Holiday Day Off. Same signature and behaviour as before.
create or replace function public.submit_holiday_day_off(p_holiday_id uuid, p_start date, p_end date, p_note text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  return public.submit_holiday_day_off_as(auth.uid(), p_holiday_id, p_start, p_end, p_note, null);
end$$;

-- Several time offs from one form, saved as separate requests, all or nothing, for p_requester.
create or replace function public.submit_requests_as(p_requester uuid, p_requests jsonb, p_booked_by uuid)
returns uuid[]
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  item jsonb;
  item_no integer := 0;
  many boolean;
  ids uuid[] := '{}';
begin
  if p_requests is null or jsonb_typeof(p_requests) <> 'array' or jsonb_array_length(p_requests) = 0 then
    raise exception 'Add at least one time off.';
  end if;
  many := jsonb_array_length(p_requests) > 1;
  for item in select value from jsonb_array_elements(p_requests) loop
    item_no := item_no + 1;
    begin
      if nullif(item->>'holiday_id', '') is not null then
        ids := ids || public.submit_holiday_day_off_as(
          p_requester, (item->>'holiday_id')::uuid, (item->>'start')::date, (item->>'end')::date,
          item->>'note', p_booked_by);
      else
        ids := ids || public.submit_request_as(
          p_requester,
          item->>'note',
          jsonb_build_array(jsonb_build_object('type_id', item->>'type_id', 'start', item->>'start', 'end', item->>'end')),
          p_booked_by);
      end if;
    exception when others then
      -- Each request has one line, so submit_request's "Line 1:" prefix is replaced by which time off failed.
      raise exception '%',
        case when many then format('Time off %s: ', item_no) else '' end
          || regexp_replace(sqlerrm, '^Line [0-9]+:? *', '');
    end;
  end loop;
  return ids;
end$$;

-- A person's own time offs. Same signature and behaviour as before; the signed-in and active checks
-- submit_request made for each item are made once here.
create or replace function public.submit_requests(p_requests jsonb)
returns uuid[]
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to request time off.';
  end if;
  if not exists (select 1 from profiles p where p.id = auth.uid() and p.is_active) then
    raise exception 'Your account is not active. Contact your manager.';
  end if;
  return public.submit_requests_as(auth.uid(), p_requests, null);
end$$;

-- ---------------------------------------------------------------------------
-- HR booking
-- ---------------------------------------------------------------------------

-- HR files time off for someone else. Every rule applies except past dates. Each request is stamped
-- by HR in the HR slot, and in the Manager slot too when the person has a manager (as an override
-- unless HR is one of their managers, the same rule stamp_request uses), so it is approved before
-- this returns.
create or replace function public.book_requests_for(p_requester uuid, p_requests jsonb)
returns uuid[]
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  hr uuid := auth.uid();
  ids uuid[];
  booked_id uuid;
  needs_manager boolean;
  manager_override boolean;
begin
  if not public.is_god_admin() then
    raise exception 'Only HR can book time off for someone else.';
  end if;
  if p_requester is null then
    raise exception 'Choose who this time off is for.';
  end if;
  if p_requester = hr then
    raise exception 'Use a normal request for your own time off.';
  end if;
  if not exists (select 1 from profiles where id = p_requester and is_active) then
    raise exception 'That account is not active, so time off cannot be booked for it.';
  end if;

  ids := public.submit_requests_as(p_requester, p_requests, hr);

  needs_manager := public.has_team_approver(p_requester);
  manager_override := not exists (
    select 1
    from team_memberships mine
    join team_memberships theirs on theirs.team_id = mine.team_id
    where mine.user_id = hr and mine.role = 'admin' and theirs.user_id = p_requester
  );

  insert into hr_bookings (request_id, booked_by)
  select unnest(ids), hr;

  update requests
  set god_stamp_by = hr,
      god_stamp_at = now(),
      team_stamp_by = case when needs_manager then hr end,
      team_stamp_at = case when needs_manager then now() end,
      team_stamp_override = needs_manager and manager_override
  where id = any (ids);

  -- Settle now rather than waiting for the deferred trigger at commit, so a failure surfaces here.
  foreach booked_id in array ids loop
    perform public.settle_request(booked_id);
  end loop;
  if exists (select 1 from requests where id = any (ids) and status <> 'approved') then
    raise exception 'The booking could not be approved. Nothing was saved.';
  end if;
  return ids;
end$$;

-- An HR booking has already passed every check it is subject to, and may be in the past, which the
-- recovered schema's assert_request_valid() would refuse. (The deployed database has no
-- assert_request_valid(), so there this function only ever returns early.)
create or replace function public.revalidate_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- A wellness grant has no dated lines and nothing to revalidate.
  if not exists (select 1 from request_lines where request_id = p_request_id) then
    return;
  end if;
  if exists (select 1 from hr_bookings where request_id = p_request_id) then
    return;
  end if;
  if to_regprocedure('public.assert_request_valid(uuid)') is not null then
    execute 'select public.assert_request_valid($1)' using p_request_id;
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- Stamp facts: add who booked it, for HR only
-- ---------------------------------------------------------------------------

-- Adding an output column changes the return type, so the function is dropped and recreated.
drop function if exists public.request_stamp_facts(uuid);
create function public.request_stamp_facts(p_request_id uuid default null)
returns table (
  request_id uuid,
  team_na_now boolean,
  god_na_now boolean,
  team_stamp_by_name text,
  team_stamp_by_role text,
  god_stamp_by_name text,
  god_stamp_by_role text,
  team_stamp_override_of_name text,
  decided_by_name text,
  booked_by_name text
)
language sql stable security definer set search_path = public as $$
  select
    r.id,
    not public.has_team_approver(r.requester_id),
    not public.has_god_approver(r.requester_id),
    tp.name,
    public.stamp_display_role(tp.id),
    gp.name,
    public.stamp_display_role(gp.id),
    op.name,
    dp.name,
    -- Only HR learns that a request was booked by HR.
    case when public.is_god_admin() then bp.name end
  from requests r
  left join profiles tp on tp.id = r.team_stamp_by
  left join profiles gp on gp.id = r.god_stamp_by
  left join profiles op on op.id = r.team_stamp_override_of
  left join profiles dp on dp.id = r.decided_by
  left join hr_bookings hb on hb.request_id = r.id
  left join profiles bp on bp.id = hb.booked_by
  where (p_request_id is null or r.id = p_request_id)
    and (
      r.requester_id = auth.uid()
      or public.is_god_admin()
      or exists (
        select 1
        from team_memberships mine
        join team_memberships theirs on theirs.team_id = mine.team_id
        join profiles me on me.id = mine.user_id
        where mine.user_id = auth.uid()
          and mine.role = 'admin'
          and theirs.user_id = r.requester_id
          and me.is_active
      )
    )
$$;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------

-- The *_as functions are internal: reachable only through the wrappers and book_requests_for().
-- The deployed database grants every new function to authenticated by default, and that grant is
-- separate from PUBLIC, so each browser role is revoked explicitly.
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.submit_request_as(uuid, text, jsonb, uuid)',
    'public.submit_holiday_day_off_as(uuid, uuid, date, date, text, uuid)',
    'public.submit_requests_as(uuid, jsonb, uuid)'
  ] loop
    execute format('revoke execute on function %s from public', fn);
    execute format('revoke execute on function %s from authenticated', fn);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke execute on function %s from anon', fn);
    end if;
  end loop;
end$$;

revoke execute on function public.book_requests_for(uuid, jsonb) from public;
revoke execute on function public.request_stamp_facts(uuid) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public.book_requests_for(uuid, jsonb) from anon';
    execute 'revoke execute on function public.request_stamp_facts(uuid) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.request_stamp_facts(uuid) to service_role';
  end if;
end$$;
grant execute on function public.book_requests_for(uuid, jsonb) to authenticated;
grant execute on function public.request_stamp_facts(uuid) to authenticated;

commit;
