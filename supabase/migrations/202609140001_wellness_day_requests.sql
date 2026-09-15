-- Wellness day requests: an employee asks for extra wellness days, and approval adds them to
-- that person's wellness grant for the leave year. Undoing the approval takes them back out.
-- Additive: no existing function is replaced. Self-contained — the only helper it calls is
-- is_god_admin() (present in the live database); the "is an approver" and "is active" checks are
-- inlined so this runs on the deployed schema, which has no active_actor()/manages_person() and
-- no request_audit table.
begin;

-- One PTO type is flagged as the wellness type that these requests top up.
alter table public.pto_types add column is_wellness boolean not null default false;
create unique index pto_types_single_wellness on public.pto_types (is_wellness) where is_wellness;
update public.pto_types set is_wellness = true
where id = (
  select id from public.pto_types
  where name ilike 'wellness%'
  order by is_active desc, created_at
  limit 1
);

-- A request is either dated time off (request_lines) or a wellness grant (no lines).
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

-- Balance changes follow the status, so approve, undo, and any other decision path stay consistent.
create function public.apply_wellness_grant() returns trigger language plpgsql security definer set search_path = public as $$
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
      and not extract(dow from d)::integer = any (coalesce((select normal_days_off from profiles where id = new.requester_id), array[0, 6]))
      and not exists (select 1 from holidays h where h.date = d::date);
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

create function public.submit_wellness_request(p_days integer, p_note text) returns uuid language plpgsql security definer set search_path = public as $$
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
end$$;

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

-- Supabase grants new functions to anon by default; only signed-in users may call these.
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
grant execute on function public.submit_wellness_request(integer, text), public.decide_wellness_request(uuid, boolean, text) to authenticated;

commit;

-- Rollback (only while no wellness requests need keeping):
-- begin;
-- drop trigger requests_apply_wellness_grant on public.requests;
-- drop function public.decide_wellness_request(uuid, boolean, text);
-- drop function public.submit_wellness_request(integer, text);
-- drop function public.apply_wellness_grant();
-- delete from public.requests where kind = 'wellness_grant';
-- alter table public.requests drop constraint requests_grant_shape, drop constraint requests_kind_check,
--   drop column grant_year, drop column grant_days, drop column grant_type_id, drop column kind;
-- drop index public.pto_types_single_wellness;
-- alter table public.pto_types drop column is_wellness;
-- commit;
