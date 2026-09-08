# Backend setup

The migration reconstructs the frontend's expected contract for a new Supabase project. It does not recover the deployed database implementation, and has not been applied to the live app.

1. Apply `migrations/202609080001_recovered_contract.sql` to an empty Supabase project using the SQL editor or the Supabase migration workflow.
2. Create the first confirmed authentication user in Supabase Auth. Insert a matching profile with that user's UUID, name, email, `org_role = 'god_admin'`, `is_active = true`, and `password_setup_required = false`. Use a securely chosen password for this bootstrap account.
3. Configure the frontend's public URL/key. Sign in and create PTO types, teams, holidays, and request rules in Settings.
4. Deploy the `employee-access` Edge Function for employee creation and temporary-password resets. It uses the server-provided `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; set `APP_ORIGIN` to the frontend origin. Keep service-role credentials out of the frontend. Its authorization checks run against the authenticated caller before administrative Auth operations.
5. Provision employees and grants, then exercise employee and team-admin roles in staging before rollout.

Example first profile (replace values with the Auth user's actual details):

```sql
insert into public.profiles (id, name, email, org_role, is_active, password_setup_required)
values ('00000000-0000-0000-0000-000000000000', 'Your name', 'you@example.com', 'god_admin', true, false);
```

The model uses profiles, teams, team memberships, PTO types, annual grants, holidays, date rules, blackouts, requests, request lines, and audit entries. Active employees can read the shared roster/configuration, but request details and grants are scoped to their owner or managers. Request writes use validated RPCs; approval checks reject self-approval and stale decisions. The coverage RPC returns aggregate counts. Request validation checks schedules, holidays, overlaps, balances, windows, blackouts, and year boundaries.

New employee provisioning initializes grants for the current year from each active type's default. There is no automatic annual grant rollover job in this bootstrap. Administrators must provision the next year's grants using `set_pto_grant` or an audited annual process. Existing users also need explicit grants when new PTO types are added.

The PostgreSQL tests use PGlite with a minimal Supabase Auth stub. They verify migration execution and access/mutation behavior; they do not emulate hosted Auth, email delivery, or deployed Edge Function execution. The Edge Function must be validated against a staging Supabase project. No production data is included in this repository.
