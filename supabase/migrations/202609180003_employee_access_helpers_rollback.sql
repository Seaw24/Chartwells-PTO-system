-- Undo 202609180003_employee_access_helpers.sql by removing the two helpers again. The Edge
-- Function's reset action and team-admin employee creation go back to failing, which is where the
-- deployed database stood before.
--
-- Run this against the deployed database only. On this repo's bootstrap
-- (202609080001_recovered_contract.sql) manages_team() and manages_person() are load-bearing —
-- decide_request(), undo_decision(), set_pto_grant() and others call them — so dropping them there
-- would take the contract with it.
begin;

drop function if exists public.manages_person(uuid);
drop function if exists public.manages_team(uuid);

commit;
