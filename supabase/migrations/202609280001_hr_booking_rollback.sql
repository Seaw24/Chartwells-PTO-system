-- Rollback for 202609280001_hr_booking.sql.
--
-- Restores submit_request, submit_holiday_day_off, submit_requests, revalidate_request and
-- request_stamp_facts to their live bodies as read on 2026-09-28, then drops everything the
-- migration added. Requests HR already booked stay approved with HR's stamps; only the
-- "booked by HR" marker (the hr_bookings table) is lost.
--
-- The helper functions the migration creates only when missing (leave_year_of, year_start,
-- year_end, pto_used, pto_balance) already existed on the deployed database, so they are left alone.
begin;

DROP FUNCTION IF EXISTS public.request_stamp_facts(uuid);
CREATE FUNCTION public.request_stamp_facts(p_request_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(request_id uuid, team_na_now boolean, god_na_now boolean, team_stamp_by_name text, team_stamp_by_role text, god_stamp_by_name text, god_stamp_by_role text, team_stamp_override_of_name text, decided_by_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    r.id,
    not public.has_team_approver(r.requester_id),
    not public.has_god_approver(r.requester_id),
    tp.name,
    public.stamp_display_role(tp.id),
    gp.name,
    public.stamp_display_role(gp.id),
    op.name,
    dp.name
  from requests r
  left join profiles tp on tp.id = r.team_stamp_by
  left join profiles gp on gp.id = r.god_stamp_by
  left join profiles op on op.id = r.team_stamp_override_of
  left join profiles dp on dp.id = r.decided_by
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
$function$
;

CREATE OR REPLACE FUNCTION public.revalidate_request(p_request_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- A wellness grant has no dated lines and nothing to revalidate.
  if not exists (select 1 from request_lines where request_id = p_request_id) then
    return;
  end if;
  if to_regprocedure('public.assert_request_valid(uuid)') is not null then
    execute 'select public.assert_request_valid($1)' using p_request_id;
  end if;
end$function$
;

CREATE OR REPLACE FUNCTION public.submit_holiday_day_off(p_holiday_id uuid, p_start date, p_end date, p_note text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me profiles;
  holiday holidays;
  day_off_type pto_types;
  blackout_reason text;
  new_id uuid;
begin
  -- Same gate as the live submit_request. Locking the profile row keeps two submissions for the
  -- same holiday from both passing the one-day check.
  select * into me from profiles where id = auth.uid() for update;
  if not found or not me.is_active or me.password_setup_required then
    raise exception 'Finish account setup before requesting leave.';
  end if;
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
  if p_start < current_date then
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
    raise exception 'You already have a request that overlaps these dates.';
  end if;
  if exists (
    select 1 from request_lines l join requests r on r.id = l.request_id
    where r.requester_id = me.id and r.status in ('pending', 'approved') and l.holiday_id = holiday.id
  ) then
    raise exception 'You already used your % day off.', holiday.name;
  end if;
  insert into requests (requester_id, status, note)
  values (me.id, 'pending', nullif(trim(p_note), ''))
  returning id into new_id;
  insert into request_lines (request_id, pto_type_id, start_date, end_date, holiday_id, holiday_name)
  values (new_id, day_off_type.id, p_start, p_end, holiday.id, holiday.name);
  return new_id;
end$function$
;

CREATE OR REPLACE FUNCTION public.submit_request(p_note text, p_lines jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid        uuid := auth.uid();
  v_request_id uuid;
  v_line       record;
  v_other      record;
  v_type       record;
  v_days       integer;
  v_balance    integer;
  v_needed     integer;
  v_year       integer;
begin
  if v_uid is null then
    raise exception 'You must be signed in to request time off.';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_uid and p.is_active) then
    raise exception 'Your account is not active. Contact your manager.';
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
    if v_type.allow_backdate then
      if v_line.start_date < current_date - 1 then
        raise exception 'Line %: % can be filed for today or yesterday at the earliest.',
          v_line.line_no, v_type.name;
      end if;
    elsif v_line.start_date < current_date then
      raise exception 'Line %: that start date is in the past.', v_line.line_no;
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
      raise exception '% has no allowance set for you for %. Ask your manager.',
        v_type.name, v_year;
    end if;
    if v_needed > v_balance then
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
end $function$
;

CREATE OR REPLACE FUNCTION public.submit_requests(p_requests jsonb)
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        ids := ids || public.submit_holiday_day_off(
          (item->>'holiday_id')::uuid, (item->>'start')::date, (item->>'end')::date, item->>'note');
      else
        ids := ids || public.submit_request(
          item->>'note',
          jsonb_build_array(jsonb_build_object('type_id', item->>'type_id', 'start', item->>'start', 'end', item->>'end')));
      end if;
    exception when others then
      -- Each request has one line, so submit_request's "Line 1:" prefix is replaced by which time off failed.
      raise exception '%',
        case when many then format('Time off %s: ', item_no) else '' end
          || regexp_replace(sqlerrm, '^Line [0-9]+:? *', '');
    end;
  end loop;
  return ids;
end$function$;

-- Grants: the public functions keep theirs through create or replace; request_stamp_facts was
-- recreated, so its grants are applied again.
revoke execute on function public.request_stamp_facts(uuid) from public;
grant execute on function public.request_stamp_facts(uuid) to authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.request_stamp_facts(uuid) to service_role';
  end if;
end$$;

drop function if exists public.book_requests_for(uuid, jsonb);
drop function if exists public.submit_requests_as(uuid, jsonb, uuid);
drop function if exists public.submit_holiday_day_off_as(uuid, uuid, date, date, text, uuid);
drop function if exists public.submit_request_as(uuid, text, jsonb, uuid);
drop table if exists public.hr_bookings;

commit;
