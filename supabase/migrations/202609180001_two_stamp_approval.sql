-- Two-stamp approval: every request carries a TEAM slot and a GOD slot, and is granted only once
-- both are settled. A slot is settled when it is stamped, or when nobody can fill it (an "X":
-- a team admin's own request with no co-admin, a requester with no team, a lone god admin).
-- Either admin may deny, and a denial is final.
--
-- Additive, and written to run on the deployed schema: the only helper called unconditionally is
-- is_god_admin(). The "is an approver" and "is active" checks are inlined, and assert_request_valid()
-- is called only when it exists, because the live database and this repo's bootstrap differ.
begin;

-- Re-runnable: applying this file twice is harmless.
alter table public.requests
  add column if not exists team_stamp_by uuid references public.profiles(id),
  add column if not exists team_stamp_at timestamptz,
  add column if not exists team_stamp_override boolean not null default false,
  add column if not exists team_stamp_override_of uuid references public.profiles(id),
  add column if not exists team_stamp_na boolean not null default false,
  add column if not exists god_stamp_by uuid references public.profiles(id),
  add column if not exists god_stamp_at timestamptz,
  add column if not exists god_stamp_na boolean not null default false,
  add column if not exists denied_slot text;

alter table public.requests
  drop constraint if exists requests_denied_slot_check,
  drop constraint if exists requests_team_override_shape,
  drop constraint if exists requests_team_stamp_shape,
  drop constraint if exists requests_god_stamp_shape;

alter table public.requests
  add constraint requests_denied_slot_check check (denied_slot is null or denied_slot in ('team', 'god')),
  -- An override is a God Admin filling the team slot; it cannot exist without a stamp.
  add constraint requests_team_override_shape check (not team_stamp_override or team_stamp_by is not null),
  add constraint requests_team_stamp_shape check ((team_stamp_by is null) = (team_stamp_at is null)),
  add constraint requests_god_stamp_shape check ((god_stamp_by is null) = (god_stamp_at is null));

-- ---------------------------------------------------------------------------
-- Who can fill a slot
-- ---------------------------------------------------------------------------

-- A team admin for this requester: active, admin of a team the requester is in, and not the
-- requester. God Admins are excluded here; they reach the team slot through an override.
create or replace function public.has_team_approver(p_requester uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from team_memberships mine
    join team_memberships theirs on theirs.team_id = mine.team_id
    join profiles me on me.id = mine.user_id
    where mine.role = 'admin'
      and mine.user_id <> p_requester
      and theirs.user_id = p_requester
      and me.is_active
  )
$$;

create or replace function public.has_god_approver(p_requester uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where org_role = 'god_admin' and is_active and id <> p_requester
  )
$$;

create or replace function public.can_stamp_team(p_requester uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() <> p_requester and (
    public.is_god_admin() or exists (
      select 1
      from team_memberships mine
      join team_memberships theirs on theirs.team_id = mine.team_id
      join profiles me on me.id = mine.user_id
      where mine.user_id = auth.uid()
        and mine.role = 'admin'
        and theirs.user_id = p_requester
        and me.is_active
    )
  )
$$;

create or replace function public.can_stamp_god(p_requester uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() <> p_requester and public.is_god_admin()
$$;

-- ---------------------------------------------------------------------------
-- Settling: a request is granted when both slots are settled
-- ---------------------------------------------------------------------------

-- Validation lives in assert_request_valid() in this repo's bootstrap, but the deployed database
-- was built separately. Call it only if it is there, so the same file runs against both.
create or replace function public.revalidate_request(p_request_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  -- A wellness grant has no dated lines and nothing to revalidate.
  if not exists (select 1 from request_lines where request_id = p_request_id) then
    return;
  end if;
  if to_regprocedure('public.assert_request_valid(uuid)') is not null then
    execute 'select public.assert_request_valid($1)' using p_request_id;
  end if;
end$$;

-- Freezes the X flags as they stood at the moment of the decision, so history stops moving when
-- teams change later. While a request is pending the flags are recomputed on every read.
create or replace function public.settle_request(p_request_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  req requests;
  team_na boolean;
  god_na boolean;
begin
  select * into req from requests where id = p_request_id;
  if req.status <> 'pending' then
    return;
  end if;
  team_na := not public.has_team_approver(req.requester_id);
  god_na := not public.has_god_approver(req.requester_id);
  if (req.team_stamp_by is not null or team_na) and (req.god_stamp_by is not null or god_na) then
    perform public.revalidate_request(p_request_id);
    update requests
    set status = 'approved',
        team_stamp_na = team_na,
        god_stamp_na = god_na,
        decided_by = auth.uid(),
        decided_at = now()
    where id = p_request_id;
  end if;
end$$;

-- A request nobody can stamp (no team approver and no other God Admin) is granted on submission.
create or replace function public.settle_on_submit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.settle_request(new.id);
  return new;
end$$;

-- Deferred to the end of the transaction: submit_request() inserts the request first and its lines
-- afterwards, and settling revalidates the request, which needs those lines to be there.
drop trigger if exists requests_settle_on_submit on public.requests;
create constraint trigger requests_settle_on_submit
after insert on public.requests
deferrable initially deferred
for each row execute function public.settle_on_submit();

-- ---------------------------------------------------------------------------
-- Stamping
-- ---------------------------------------------------------------------------

-- p_override is the confirmation a God Admin gives when filling the team slot: either nobody has
-- stamped it, or someone has and their stamp is being replaced. The old stamper is kept.
create or replace function public.stamp_request(p_request_id uuid, p_slot text, p_override boolean default false) returns void
language plpgsql security definer set search_path = public as $$
declare
  req requests;
  acting_as_god boolean;
begin
  if p_slot not in ('team', 'god') then
    raise exception 'Unknown approval slot.';
  end if;
  select * into req from requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found.';
  end if;
  if req.status <> 'pending' then
    raise exception 'This request has already changed. Refresh and try again.';
  end if;

  if p_slot = 'god' then
    if not public.can_stamp_god(req.requester_id) then
      raise exception 'Not authorized to stamp this request.';
    end if;
    if req.god_stamp_by is not null then
      raise exception 'This slot is already stamped.';
    end if;
    if not public.has_god_approver(req.requester_id) then
      raise exception 'This slot cannot be stamped.';
    end if;
    update requests set god_stamp_by = auth.uid(), god_stamp_at = now() where id = p_request_id;
  else
    if not public.can_stamp_team(req.requester_id) then
      raise exception 'Not authorized to stamp this request.';
    end if;
    -- A God Admin who is not a team admin for this requester, or who is replacing an existing
    -- stamp, is overriding and must say so.
    acting_as_god := req.team_stamp_by is not null or not public.has_team_approver(req.requester_id)
      or not exists (
        select 1
        from team_memberships mine
        join team_memberships theirs on theirs.team_id = mine.team_id
        where mine.user_id = auth.uid() and mine.role = 'admin' and theirs.user_id = req.requester_id
      );
    if acting_as_god then
      if not public.is_god_admin() then
        raise exception 'Not authorized to stamp this request.';
      end if;
      if not p_override then
        raise exception 'Confirm the override to stamp the team slot.';
      end if;
    elsif req.team_stamp_by is not null then
      raise exception 'This slot is already stamped.';
    end if;
    update requests
    set team_stamp_by = auth.uid(),
        team_stamp_at = now(),
        team_stamp_override = acting_as_god,
        team_stamp_override_of = case when acting_as_god then req.team_stamp_by else null end
    where id = p_request_id;
  end if;

  perform public.settle_request(p_request_id);
end$$;

-- Removing a stamp: your own within 24 hours, or any stamp if you are a God Admin. Taking a stamp
-- off a granted request puts it back to pending; the other stamp stays where it is.
create or replace function public.unstamp_request(p_request_id uuid, p_slot text) returns void
language plpgsql security definer set search_path = public as $$
declare
  req requests;
  stamper uuid;
  stamped_at timestamptz;
begin
  if p_slot not in ('team', 'god') then
    raise exception 'Unknown approval slot.';
  end if;
  select * into req from requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found.';
  end if;
  if req.status not in ('pending', 'approved') then
    raise exception 'This request has already changed. Refresh and try again.';
  end if;
  stamper := case when p_slot = 'team' then req.team_stamp_by else req.god_stamp_by end;
  stamped_at := case when p_slot = 'team' then req.team_stamp_at else req.god_stamp_at end;
  if stamper is null then
    raise exception 'There is no stamp to remove.';
  end if;
  if not public.is_god_admin() then
    if stamper <> auth.uid() then
      raise exception 'Only your own stamp can be removed.';
    end if;
    if stamped_at < now() - interval '24 hours' then
      raise exception 'A stamp can only be removed within 24 hours.';
    end if;
  end if;

  if p_slot = 'team' then
    update requests
    set team_stamp_by = null, team_stamp_at = null,
        team_stamp_override = false, team_stamp_override_of = null
    where id = p_request_id;
  else
    update requests set god_stamp_by = null, god_stamp_at = null where id = p_request_id;
  end if;

  if req.status = 'approved' then
    update requests
    set status = 'pending', decided_by = null, decided_at = null,
        team_stamp_na = false, god_stamp_na = false
    where id = p_request_id;
  end if;
end$$;

-- Denying stays one action: either admin, a reason required, and it ends the request. The slot the
-- denial came from is recorded so the card can show which circle turned red.
create or replace function public.deny_request(p_request_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare
  req requests;
  slot text;
begin
  select * into req from requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found.';
  end if;
  if req.status <> 'pending' then
    raise exception 'This request has already changed. Refresh and try again.';
  end if;
  if length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'A reason is required.';
  end if;
  if public.can_stamp_god(req.requester_id) then
    slot := 'god';
  elsif public.can_stamp_team(req.requester_id) then
    slot := 'team';
  else
    raise exception 'Not authorized to decide this request.';
  end if;
  update requests
  set status = 'denied',
      denied_slot = slot,
      denial_reason = trim(p_reason),
      decided_by = auth.uid(),
      decided_at = now(),
      team_stamp_na = not public.has_team_approver(req.requester_id),
      god_stamp_na = not public.has_god_approver(req.requester_id)
  where id = p_request_id;
end$$;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------

-- Supabase grants new functions to anon by default; only signed-in users may call these.
revoke execute on function public.has_team_approver(uuid) from public;
revoke execute on function public.has_god_approver(uuid) from public;
revoke execute on function public.can_stamp_team(uuid) from public;
revoke execute on function public.can_stamp_god(uuid) from public;
revoke execute on function public.revalidate_request(uuid) from public;
revoke execute on function public.settle_request(uuid) from public;
revoke execute on function public.settle_on_submit() from public;
revoke execute on function public.stamp_request(uuid, text, boolean) from public;
revoke execute on function public.unstamp_request(uuid, text) from public;
revoke execute on function public.deny_request(uuid, text) from public;

grant execute on function public.has_team_approver(uuid) to authenticated;
grant execute on function public.has_god_approver(uuid) to authenticated;
grant execute on function public.can_stamp_team(uuid) to authenticated;
grant execute on function public.can_stamp_god(uuid) to authenticated;
grant execute on function public.stamp_request(uuid, text, boolean) to authenticated;
grant execute on function public.unstamp_request(uuid, text) to authenticated;
grant execute on function public.deny_request(uuid, text) to authenticated;

-- The single-approval path is retired: one call must never be able to grant a request. These are
-- dropped only from the browser role, so anything server-side keeps working.
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.decide_request(uuid, boolean, text)',
    'public.decide_wellness_request(uuid, boolean, text)',
    'public.undo_decision(uuid)'
  ] loop
    if to_regprocedure(fn) is not null then
      execute format('revoke execute on function %s from authenticated', fn);
      -- anon exists on Supabase but not in the test harness.
      if exists (select 1 from pg_roles where rolname = 'anon') then
        execute format('revoke execute on function %s from anon', fn);
      end if;
    end if;
  end loop;
end$$;

commit;
