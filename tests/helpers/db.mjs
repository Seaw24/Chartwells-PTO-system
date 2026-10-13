import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";

// Every migration, in the order they run on the deployed database.
export const MIGRATIONS = [
  "202609080001_recovered_contract.sql",
  "202609140001_wellness_day_requests.sql",
  "202609140002_holiday_day_off.sql",
  "202609150001_submit_requests.sql",
  "202609180001_two_stamp_approval.sql",
  // Only needed on the deployed database, but it replaces manages_team/manages_person here too,
  // which is how we know the rewritten bodies answer the same as the bootstrap's.
  "202609180003_employee_access_helpers.sql",
  "202609180004_stamp_visibility.sql",
  "202609180005_undo_denial.sql",
  "202609280001_hr_booking.sql",
  "202609280002_leave_year_reset.sql",
  "202610130001_remove_wellness_requests.sql",
  "202610130002_request_notifications.sql",
];

// Supabase Auth, reduced to what the migrations use.
const AUTH_STUB = `create schema auth;create table auth.users(id uuid primary key);create role authenticated;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`;

// pg_net's http_post with its real signature. Calls are recorded in net.calls instead of sent.
export const NET_HTTP_POST_STUB = `create or replace function net.http_post(url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb, headers jsonb default '{"Content-Type": "application/json"}'::jsonb, timeout_milliseconds integer default 5000) returns bigint language sql as $$insert into net.calls(url, body, headers) values (http_post.url, http_post.body, http_post.headers) returning id$$;`;

// The same signature, failing the way an unreachable pg_net would.
export const NET_HTTP_POST_FAILING = `create or replace function net.http_post(url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb, headers jsonb default '{"Content-Type": "application/json"}'::jsonb, timeout_milliseconds integer default 5000) returns bigint language plpgsql as $$begin raise exception 'network down'; end$$;`;

const NET_STUB = `create schema net;create table net.calls(id bigint generated always as identity primary key, url text, body jsonb, headers jsonb);${NET_HTTP_POST_STUB}`;

export async function bootDatabase() {
  const db = new PGlite();
  await db.exec(AUTH_STUB + NET_STUB);
  for (const file of MIGRATIONS) {
    try {
      await db.exec(fs.readFileSync(`supabase/migrations/${file}`, "utf8"));
    } catch (error) {
      console.error(file, error.message, error.position);
      process.exit(1);
    }
  }
  return db;
}
