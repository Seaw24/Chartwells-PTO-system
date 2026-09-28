-- The two seals on a request card have to read the same for everyone who can see the card, and
-- right now they cannot. profiles_read is
--   (id = auth.uid() or is_god_admin() or is_admin_for_user(id))
-- so a team admin's roster holds only their own teams and an employee's holds only themselves.
-- God Admins are invisible to both. The browser was inferring two things from that roster:
--   * "nobody can fill this slot", which a team admin therefore got wrong for the GOD slot — it
--     rendered "no other god admin can approve this one" while a God Admin plainly existed;
--   * the name behind a stamp, which came out as "Someone" for anyone the viewer cannot read.
--
-- Neither question is the viewer's to answer. This exposes both as one read, computed with definer
-- rights the way has_team_approver()/has_god_approver() already are.
--
-- Rows are limited to the requests the caller can already read — the same condition as
-- requests_read, with is_admin_for_user() inlined so the file also runs on this repo's bootstrap,
-- where that helper does not exist. So this reveals no request the caller could not already see;
-- only the names of the people who acted on those requests. Additive and re-runnable.
begin;

-- The role shown beside a stamper's name, derived exactly as mapProfile() derives it from a
-- profile: God Admin, else Admin if they run any team, else Employee.
create or replace function public.stamp_display_role(p_user_id uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when p.org_role = 'god_admin' then 'god_admin'
    when exists (
      select 1 from team_memberships m where m.user_id = p.id and m.role = 'admin'
    ) then 'admin'
    else 'employee'
  end
  from profiles p
  where p.id = p_user_id
$$;

-- Everything the seals need that the caller's own view of profiles cannot answer. Pass a request
-- id for a single card, or nothing for the whole readable set.
create or replace function public.request_stamp_facts(p_request_id uuid default null)
returns table (
  request_id uuid,
  team_na_now boolean,
  god_na_now boolean,
  team_stamp_by_name text,
  team_stamp_by_role text,
  god_stamp_by_name text,
  god_stamp_by_role text,
  team_stamp_override_of_name text,
  decided_by_name text
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
$$;

-- Supabase's default privileges grant execute on every new function to anon and authenticated,
-- and that is a separate grant from PUBLIC — revoking PUBLIC does not remove it. stamp_display_role()
-- is only ever called from inside the definer function above, which runs as its owner, so the
-- browser never needs it and both browser roles are revoked explicitly.
revoke execute on function public.stamp_display_role(uuid) from public;
revoke execute on function public.stamp_display_role(uuid) from authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public.stamp_display_role(uuid) from anon';
  end if;
end$$;

revoke execute on function public.request_stamp_facts(uuid) from public;
grant execute on function public.request_stamp_facts(uuid) to authenticated;

commit;
