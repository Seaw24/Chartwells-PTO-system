-- The employee-access Edge Function asks the database two questions before it touches Auth:
-- manages_team() when a team admin adds someone to a team, and manages_person() before it resets
-- somebody's password. Neither function exists on the deployed database — it was built separately
-- from this repo's bootstrap — so both calls fail and, in practice, password resets are impossible
-- for everyone and only a God Admin can add people.
--
-- These are the bootstrap's definitions from 202609080001_recovered_contract.sql, rewritten to run
-- on the deployed schema: active_actor() is gone and the membership checks are inlined, so the only
-- helper called is is_god_admin(), which exists in both. The inlined bodies are the live
-- is_team_admin() and is_admin_for_user() verbatim, so these answer exactly as the rest of the
-- deployed contract already does. Additive and re-runnable.
begin;

-- Can the caller add people to this team, or edit it? God Admins can, and so can an active admin
-- of that team.
create or replace function public.manages_team(p_team_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_god_admin() or exists (
    select 1
    from team_memberships m
    join profiles me on me.id = m.user_id
    where m.user_id = auth.uid()
      and m.team_id = p_team_id
      and m.role = 'admin'
      and me.is_active
  )
$$;

-- Can the caller administer this person? God Admins can administer anyone. A team admin can
-- administer people on a team they run, but never a God Admin — otherwise resetting a God Admin's
-- password would be a way up. Like the live is_admin_for_user(), this is true for a team admin
-- asking about themselves; the Edge Function blocks self-resets separately.
create or replace function public.manages_person(p_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_god_admin() or (
    not exists (
      select 1 from profiles where id = p_user_id and org_role = 'god_admin'
    )
    and exists (
      select 1
      from team_memberships mine
      join team_memberships theirs on theirs.team_id = mine.team_id
      join profiles me on me.id = mine.user_id
      where mine.user_id = auth.uid()
        and mine.role = 'admin'
        and theirs.user_id = p_user_id
        and me.is_active
    )
  )
$$;

-- Supabase grants new functions to anon by default; only signed-in users may call these.
revoke execute on function public.manages_team(uuid) from public;
revoke execute on function public.manages_person(uuid) from public;

grant execute on function public.manages_team(uuid) to authenticated;
grant execute on function public.manages_person(uuid) to authenticated;

commit;
