-- Rollback for 202609280002_leave_year_reset.sql.
--
-- Restores every function the migration replaced to its live body as read on 2026-09-28 (calendar
-- leave years), then drops what it added. Allowance rows written while it was in place (a
-- carried-forward amount made real by a Wellness Day top-up) stay, keyed by the year they were
-- written for. Dropping the reset columns loses each type's reset day.
begin;

CREATE OR REPLACE FUNCTION public.apply_wellness_grant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  current_amount numeric;
  booked_days integer;
begin
  if new.status = 'approved' then
    insert into pto_grants (user_id, pto_type_id, leave_year, amount)
    values (new.requester_id, new.grant_type_id, new.grant_year, new.grant_days)
    on conflict (user_id, pto_type_id, leave_year) do update set amount = pto_grants.amount + excluded.amount;
  elsif old.status = 'approved' then
    select amount into current_amount from pto_grants
    where user_id = new.requester_id and pto_type_id = new.grant_type_id and leave_year = new.grant_year
    for update;
    -- Approved wellness time off in that year, counted on the person's working days.
    select count(*)::integer into booked_days
    from requests r
    join request_lines l on l.request_id = r.id
    cross join lateral generate_series(l.start_date::timestamp, l.end_date::timestamp, interval '1 day') d
    where r.requester_id = new.requester_id
      and r.status = 'approved'
      and l.pto_type_id = new.grant_type_id
      and extract(year from d)::integer = new.grant_year
      and not extract(dow from d)::integer = any (coalesce((select normal_days_off from profiles where id = new.requester_id), array[0, 6]));
    if current_amount is null or current_amount - new.grant_days < booked_days then
      raise exception 'These wellness days are already booked, so this approval cannot be undone.';
    end if;
    update pto_grants set amount = amount - new.grant_days
    where user_id = new.requester_id and pto_type_id = new.grant_type_id and leave_year = new.grant_year;
  end if;
  return new;
end$function$
;

CREATE OR REPLACE FUNCTION public.provision_grants(p_leave_year integer DEFAULT NULL::integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_year integer := coalesce(p_leave_year, public.leave_year_of(current_date));
  v_made integer;
begin
  insert into public.pto_grants (user_id, pto_type_id, leave_year, amount)
  select p.id, t.id, v_year, t.default_days
  from public.profiles p
  cross join public.pto_types t
  where p.is_active
    and t.is_active
  on conflict (user_id, pto_type_id, leave_year) do nothing;

  get diagnostics v_made = row_count;
  return v_made;
end $function$
;

CREATE OR REPLACE FUNCTION public.provision_grants_for_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.pto_grants (user_id, pto_type_id, leave_year, amount)
  select new.id, t.id, public.leave_year_of(current_date), t.default_days
  from public.pto_types t
  where t.is_active
  on conflict (user_id, pto_type_id, leave_year) do nothing;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.provision_grants_for_type()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not new.is_active then return new; end if;
  insert into public.pto_grants (user_id, pto_type_id, leave_year, amount)
  select p.id, new.id, public.leave_year_of(current_date), new.default_days
  from public.profiles p
  where p.is_active
  on conflict (user_id, pto_type_id, leave_year) do nothing;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.pto_balance(p_user_id uuid, p_type_id uuid, p_leave_year integer)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select g.amount - public.pto_used(p_user_id, p_type_id, p_leave_year)
  from public.pto_grants g
  where g.user_id = p_user_id
    and g.pto_type_id = p_type_id
    and g.leave_year = p_leave_year;
$function$
;

CREATE OR REPLACE FUNCTION public.pto_used(p_user_id uuid, p_type_id uuid, p_leave_year integer)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    and l.end_date   >= public.year_start(p_leave_year);
$function$
;

CREATE OR REPLACE FUNCTION public.submit_request_as(p_requester uuid, p_note text, p_lines jsonb, p_booked_by uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$
;

CREATE OR REPLACE FUNCTION public.submit_wellness_request(p_days integer, p_note text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  wellness_type uuid;
  new_id uuid;
begin
  -- Same gate as the live submit_request: the caller must be an active, set-up account.
  if not exists (select 1 from profiles where id = auth.uid() and is_active)
     or exists (select 1 from profiles where id = auth.uid() and password_setup_required) then
    raise exception 'Finish account setup before requesting leave.';
  end if;
  if p_days is null or p_days not between 1 and 10 then
    raise exception 'Request between 1 and 10 wellness days.';
  end if;
  select id into wellness_type from pto_types where is_wellness and is_active;
  if wellness_type is null then
    raise exception 'Wellness days are not set up yet. Ask an administrator.';
  end if;
  insert into requests (requester_id, note, kind, grant_type_id, grant_days, grant_year)
  values (auth.uid(), nullif(trim(p_note), ''), 'wellness_grant', wellness_type, p_days, extract(year from current_date)::integer)
  returning id into new_id;
  return new_id;
end$function$;

drop function if exists public.set_leave_reset(uuid, integer, integer, date);
drop function if exists public.leave_allowances(uuid);
drop function if exists public.ensure_grant(uuid, uuid, integer);
drop function if exists public.grant_amount(uuid, uuid, integer);
drop function if exists public.leave_year_label(uuid, integer);
drop function if exists public.leave_year_end(uuid, integer);
drop function if exists public.leave_year_start(uuid, integer);
drop function if exists public.leave_year_for(uuid, date);

alter table public.pto_types
  drop constraint if exists pto_types_first_reset_matches,
  drop constraint if exists pto_types_reset_day_valid,
  drop column if exists first_reset,
  drop column if exists reset_day,
  drop column if exists reset_month;

commit;
