-- Undo 202609180001_two_stamp_approval.sql. Requests keep their status; the stamp columns and the
-- two-stamp procedures go away, and the single-approval procedures become callable again.
-- Anything approved under the two-stamp rules stays approved.
begin;

drop trigger if exists requests_settle_on_submit on public.requests;
drop function if exists public.settle_on_submit();
drop function if exists public.stamp_request(uuid, text, boolean);
drop function if exists public.unstamp_request(uuid, text);
drop function if exists public.deny_request(uuid, text);
drop function if exists public.settle_request(uuid);
drop function if exists public.revalidate_request(uuid);
drop function if exists public.can_stamp_team(uuid);
drop function if exists public.can_stamp_god(uuid);
drop function if exists public.has_team_approver(uuid);
drop function if exists public.has_god_approver(uuid);

alter table public.requests
  drop constraint if exists requests_denied_slot_check,
  drop constraint if exists requests_team_override_shape,
  drop constraint if exists requests_team_stamp_shape,
  drop constraint if exists requests_god_stamp_shape;

alter table public.requests
  drop column if exists team_stamp_by,
  drop column if exists team_stamp_at,
  drop column if exists team_stamp_override,
  drop column if exists team_stamp_override_of,
  drop column if exists team_stamp_na,
  drop column if exists god_stamp_by,
  drop column if exists god_stamp_at,
  drop column if exists god_stamp_na,
  drop column if exists denied_slot;

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
      execute format('grant execute on function %s to authenticated', fn);
    end if;
  end loop;
end$$;

commit;
