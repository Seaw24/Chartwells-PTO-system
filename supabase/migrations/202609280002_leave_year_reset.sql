-- Leave years per PTO type. Each type resets on its own day of the year (reset_month/reset_day):
-- a leave year runs from that day to the day before the next one, the full allowance is usable
-- from its first day, and unused days do not carry over. A leave year is named after the calendar
-- year it starts in, so Vacation resetting Oct 1 has "2027" = Oct 1, 2027 - Sep 30, 2028.
--
-- first_reset is the first day the rule takes effect. Before it, the type keeps the calendar years
-- it has always used, and the leave year that is running when the rule is set stretches until
-- first_reset. Vacation is set to reset Oct 1 from Oct 1, 2027, so its current allowance (stored
-- as 2026) runs Jan 1, 2026 - Sep 30, 2027 and nobody is reset this year.
--
-- A new leave year needs no job: a person's allowance for a year with no pto_grants row is their
-- most recent earlier amount (without Wellness Day top-ups, which are for one year only), or the
-- type's default if they have never had one. A row is written only when something changes it.
--
-- Runs on the deployed schema and on the recovered schema the tests build. Re-runnable.
begin;

-- ---------------------------------------------------------------------------
-- Reset days
-- ---------------------------------------------------------------------------

alter table public.pto_types
  add column if not exists reset_month smallint not null default 1,
  add column if not exists reset_day smallint not null default 1,
  add column if not exists first_reset date;

alter table public.pto_types
  drop constraint if exists pto_types_reset_day_valid,
  drop constraint if exists pto_types_first_reset_matches;
alter table public.pto_types
  -- Feb 29 is left out so every year has the day.
  add constraint pto_types_reset_day_valid check (
    reset_month between 1 and 12
    and reset_day between 1 and case reset_month when 2 then 28 when 4 then 30 when 6 then 30
                                                 when 9 then 30 when 11 then 30 else 31 end),
  add constraint pto_types_first_reset_matches check (
    first_reset is null
    or (extract(month from first_reset) = reset_month and extract(day from first_reset) = reset_day));

-- Vacation resets Oct 1, starting Oct 1, 2027. Only while it still has the calendar default, so a
-- rerun never undoes a change made in Settings.
update public.pto_types
set reset_month = 10, reset_day = 1, first_reset = date '2027-10-01'
where name = 'Vacation' and reset_month = 1 and reset_day = 1 and first_reset is null;

-- ---------------------------------------------------------------------------
-- Leave year arithmetic
-- ---------------------------------------------------------------------------

-- The leave year a day falls in, for a type.
create or replace function public.leave_year_for(p_type_id uuid, p_date date)
returns integer
language sql stable security definer set search_path to '' as $$
  select coalesce((
    select case
      -- Before the rule starts: calendar years, except that the year running when it was set
      -- stretches to the day before first_reset.
      when t.first_reset is not null and p_date < t.first_reset
        then least(extract(year from p_date)::integer, extract(year from t.first_reset)::integer - 1)
      else extract(year from p_date)::integer
        - case when (extract(month from p_date), extract(day from p_date)) < (t.reset_month, t.reset_day)
               then 1 else 0 end
    end
    from public.pto_types t where t.id = p_type_id
  ), extract(year from p_date)::integer)
$$;

-- The first day of a type's leave year.
create or replace function public.leave_year_start(p_type_id uuid, p_year integer)
returns date
language sql stable security definer set search_path to '' as $$
  select coalesce((
    select case
      when t.first_reset is not null and p_year < extract(year from t.first_reset)::integer
        then make_date(p_year, 1, 1)
      else make_date(p_year, t.reset_month, t.reset_day)
    end
    from public.pto_types t where t.id = p_type_id
  ), make_date(p_year, 1, 1))
$$;

-- The last day of a type's leave year: the day before the next one starts.
create or replace function public.leave_year_end(p_type_id uuid, p_year integer)
returns date
language sql stable security definer set search_path to '' as $$
  select public.leave_year_start(p_type_id, p_year + 1) - 1
$$;

-- How a leave year reads in messages: "2027" for a calendar year, else "Oct 1, 2027 - Sep 30, 2028".
create or replace function public.leave_year_label(p_type_id uuid, p_year integer)
returns text
language sql stable security definer set search_path to '' as $$
  select case
    when to_char(s, 'MM-DD') = '01-01' and e = make_date(p_year, 12, 31) then p_year::text
    else to_char(s, 'Mon FMDD, YYYY') || ' – ' || to_char(e, 'Mon FMDD, YYYY')
  end
  from (select public.leave_year_start(p_type_id, p_year) s, public.leave_year_end(p_type_id, p_year) e) x
$$;

-- ---------------------------------------------------------------------------
-- Allowances
-- ---------------------------------------------------------------------------

-- A person's allowance for a leave year: the stored amount, else their most recent earlier amount
-- without that year's Wellness Day top-ups, else the type's default.
create or replace function public.grant_amount(p_user_id uuid, p_type_id uuid, p_leave_year integer)
returns integer
language sql stable security definer set search_path to '' as $$
  select coalesce(
    (select g.amount::integer from public.pto_grants g
     where g.user_id = p_user_id and g.pto_type_id = p_type_id and g.leave_year = p_leave_year),
    (select (g.amount - coalesce((
              select sum(r.grant_days) from public.requests r
              where r.kind = 'wellness_grant' and r.status = 'approved'
                and r.requester_id = g.user_id and r.grant_type_id = g.pto_type_id
                and r.grant_year = g.leave_year), 0))::integer
     from public.pto_grants g
     where g.user_id = p_user_id and g.pto_type_id = p_type_id and g.leave_year < p_leave_year
     order by g.leave_year desc
     limit 1),
    (select t.default_days::integer from public.pto_types t where t.id = p_type_id),
    0)
$$;

-- Writes the carried-forward amount as a row, for changes that add to it (a Wellness Day top-up).
create or replace function public.ensure_grant(p_user_id uuid, p_type_id uuid, p_leave_year integer)
returns void
language sql volatile security definer set search_path to '' as $$
  insert into public.pto_grants (user_id, pto_type_id, leave_year, amount)
  values (p_user_id, p_type_id, p_leave_year, public.grant_amount(p_user_id, p_type_id, p_leave_year))
  on conflict (user_id, pto_type_id, leave_year) do nothing
$$;

-- Approved days of a type inside one of its leave years. Same body as before, bounded by the
-- type's leave year instead of the calendar year.
create or replace function public.pto_used(p_user_id uuid, p_type_id uuid, p_leave_year integer)
returns integer
language sql stable security definer set search_path to '' as $$
  select coalesce(sum(
    public.charged_days(
      p_user_id,
      greatest(l.start_date, public.leave_year_start(p_type_id, p_leave_year)),
      least(l.end_date,      public.leave_year_end(p_type_id, p_leave_year))
    )
  ), 0)::integer
  from public.request_lines l
  join public.requests r on r.id = l.request_id
  where r.requester_id = p_user_id
    and r.status = 'approved'
    and l.pto_type_id = p_type_id
    and l.start_date <= public.leave_year_end(p_type_id, p_leave_year)
    and l.end_date   >= public.leave_year_start(p_type_id, p_leave_year)
$$;

create or replace function public.pto_balance(p_user_id uuid, p_type_id uuid, p_leave_year integer)
returns integer
language sql stable security definer set search_path to '' as $$
  select public.grant_amount(p_user_id, p_type_id, p_leave_year)
       - public.pto_used(p_user_id, p_type_id, p_leave_year)
$$;

-- Every balance the app shows, in one read: for each person the caller may see and each type with a
-- yearly allowance, last, this and next leave year. p_user_id narrows it to one person.
create or replace function public.leave_allowances(p_user_id uuid default null)
returns table (
  user_id uuid,
  pto_type_id uuid,
  leave_year integer,
  starts_on date,
  ends_on date,
  amount integer,
  used integer
)
language sql stable security definer set search_path = public as $$
  select p.id, t.id, y.yr,
         public.leave_year_start(t.id, y.yr),
         public.leave_year_end(t.id, y.yr),
         public.grant_amount(p.id, t.id, y.yr),
         public.pto_used(p.id, t.id, y.yr)
  from profiles p
  cross join pto_types t
  cross join lateral generate_series(
    public.leave_year_for(t.id, current_date) - 1,
    public.leave_year_for(t.id, current_date) + 1
  ) as y(yr)
  where (p_user_id is null or p.id = p_user_id)
    and t.is_active
    and not coalesce(t.is_holiday_day_off, false)
    and (
      p.id = auth.uid()
      or public.is_god_admin()
      or exists (
        select 1
        from team_memberships mine
        join team_memberships theirs on theirs.team_id = mine.team_id
        join profiles me on me.id = mine.user_id
        where mine.user_id = auth.uid()
          and mine.role = 'admin'
          and theirs.user_id = p.id
          and me.is_active
      )
    )
$$;

-- HR sets when a type resets. p_first_reset is the first reset under the new rule; leave years
-- before it are unchanged, so a change never reshuffles what people already used.
create or replace function public.set_leave_reset(p_type_id uuid, p_month integer, p_day integer, p_first_reset date)
returns void
language plpgsql security definer set search_path = public as $$
declare
  -- Feb 29 is left out so every year has the day.
  last_day integer := case p_month when 2 then 28 when 4 then 30 when 6 then 30
                                   when 9 then 30 when 11 then 30 else 31 end;
begin
  if not public.is_god_admin() then
    raise exception 'Only HR can change when leave resets.';
  end if;
  if p_month is null or p_day is null or p_month not between 1 and 12
     or p_day not between 1 and last_day then
    raise exception 'Choose a valid reset day. February 29 is not allowed.';
  end if;
  if p_first_reset is null or p_first_reset <= current_date then
    raise exception 'The first reset must be a future date.';
  end if;
  if extract(month from p_first_reset) <> p_month or extract(day from p_first_reset) <> p_day then
    raise exception 'The first reset must fall on the reset day.';
  end if;
  update pto_types
  set reset_month = p_month, reset_day = p_day, first_reset = p_first_reset
  where id = p_type_id;
  if not found then
    raise exception 'Leave type not found.';
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- Filing time off: charge each day to its type's leave year
-- ---------------------------------------------------------------------------

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
  v_period     text;
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

  -- Balance, per type and leave year, across the whole submission. Checked after the per-line
  -- loop because it is a property of the request, not of a line: three vacation lines each within
  -- balance can still overdraw it together.
  -- Each type has its own leave year (pto_types.reset_month/reset_day). A line that crosses a reset
  -- day is split, so every day is charged to the leave year it falls in.
  for v_line in
    select seg.pto_type_id,
           seg.yr,
           coalesce(sum(public.charged_days(v_uid, seg.from_day, seg.to_day)), 0)::integer as needed
    from (
      select s.pto_type_id,
             y.yr,
             greatest(s.start_date, public.leave_year_start(s.pto_type_id, y.yr)) as from_day,
             least(s.end_date, public.leave_year_end(s.pto_type_id, y.yr)) as to_day
      from submitted_lines s
      cross join lateral generate_series(
        public.leave_year_for(s.pto_type_id, s.start_date),
        public.leave_year_for(s.pto_type_id, s.end_date)
      ) as y(yr)
    ) seg
    group by seg.pto_type_id, seg.yr
  loop
    v_year    := v_line.yr;
    v_needed  := v_line.needed;
    v_balance := public.pto_balance(v_uid, v_line.pto_type_id, v_year);
    select t.name into v_type from public.pto_types t where t.id = v_line.pto_type_id;
    -- Name the leave year only when it is not the one running today, e.g. booking ahead.
    v_period := case
      when v_year = public.leave_year_for(v_line.pto_type_id, current_date) then ''
      else ' for ' || public.leave_year_label(v_line.pto_type_id, v_year)
    end;

    if v_needed > v_balance then
      if v_hr then
        raise exception '% balance is short for %. This needs % day(s) but only % remain.',
          v_type.name, v_name || v_period, v_needed, v_balance;
      end if;
      raise exception '% balance is short%. This needs % day(s) but only % remain.',
        v_type.name, v_period, v_needed, v_balance;
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

-- ---------------------------------------------------------------------------
-- Wellness Day top-ups land in the Wellness Day leave year running today
-- ---------------------------------------------------------------------------

create or replace function public.submit_wellness_request(p_days integer, p_note text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
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
  values (auth.uid(), nullif(trim(p_note), ''), 'wellness_grant', wellness_type, p_days,
          public.leave_year_for(wellness_type, current_date))
  returning id into new_id;
  return new_id;
end$$;

create or replace function public.apply_wellness_grant()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  current_amount numeric;
  booked_days integer;
begin
  if new.status = 'approved' then
    -- A year with no row yet starts from the carried-forward amount, then gets the top-up.
    perform public.ensure_grant(new.requester_id, new.grant_type_id, new.grant_year);
    update pto_grants set amount = amount + new.grant_days
    where user_id = new.requester_id and pto_type_id = new.grant_type_id and leave_year = new.grant_year;
  elsif old.status = 'approved' then
    select amount into current_amount from pto_grants
    where user_id = new.requester_id and pto_type_id = new.grant_type_id and leave_year = new.grant_year
    for update;
    -- Approved wellness time off in that leave year, counted on the person's working days.
    select count(*)::integer into booked_days
    from requests r
    join request_lines l on l.request_id = r.id
    cross join lateral generate_series(l.start_date::timestamp, l.end_date::timestamp, interval '1 day') d
    where r.requester_id = new.requester_id
      and r.status = 'approved'
      and l.pto_type_id = new.grant_type_id
      and public.leave_year_for(new.grant_type_id, d::date) = new.grant_year
      and not extract(dow from d)::integer = any (coalesce((select normal_days_off from profiles where id = new.requester_id), array[0, 6]));
    if current_amount is null or current_amount - new.grant_days < booked_days then
      raise exception 'These wellness days are already booked, so this approval cannot be undone.';
    end if;
    update pto_grants set amount = amount - new.grant_days
    where user_id = new.requester_id and pto_type_id = new.grant_type_id and leave_year = new.grant_year;
  end if;
  return new;
end$$;

-- ---------------------------------------------------------------------------
-- Provisioning writes each type's current leave year, not the calendar year
-- ---------------------------------------------------------------------------

create or replace function public.provision_grants_for_profile()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  insert into public.pto_grants (user_id, pto_type_id, leave_year, amount)
  select new.id, t.id, public.leave_year_for(t.id, current_date), t.default_days
  from public.pto_types t
  where t.is_active
  on conflict (user_id, pto_type_id, leave_year) do nothing;
  return new;
end $$;

create or replace function public.provision_grants_for_type()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if not new.is_active then return new; end if;
  insert into public.pto_grants (user_id, pto_type_id, leave_year, amount)
  select p.id, new.id, public.leave_year_for(new.id, current_date), new.default_days
  from public.profiles p
  where p.is_active
  on conflict (user_id, pto_type_id, leave_year) do nothing;
  return new;
end $$;

create or replace function public.provision_grants(p_leave_year integer default null)
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_made integer;
begin
  insert into public.pto_grants (user_id, pto_type_id, leave_year, amount)
  select p.id, t.id, coalesce(p_leave_year, public.leave_year_for(t.id, current_date)), t.default_days
  from public.profiles p
  cross join public.pto_types t
  where p.is_active
    and t.is_active
  on conflict (user_id, pto_type_id, leave_year) do nothing;

  get diagnostics v_made = row_count;
  return v_made;
end $$;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------

-- Internal helpers: only other definer functions call them. The deployed database grants every new
-- function to authenticated by default, separately from PUBLIC, so each browser role is revoked.
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.leave_year_for(uuid, date)',
    'public.leave_year_start(uuid, integer)',
    'public.leave_year_end(uuid, integer)',
    'public.leave_year_label(uuid, integer)',
    'public.grant_amount(uuid, uuid, integer)',
    'public.ensure_grant(uuid, uuid, integer)',
    'public.pto_used(uuid, uuid, integer)',
    'public.pto_balance(uuid, uuid, integer)'
  ] loop
    execute format('revoke execute on function %s from public', fn);
    execute format('revoke execute on function %s from authenticated', fn);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke execute on function %s from anon', fn);
    end if;
  end loop;
  foreach fn in array array[
    'public.leave_allowances(uuid)',
    'public.set_leave_reset(uuid, integer, integer, date)'
  ] loop
    execute format('revoke execute on function %s from public', fn);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke execute on function %s from anon', fn);
    end if;
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end$$;

commit;
