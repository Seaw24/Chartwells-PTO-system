-- Rollback for 202610130001_remove_wellness_requests.sql.
--
-- Brings back Wellness Day top-up requests as they stood before the removal: the columns, the
-- wellness flag, the three functions at their latest bodies (202609280002_leave_year_reset.sql for
-- submit and apply, 202609140001 for decide, which stays revoked from the browser role as
-- 202609180001_two_stamp_approval.sql left it), the trigger, and the top-up-aware grant_amount().
-- The four cancelled/denied requests the removal deleted do not come back.
begin;

alter table public.pto_types add column is_wellness boolean not null default false;
create unique index pto_types_single_wellness on public.pto_types (is_wellness) where is_wellness;
update public.pto_types set is_wellness = true
where id = (
  select id from public.pto_types
  where name ilike 'wellness%'
  order by is_active desc, created_at
  limit 1
);

alter table public.requests
  add column kind text not null default 'time_off',
  add column grant_type_id uuid references public.pto_types(id),
  add column grant_days integer,
  add column grant_year integer;
alter table public.requests
  add constraint requests_kind_check check (kind in ('time_off', 'wellness_grant')),
  add constraint requests_grant_shape check (
    (kind = 'time_off' and grant_type_id is null and grant_days is null and grant_year is null)
    or (kind = 'wellness_grant' and grant_type_id is not null and grant_days between 1 and 10 and grant_year is not null)
  );

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


create trigger requests_apply_wellness_grant
after update of status on public.requests
for each row
when (new.kind = 'wellness_grant' and old.status is distinct from new.status)
execute function public.apply_wellness_grant();

create function public.decide_wellness_request(p_request_id uuid, p_approve boolean, p_reason text) returns void language plpgsql security definer set search_path = public as $$
declare
  req requests;
begin
  select * into req from requests where id = p_request_id for update;
  if not found or req.kind <> 'wellness_grant' then
    raise exception 'Wellness request not found.';
  end if;
  -- An approver is a God Admin, or a team admin on a team the requester belongs to. Nobody decides
  -- their own request. This inlines the live is_admin_for_user() check so no missing helper is called.
  if not (
    public.is_god_admin() or exists (
      select 1
      from team_memberships mine
      join team_memberships theirs on theirs.team_id = mine.team_id
      join profiles me on me.id = mine.user_id
      where mine.user_id = auth.uid()
        and mine.role = 'admin'
        and theirs.user_id = req.requester_id
        and me.is_active
    )
  ) or req.requester_id = auth.uid() then
    raise exception 'Not authorized to decide this request.';
  end if;
  if req.status <> 'pending' then
    raise exception 'This request has already changed. Refresh and try again.';
  end if;
  if not p_approve and length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'A reason is required.';
  end if;
  if p_approve and not exists (select 1 from pto_types where id = req.grant_type_id and is_active) then
    raise exception 'This PTO type is retired.';
  end if;
  update requests
  set status = case when p_approve then 'approved' else 'denied' end,
      decided_by = auth.uid(),
      decided_at = now(),
      denial_reason = case when p_approve then null else trim(p_reason) end
  where id = p_request_id;
end$$;

revoke execute on function public.apply_wellness_grant() from public;
revoke execute on function public.submit_wellness_request(integer, text) from public;
revoke execute on function public.decide_wellness_request(uuid, boolean, text) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.apply_wellness_grant() from anon;
    revoke execute on function public.submit_wellness_request(integer, text) from anon;
    revoke execute on function public.decide_wellness_request(uuid, boolean, text) from anon;
  end if;
end$$;
grant execute on function public.submit_wellness_request(integer, text) to authenticated;

commit;
