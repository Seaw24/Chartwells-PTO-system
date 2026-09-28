-- Undoing a denial fell through a gap between three versions of the rule:
--
--   * this repo's bootstrap undo_decision() accepted `status in ('approved','denied')`, so an admin
--     who managed the requester could take a denial back within 24 hours;
--   * the deployed undo_decision() only ever accepted 'approved' — "Only an approval can be undone";
--   * 202609180001_two_stamp_approval.sql then revoked undo_decision() from the browser entirely,
--     because one call must never be able to grant a request.
--
-- Nothing replaced the denial path, so a denial became permanent: unstamp_request() refuses any
-- status but 'pending' and 'approved', and deny_request() only acts on 'pending'. This puts it back.
--
-- It is lifted through the seal that turned red rather than through a separate procedure, so the
-- rule is the one that already governs taking a stamp off: the admin who did it, or any god admin.
-- Undoing an approval keeps working the way it does today — by taking a stamp off — so
-- undo_decision() stays revoked and is not resurrected here.
--
-- The window is also changed, for both actions. It used to be 24 hours from the decision, which
-- could close while the time off was still weeks away and stay open after it had begun. It now
-- closes when the time off begins: a decision can be changed right up to the day before the first
-- requested day, and not once that day has arrived.
--
-- Additive and re-runnable.
begin;

-- The deployed database records an undo on the request; this repo's bootstrap has request_audit
-- instead and no such columns. Adding them makes the file run on both and keeps the live audit.
alter table public.requests
  add column if not exists undone_by uuid references public.profiles(id),
  add column if not exists undone_at timestamptz;

-- Is there still time for changing this decision to mean anything? True until the first requested
-- day arrives. A wellness grant has no dated lines and so no such moment, and stays open: what
-- bounds it instead is the requests_apply_wellness_grant trigger, which refuses to pull a grant
-- back below the days already booked against it.
create or replace function public.decision_window_open(p_request_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(min(l.start_date) > current_date, true)
  from request_lines l
  where l.request_id = p_request_id
$$;

revoke execute on function public.decision_window_open(uuid) from public;
grant execute on function public.decision_window_open(uuid) to authenticated;

-- Removing a stamp, or lifting a denial: the same door, because on the card they are the same
-- gesture — clicking the seal in that slot.
create or replace function public.unstamp_request(p_request_id uuid, p_slot text) returns void
language plpgsql security definer set search_path = public as $$
declare
  req requests;
  stamper uuid;
begin
  if p_slot not in ('team', 'god') then
    raise exception 'Unknown approval slot.';
  end if;
  select * into req from requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found.';
  end if;

  -- A denial lives on the request, not in a slot, so it is lifted rather than unstamped. Only the
  -- slot the denial came from can lift it; the other seal is not the one that turned red.
  if req.status = 'denied' then
    if req.denied_slot is distinct from p_slot then
      raise exception 'That slot did not deny this request.';
    end if;
    if not public.is_god_admin() then
      if req.decided_by is distinct from auth.uid() then
        raise exception 'Only the admin who denied this can take it back.';
      end if;
      if not public.decision_window_open(p_request_id) then
        raise exception 'The time off has already started, so this denial can no longer be taken back.';
      end if;
    end if;
    update requests
    set status = 'pending',
        denied_slot = null,
        denial_reason = null,
        decided_by = null,
        decided_at = null,
        team_stamp_na = false,
        god_stamp_na = false,
        undone_by = auth.uid(),
        undone_at = now()
    where id = p_request_id;
    -- The stamps a denial did not touch are still there, so the request settles on today's facts:
    -- if the other slot is stamped and this one turns out to be an X, it grants itself again.
    perform public.settle_request(p_request_id);
    return;
  end if;

  if req.status not in ('pending', 'approved') then
    raise exception 'This request has already changed. Refresh and try again.';
  end if;
  stamper := case when p_slot = 'team' then req.team_stamp_by else req.god_stamp_by end;
  if stamper is null then
    raise exception 'There is no stamp to remove.';
  end if;
  if not public.is_god_admin() then
    if stamper <> auth.uid() then
      raise exception 'Only your own stamp can be removed.';
    end if;
    if not public.decision_window_open(p_request_id) then
      raise exception 'The time off has already started, so this stamp can no longer be taken off.';
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

revoke execute on function public.unstamp_request(uuid, text) from public;
grant execute on function public.unstamp_request(uuid, text) to authenticated;

commit;
