-- Several time offs from one request form are saved as separate requests, each with its own dates,
-- type, and note, so an approver decides each one on its own. They are saved together or not at
-- all: if any one fails its checks, none are kept and the error names which time off it was.
-- Additive: each item goes through the existing submit_request() or submit_holiday_day_off(), so
-- every balance, blackout, window, and overlap rule stays in one place. Runs on the deployed schema
-- and on the recovered test schema.
begin;

create function public.submit_requests(p_requests jsonb) returns uuid[] language plpgsql security definer set search_path = public as $$
declare
  item jsonb;
  item_no integer := 0;
  many boolean;
  ids uuid[] := '{}';
begin
  if p_requests is null or jsonb_typeof(p_requests) <> 'array' or jsonb_array_length(p_requests) = 0 then
    raise exception 'Add at least one time off.';
  end if;
  many := jsonb_array_length(p_requests) > 1;
  for item in select value from jsonb_array_elements(p_requests) loop
    item_no := item_no + 1;
    begin
      if nullif(item->>'holiday_id', '') is not null then
        ids := ids || public.submit_holiday_day_off(
          (item->>'holiday_id')::uuid, (item->>'start')::date, (item->>'end')::date, item->>'note');
      else
        ids := ids || public.submit_request(
          item->>'note',
          jsonb_build_array(jsonb_build_object('type_id', item->>'type_id', 'start', item->>'start', 'end', item->>'end')));
      end if;
    exception when others then
      -- Each request has one line, so submit_request's "Line 1:" prefix is replaced by which time off failed.
      raise exception '%',
        case when many then format('Time off %s: ', item_no) else '' end
          || regexp_replace(sqlerrm, '^Line [0-9]+:? *', '');
    end;
  end loop;
  return ids;
end$$;

-- Supabase grants new functions to anon by default; only signed-in users may call this.
revoke execute on function public.submit_requests(jsonb) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.submit_requests(jsonb) from anon;
  end if;
end$$;
grant execute on function public.submit_requests(jsonb) to authenticated;

commit;

-- Rollback:
-- drop function public.submit_requests(jsonb);
