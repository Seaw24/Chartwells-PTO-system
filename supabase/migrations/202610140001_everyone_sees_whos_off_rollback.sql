-- Removes the everyone-sees-who's-off reads. Nothing else depends on them in the database.
begin;
drop function if exists public.who_is_off();
drop function if exists public.team_directory();
commit;
