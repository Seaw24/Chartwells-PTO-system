-- Request notification emails. Submitting time off, and every decision on it, is collected during
-- the transaction and handed to the `notify` Edge Function in one pg_net call when it commits. The
-- function works out who to email; the database only reports what happened.
--
-- Why at commit: one submit can create several requests (one per time off in the request panel),
-- and approvers should get one email for the lot. pg_net only sends once the transaction commits,
-- so a rolled-back action sends nothing, and a failed call is caught so it can never undo an action.
--
-- Nothing is sent until notification_settings has its one row (the function URL and the shared
-- secret), so this can be applied before the function is deployed. Deleting that row turns
-- notifications off. Runs on the deployed schema (pg_net 0.20.3) and on the test schema (a pg_net
-- stub). Re-runnable.
begin;

create table if not exists public.notification_settings (
  id boolean primary key default true check (id),
  function_url text not null,
  secret text not null
);
-- Holds the shared secret: no browser role may read it.
alter table public.notification_settings enable row level security;
revoke all on table public.notification_settings from public;
revoke all on table public.notification_settings from authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on table public.notification_settings from anon';
  end if;
end$$;

-- Adds one event to this transaction's list. The list lives in a transaction-local setting, so it
-- is gone after commit or rollback.
create or replace function public.queue_request_notification(p_event jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config(
    'pto.notify_events',
    (coalesce(nullif(current_setting('pto.notify_events', true), ''), '[]')::jsonb
      || jsonb_build_array(p_event))::text,
    true);
end$$;

-- What happened to a request, read from the row change so every code path counts. An HR override
-- that swaps one Manager-slot stamper for another is not an event: that slot was already approved.
create or replace function public.collect_request_notifications() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform queue_request_notification(jsonb_build_object('kind', 'submitted', 'request_id', new.id));
    return null;
  end if;

  if old.team_stamp_by is null and new.team_stamp_by is not null then
    perform queue_request_notification(jsonb_build_object('kind', 'stamped', 'request_id', new.id,
      'slot', 'team', 'override', new.team_stamp_override, 'actor', new.team_stamp_by));
  elsif old.team_stamp_by is not null and new.team_stamp_by is null then
    perform queue_request_notification(jsonb_build_object('kind', 'unstamped', 'request_id', new.id,
      'slot', 'team', 'actor', auth.uid()));
  end if;

  if old.god_stamp_by is null and new.god_stamp_by is not null then
    perform queue_request_notification(jsonb_build_object('kind', 'stamped', 'request_id', new.id,
      'slot', 'god', 'override', false, 'actor', new.god_stamp_by));
  elsif old.god_stamp_by is not null and new.god_stamp_by is null then
    perform queue_request_notification(jsonb_build_object('kind', 'unstamped', 'request_id', new.id,
      'slot', 'god', 'actor', auth.uid()));
  end if;

  if old.status = 'pending' and new.status = 'denied' then
    perform queue_request_notification(jsonb_build_object('kind', 'denied', 'request_id', new.id,
      'slot', new.denied_slot, 'actor', new.decided_by));
  elsif old.status = 'denied' and new.status = 'pending' then
    perform queue_request_notification(jsonb_build_object('kind', 'undenied', 'request_id', new.id,
      'slot', old.denied_slot, 'actor', coalesce(new.undone_by, auth.uid())));
  end if;
  return null;
end$$;

drop trigger if exists requests_collect_notifications on public.requests;
create trigger requests_collect_notifications
after insert or update of status, team_stamp_by, god_stamp_by on public.requests
for each row execute function public.collect_request_notifications();

-- At commit: the first firing sends the whole list in one call and clears it; the rest find it
-- empty. A failed call is only a warning.
create or replace function public.send_request_notifications() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  events jsonb := nullif(current_setting('pto.notify_events', true), '')::jsonb;
  settings notification_settings;
begin
  if events is null then
    return null;
  end if;
  perform set_config('pto.notify_events', '', true);
  select * into settings from notification_settings where id;
  if not found then
    return null;
  end if;
  begin
    -- Sending to every approver over SMTP, one at a time, can take tens of seconds; the edge
    -- worker itself times out at 60s, so this stays just under that to let net._http_response
    -- show the real result instead of a timeout pg_net invented.
    perform net.http_post(
      url := settings.function_url,
      body := jsonb_build_object('events', events),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', settings.secret),
      timeout_milliseconds := 55000);
  exception when others then
    raise warning 'Request notifications were not sent: %', sqlerrm;
  end;
  return null;
end$$;

-- settle_request (two_stamp_approval.sql) only ever moves pending to approved and never touches
-- team_stamp_by/god_stamp_by itself, so settling a request at commit queues no event here.
drop trigger if exists requests_send_notifications on public.requests;
create constraint trigger requests_send_notifications
after insert or update on public.requests
deferrable initially deferred
for each row execute function public.send_request_notifications();

-- Internal only. Live default privileges grant new functions to authenticated, so revoke explicitly.
revoke execute on function public.queue_request_notification(jsonb) from public;
revoke execute on function public.collect_request_notifications() from public;
revoke execute on function public.send_request_notifications() from public;
revoke execute on function public.queue_request_notification(jsonb) from authenticated;
revoke execute on function public.collect_request_notifications() from authenticated;
revoke execute on function public.send_request_notifications() from authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public.queue_request_notification(jsonb) from anon';
    execute 'revoke execute on function public.collect_request_notifications() from anon';
    execute 'revoke execute on function public.send_request_notifications() from anon';
  end if;
end$$;

commit;
