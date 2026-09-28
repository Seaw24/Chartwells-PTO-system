-- Read-only introspection of the live approval contract.
-- Run ONE part at a time in the Studio SQL editor and paste each result back.
-- Nothing is modified; no employee data is read (schema, function source, policies only).

-- ============ PART 1: columns of the tables the approval flow touches ============
select table_name, column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('requests','request_lines','profiles','team_memberships')
order by table_name, ordinal_position;

-- ============ PART 2: constraints + triggers on requests ============
select rel.relname as tbl, c.conname as name, pg_get_constraintdef(c.oid) as def
from pg_constraint c
join pg_class rel on rel.oid = c.conrelid
join pg_namespace n on n.oid = rel.relnamespace
where n.nspname = 'public' and rel.relname in ('requests','request_lines')
union all
select c.relname, t.tgname, pg_get_triggerdef(t.oid)
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and not t.tgisinternal
order by 1, 2;

-- ============ PART 3: RLS policies ============
select tablename, policyname, cmd, roles::text, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- ============ PART 4: which functions exist, and who may execute them ============
select p.oid::regprocedure::text as func,
       p.prosecdef as security_definer,
       coalesce((select string_agg(distinct rp.grantee, ',')
                 from information_schema.routine_privileges rp
                 where rp.specific_schema = 'public'
                   and rp.routine_name = p.proname
                   and rp.grantee in ('anon','authenticated','service_role')), '-') as granted_to
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;

-- ============ PART 5: source of the approval functions, ONE ROW EACH ============
-- If a body is still truncated in the UI, run it again with a WHERE on a single name.
select p.proname, pg_get_functiondef(p.oid) as def
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('decide_request','decide_wellness_request','undo_decision','cancel_request',
                    'submit_request','submit_requests','submit_wellness_request','submit_holiday_day_off',
                    'assert_request_valid','is_god_admin','is_admin_for_user','is_team_admin',
                    'charged_days','is_working_day','pto_balance','pto_used')
order by p.proname;
