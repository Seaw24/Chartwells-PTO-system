-- Everyone signed in sees who is off, on every team, the way HR does on the Calendar and Dashboard.
--
-- requests, request_lines and profiles stay limited by RLS to what the viewer may manage: opening
-- them would expose notes, emails and stamps, and would put everyone's pending requests on the
-- Approvals page. These two definer reads return only what a bar on the calendar needs.
--
-- Only approved and pending requests of active people. No notes, reasons, stamps or timestamps.
-- The active-account check is inlined because the bootstrap's active_actor() does not exist live.
-- Additive and re-runnable.
begin;

create or replace function public.who_is_off()
returns table (
  request_id uuid,
  requester_id uuid,
  status text,
  pto_type_id uuid,
  start_date date,
  end_date date,
  holiday_id uuid,
  holiday_name text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles me where me.id = auth.uid() and me.is_active) then
    raise exception 'Not authenticated.';
  end if;
  return query
    select r.id, r.requester_id, r.status::text, l.pto_type_id, l.start_date::date,
           l.end_date::date, l.holiday_id, l.holiday_name::text
    from requests r
    join request_lines l on l.request_id = r.id
    join profiles p on p.id = r.requester_id
    where p.is_active
      and r.status in ('approved', 'pending');
end
$$;

-- The roster behind the team and person filters and the Timeline rows. Names and teams only.
create or replace function public.team_directory()
returns table (
  id uuid,
  name text,
  memberships jsonb
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles me where me.id = auth.uid() and me.is_active) then
    raise exception 'Not authenticated.';
  end if;
  return query
    select p.id, p.name::text,
           coalesce(
             (select jsonb_agg(jsonb_build_object('team_id', m.team_id, 'role', m.role::text)
                               order by m.team_id)
              from team_memberships m where m.user_id = p.id),
             '[]'::jsonb
           )
    from profiles p
    where p.is_active;
end
$$;

revoke execute on function public.who_is_off() from public;
revoke execute on function public.team_directory() from public;
grant execute on function public.who_is_off() to authenticated;
grant execute on function public.team_directory() to authenticated;
-- Supabase grants new functions to anon by default; anon exists on Supabase but not in the tests.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.who_is_off() from anon;
    revoke execute on function public.team_directory() from anon;
  end if;
end
$$;

commit;
