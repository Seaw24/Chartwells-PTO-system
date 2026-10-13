-- Removes Wellness Day top-up requests (202609140001_wellness_day_requests.sql). The Wellness Day
-- leave type stays an ordinary type; only the "ask for extra days" request goes.
--
-- On 2026-10-13 the live database held four top-up requests, three cancelled and one denied. None
-- was ever approved, so no allowance holds top-up days and the carry-forward in grant_amount()
-- loses nothing by forgetting them. The guard below stops the migration if that has changed.
begin;

do $$
begin
  if exists (select 1 from public.requests where kind = 'wellness_grant' and status in ('pending', 'approved')) then
    raise exception 'A Wellness Day top-up is pending or approved. Settle it before removing the feature.';
  end if;
end$$;

delete from public.requests where kind = 'wellness_grant';

drop trigger requests_apply_wellness_grant on public.requests;
drop function public.apply_wellness_grant();
drop function public.submit_wellness_request(integer, text);
drop function public.decide_wellness_request(uuid, boolean, text);

-- A person's allowance for a leave year: the stored amount, else their most recent earlier amount,
-- else the type's default.
create or replace function public.grant_amount(p_user_id uuid, p_type_id uuid, p_leave_year integer)
returns integer
language sql stable security definer set search_path to '' as $$
  select coalesce(
    (select g.amount::integer from public.pto_grants g
     where g.user_id = p_user_id and g.pto_type_id = p_type_id and g.leave_year = p_leave_year),
    (select g.amount::integer from public.pto_grants g
     where g.user_id = p_user_id and g.pto_type_id = p_type_id and g.leave_year < p_leave_year
     order by g.leave_year desc
     limit 1),
    (select t.default_days::integer from public.pto_types t where t.id = p_type_id),
    0)
$$;

alter table public.requests
  drop constraint requests_grant_shape,
  drop constraint requests_kind_check,
  drop column grant_year,
  drop column grant_days,
  drop column grant_type_id,
  drop column kind;

drop index public.pto_types_single_wellness;
alter table public.pto_types drop column is_wellness;

commit;
