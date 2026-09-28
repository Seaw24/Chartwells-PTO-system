-- Undoes 202609180004_stamp_visibility.sql. Nothing else calls either function, and no table or
-- column was touched, so dropping them is the whole rollback. The cards fall back to showing every
-- pending slot as waiting and any stamper the viewer cannot read as "Someone" — the behaviour
-- before the migration.
begin;

drop function if exists public.request_stamp_facts(uuid);
drop function if exists public.stamp_display_role(uuid);

commit;
