-- Undoes 202609180005_undo_denial.sql by restoring unstamp_request() to its
-- 202609180001_two_stamp_approval.sql body, where a denial is final. The undone_by/undone_at
-- columns are left in place: they predate this migration on the deployed database and dropping
-- them would lose its audit trail. The 24 hour window comes back with it.
begin;

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

drop function if exists public.decision_window_open(uuid);

commit;
