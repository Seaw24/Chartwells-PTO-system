-- Undo 202609180002_team_membership_unique.sql. Drops the unique constraint and restores the
-- unconditional inserts. Existing membership rows are untouched.
begin;

alter table public.team_memberships
  drop constraint if exists team_memberships_team_id_user_id_key;

create or replace function public.add_team_memberships(p_team_id uuid, p_entries jsonb)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_entry jsonb;
  v_user_id uuid;
  v_role text;
  v_is_god boolean := public.is_god_admin();
begin
  if not (v_is_god or public.is_team_admin(p_team_id)) then
    raise exception 'You can add people only to a team you administer.';
  end if;
  if jsonb_typeof(coalesce(p_entries, '[]'::jsonb)) <> 'array' then
    raise exception 'Team members must be a list.';
  end if;

  for v_entry in select value from jsonb_array_elements(coalesce(p_entries, '[]'::jsonb))
  loop
    v_user_id := nullif(v_entry->>'userId', '')::uuid;
    v_role := coalesce(nullif(v_entry->>'role', ''), 'employee');
    if v_user_id is null then
      raise exception 'Choose an employee to add.';
    end if;
    if v_role not in ('admin', 'employee') then
      raise exception 'Team role must be admin or employee.';
    end if;
    if not exists (
      select 1 from public.profiles p
      where p.id = v_user_id and p.org_role = 'member' and p.is_active
    ) then
      raise exception 'Only an active employee can join a team.';
    end if;
    if not v_is_god and not public.is_admin_for_user(v_user_id) then
      raise exception 'You can add only an employee you already manage.';
    end if;

    insert into public.team_memberships (user_id, team_id, role, added_by)
    values (v_user_id, p_team_id, v_role, auth.uid());
  end loop;
end $function$;

create or replace function public.save_team(p_id uuid, p_name text, p_description text, p_members jsonb default '[]'::jsonb)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_id uuid;
  v_member jsonb;
  v_user_id uuid;
  v_role text;
  v_is_god boolean := public.is_god_admin();
begin
  if nullif(btrim(p_name), '') is null then
    raise exception 'Team name is required.';
  end if;
  if jsonb_typeof(coalesce(p_members, '[]'::jsonb)) <> 'array' then
    raise exception 'Team members must be a list.';
  end if;

  if p_id is null then
    if not v_is_god then
      raise exception 'Only a God Admin can create a team.';
    end if;

    insert into public.teams (name, description)
    values (btrim(p_name), nullif(btrim(p_description), ''))
    returning id into v_id;

    for v_member in select value from jsonb_array_elements(coalesce(p_members, '[]'::jsonb))
    loop
      v_user_id := nullif(v_member->>'userId', '')::uuid;
      v_role := coalesce(nullif(v_member->>'role', ''), 'employee');
      if v_user_id is null then
        raise exception 'Every team member needs an employee.';
      end if;
      if v_role not in ('admin', 'employee') then
        raise exception 'Team role must be admin or employee.';
      end if;
      if not exists (
        select 1 from public.profiles p
        where p.id = v_user_id and p.org_role = 'member' and p.is_active
      ) then
        raise exception 'Only an active employee can join a team.';
      end if;

      insert into public.team_memberships (user_id, team_id, role, added_by)
      values (v_user_id, v_id, v_role, auth.uid());
    end loop;
  else
    if not (v_is_god or public.is_team_admin(p_id)) then
      raise exception 'You can edit only a team you administer.';
    end if;
    if not v_is_god and jsonb_array_length(coalesce(p_members, '[]'::jsonb)) > 0 then
      raise exception 'Add team members from the people list.';
    end if;

    update public.teams
    set name = btrim(p_name), description = nullif(btrim(p_description), '')
    where id = p_id
    returning id into v_id;
    if v_id is null then raise exception 'Team not found.'; end if;
  end if;

  return v_id;
end $function$;

commit;
