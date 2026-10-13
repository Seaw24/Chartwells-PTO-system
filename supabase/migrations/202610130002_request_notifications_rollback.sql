-- Removes request notification emails. Requests themselves are untouched.
begin;
drop trigger if exists requests_send_notifications on public.requests;
drop trigger if exists requests_collect_notifications on public.requests;
drop function if exists public.send_request_notifications();
drop function if exists public.collect_request_notifications();
drop function if exists public.queue_request_notification(jsonb);
drop table if exists public.notification_settings;
commit;
