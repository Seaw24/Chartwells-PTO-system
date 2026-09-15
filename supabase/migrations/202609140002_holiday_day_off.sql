-- Holiday Day Off: company holidays are no longer free days. Instead each holiday opens a window,
-- the holiday through 30 days after it, in which a person can book one working day off against it.
-- That booking uses a hidden "Holiday Day Off" PTO type and remembers which holiday it was for.
-- Self-contained like the wellness migration: the only helpers it calls are is_god_admin() and
-- auth.uid(), so it runs on the deployed schema and on the recovered test schema. Two existing
-- function bodies change: is_working_day() stops skipping holidays, and apply_wellness_grant()
-- counts holiday dates like any other working day.
begin;

-- The one hidden type these bookings use. Its allowance is one day per holiday, counted from
-- requests, so it has no yearly grant (default_days 0) and Settings does not list it.
alter table public.pto_types add column is_holiday_day_off boolean not null default false;
create unique index pto_types_single_holiday_day_off on public.pto_types (is_holiday_day_off) where is_holiday_day_off;
insert into public.pto_types (name, color, default_days, is_holiday_day_off)
values ('Holiday Day Off', '#2A8FA8', 0, true);

-- A line keeps its holiday's id and name. Deleting the holiday clears the id but keeps the name,
-- so the request can still say which holiday went away. Renaming a holiday renames its lines.
alter table public.request_lines
  add column holiday_id uuid references public.holidays(id) on delete set null,
  add column holiday_name text;
create index request_lines_holiday_id_idx on public.request_lines (holiday_id) where holiday_id is not null;

-- Holidays are charged like any other working day. Only the person's regular days off are skipped.
create or replace function public.is_working_day(p_user_id uuid, p_date date) returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select not (extract(dow from p_date)::integer = any (pr.normal_days_off))
     from public.profiles pr
     where pr.id = p_user_id),
    false
  );
$$;

create or replace function public.apply_wellness_grant() returns trigger language plpgsql security definer set search_path = public as $$
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
end$$;

-- Holiday Day Off lines only come from submit_holiday_day_off, and only those lines name a holiday.
create function public.guard_holiday_day_off_line() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from pto_types where id = new.pto_type_id and is_holiday_day_off) then
    if new.holiday_name is null then
      raise exception 'Book a Holiday Day Off from its holiday card on the request form.';
    end if;
  elsif new.holiday_id is not null or new.holiday_name is not null then
    raise exception 'Only a Holiday Day Off can be linked to a holiday.';
  end if;
  return new;
end$$;

create trigger request_lines_guard_holiday_day_off
before insert on public.request_lines
for each row execute function public.guard_holiday_day_off_line();

create function public.sync_holiday_day_off_name() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update request_lines set holiday_name = new.name where holiday_id = new.id;
  return new;
end$$;

create trigger holidays_sync_day_off_name
after update of name on public.holidays
for each row
when (old.name is distinct from new.name)
execute function public.sync_holiday_day_off_name();

-- A Holiday Day Off whose holiday was deleted, or moved so the day is outside its window, cannot be
-- approved. Checked on the status change so every decision path is covered; deny and cancel still work.
create function public.guard_holiday_day_off_approval() returns trigger language plpgsql security definer set search_path = public as $$
declare
  stale record;
begin
  select l.holiday_name, h.date as holiday_date into stale
  from request_lines l
  join pto_types t on t.id = l.pto_type_id and t.is_holiday_day_off
  left join holidays h on h.id = l.holiday_id
  where l.request_id = new.id
    and (h.id is null or l.start_date < h.date or l.end_date > h.date + 30)
  limit 1;
  if found then
    if stale.holiday_date is null then
      raise exception '% is no longer a company holiday, so this Holiday Day Off cannot be approved. Deny it instead.', stale.holiday_name;
    end if;
    raise exception '% moved to %, so this day is outside its window and cannot be approved. Deny it instead.',
      stale.holiday_name, to_char(stale.holiday_date, 'Mon FMDD');
  end if;
  return new;
end$$;

create trigger requests_guard_holiday_day_off_approval
before update of status on public.requests
for each row
when (new.status = 'approved' and old.status is distinct from new.status)
execute function public.guard_holiday_day_off_approval();

create function public.submit_holiday_day_off(p_holiday_id uuid, p_start date, p_end date, p_note text) returns uuid language plpgsql security definer set search_path = public as $$
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
end$$;

-- Supabase grants new functions to anon by default; only signed-in users may call the procedure.
revoke execute on function public.guard_holiday_day_off_line() from public;
revoke execute on function public.sync_holiday_day_off_name() from public;
revoke execute on function public.guard_holiday_day_off_approval() from public;
revoke execute on function public.submit_holiday_day_off(uuid, date, date, text) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.guard_holiday_day_off_line() from anon;
    revoke execute on function public.sync_holiday_day_off_name() from anon;
    revoke execute on function public.guard_holiday_day_off_approval() from anon;
    revoke execute on function public.submit_holiday_day_off(uuid, date, date, text) from anon;
  end if;
end$$;
grant execute on function public.submit_holiday_day_off(uuid, date, date, text) to authenticated;

commit;

-- Rollback (only while no Holiday Day Off requests need keeping). Restoring the old
-- is_working_day() and apply_wellness_grant() bodies brings back holidays as free days.
-- begin;
-- drop function public.submit_holiday_day_off(uuid, date, date, text);
-- drop trigger requests_guard_holiday_day_off_approval on public.requests;
-- drop function public.guard_holiday_day_off_approval();
-- drop trigger holidays_sync_day_off_name on public.holidays;
-- drop function public.sync_holiday_day_off_name();
-- drop trigger request_lines_guard_holiday_day_off on public.request_lines;
-- drop function public.guard_holiday_day_off_line();
-- delete from public.requests r where exists (
--   select 1 from public.request_lines l join public.pto_types t on t.id = l.pto_type_id
--   where l.request_id = r.id and t.is_holiday_day_off);
-- delete from public.pto_grants g using public.pto_types t where g.pto_type_id = t.id and t.is_holiday_day_off;
-- delete from public.pto_types where is_holiday_day_off;
-- alter table public.request_lines drop column holiday_name, drop column holiday_id;
-- drop index public.pto_types_single_holiday_day_off;
-- alter table public.pto_types drop column is_holiday_day_off;
-- commit;
