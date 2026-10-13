# Backend setup

The migration reconstructs the frontend's expected contract for a new Supabase project. It does not recover the deployed database implementation, and has not been applied to the live app.

1. Apply `migrations/202609080001_recovered_contract.sql` to an empty Supabase project using the SQL editor or the Supabase migration workflow.
2. Create the first confirmed authentication user in Supabase Auth. Insert a matching profile with that user's UUID, name, email, `org_role = 'god_admin'`, `is_active = true`, and `password_setup_required = false`. Use a securely chosen password for this bootstrap account.
3. Configure the frontend's public URL/key. Sign in and create PTO types, teams, holidays, and request rules in Settings.
4. Deploy the `employee-access` Edge Function for employee creation and temporary-password resets. It uses the server-provided `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; set `APP_ORIGIN` to the frontend origin. Keep service-role credentials out of the frontend. Its authorization checks run against the authenticated caller before administrative Auth operations.
5. Provision employees and grants, then exercise employee and manager (team `admin`) roles in staging before rollout.

Example first profile (replace values with the Auth user's actual details):

```sql
insert into public.profiles (id, name, email, org_role, is_active, password_setup_required)
values ('00000000-0000-0000-0000-000000000000', 'Your name', 'you@example.com', 'god_admin', true, false);
```

The model uses profiles, teams, team memberships, PTO types, annual grants, holidays, date rules, blackouts, requests, request lines, and audit entries. Active employees can read the shared roster/configuration, but request details and grants are scoped to their owner or managers. Request writes use validated RPCs; approval checks reject self-approval and stale decisions. The coverage RPC returns aggregate counts. Request validation checks schedules, holidays, overlaps, balances, windows, blackouts, and year boundaries.

New employee provisioning initializes grants for the current year from each active type's default. There is no automatic annual grant rollover job in this bootstrap. Administrators must provision the next year's grants using `set_pto_grant` or an audited annual process. Existing users also need explicit grants when new PTO types are added.

The PostgreSQL tests use PGlite with a minimal Supabase Auth stub. They verify migration execution and access/mutation behavior; they do not emulate hosted Auth, email delivery, or deployed Edge Function execution. The Edge Function must be validated against a staging Supabase project. No production data is included in this repository.

## Role names

The app shows friendlier names for the stored roles. They are the same roles; only the labels differ.

| Stored value | Shown as |
| --- | --- |
| `god_admin` (`profiles.org_role`) | HR |
| `admin` (`team_memberships.role`) | Manager |
| `employee` | Employee |

Only the labels changed, on 2026-09-28. SQL names such as `is_god_admin()` and the `god_*`/`team_*` stamp columns keep the old names, and some database error text still says "god admin"; the frontend rewords it to HR when it shows the message.

## Wellness day requests (removed)

`migrations/202610130001_remove_wellness_requests.sql` removes the feature described below. It deletes the top-up requests, which on 2026-10-13 were only cancelled or denied ones; a guard stops it if any are pending or approved. It drops the trigger, the three functions, the request columns and `pto_types.is_wellness`, and rewrites `grant_amount()` without the top-up subtraction. Wellness Day stays an ordinary leave type. `202610130001_remove_wellness_requests_rollback.sql` brings the feature back, but not the deleted requests. After the removal, `202609280002_leave_year_reset.sql` can no longer be re-run as a whole.

`migrations/202609140001_wellness_day_requests.sql` let employees ask for extra wellness days. It adds `pto_types.is_wellness` (one type, backfilled from the name `Wellness…`), request columns `kind`, `grant_type_id`, `grant_days` and `grant_year`, and the RPCs `submit_wellness_request(days, note)` and `decide_wellness_request(id, approve, reason)`. A trigger on `requests.status` adds the days to that person's grant on approval and removes them when the approval is undone, refusing the undo if the days are already booked. The migration only adds objects and replaces no existing function. Its only helper is `is_god_admin()`; the approver and active-account checks are inlined, so it runs on the deployed schema. The Wellness Day button stays hidden until a type is flagged `is_wellness`.

`migrations/202609140002_holiday_day_off.sql` stops treating holidays as free days. Each holiday instead opens a window, from the holiday through 30 days after it, in which a person can book one working day against it through `submit_holiday_day_off`. It adds the hidden `pto_types.is_holiday_day_off` type and `request_lines.holiday_id`/`holiday_name`. Triggers keep renamed holiday names in sync and block approval of a booking whose holiday was deleted or moved.

`migrations/202609150001_submit_requests.sql` adds `submit_requests`. It saves each time off from the request form as its own request, all in one transaction, and reuses `submit_request` and `submit_holiday_day_off` for the checks.

## Request notification emails

`migrations/202610130002_request_notifications.sql` reports every submit and decision on `requests` to the `notify` Edge Function in one `pg_net` call per transaction, at commit. The function (`functions/notify/`) emails the requester's Managers and all HR about new requests, and emails the requester when someone approves, denies, takes back an approval or undoes a denial. Who gets what is decided in `plan.ts`; the markup is in `email.ts`; `send.ts` is the only file that knows the mail provider (Gmail SMTP for now).

Configuration:

- Function environment (server `.env` and the `functions` service in `docker-compose.yml`): `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM_NAME`, `APP_URL`, `NOTIFY_SECRET`. Changing the Google account password revokes the App Password.
- `NOTIFY_HR_IDS` (optional, same two places): comma-separated `profiles.id` UUIDs. Unset or empty → every active HR user gets new-request emails, as before. Set → only the listed HR users get them; a Manager is unaffected either way, including an HR user who also manages the requester's team.
- `NOTIFY_TEST_TO` (optional, same two places): one email address. Unset → emails go to their real recipients. Set → every planned email (not the `samples_to` check below) is redirected to that address instead, one per original email, with `[Test] ` on the subject and a banner naming who it would really have gone to.
- Database: one row in `notification_settings` with the function URL (`http://functions:9000/notify` inside the Docker network) and the same `NOTIFY_SECRET`. No row, no calls: deleting it is the off switch.
- Checking the design: `POST /notify` with `{"samples_to": "you@example.com"}` and the secret header sends one of each email to that address.

Email is best-effort: a failed call is a warning in the database log and never undoes the action; send failures are in the edge-functions container log.

Maintenance: any bulk `update` of `requests.status` or the stamp columns, while the `notification_settings` row exists, emails everyone it touches. Before running one, delete the `notification_settings` row (or `alter table public.requests disable trigger requests_collect_notifications` inside the same maintenance transaction), and restore it (or re-`enable trigger`) afterwards.
