# HR role names and HR booking on someone's behalf

## Problem

1. The role names read as internal jargon. Staff call the operations lead "HR" and
   team admins "managers", but the app says "God Admin" and "Admin".
2. HR regularly has to put time off in for someone else, such as a sick call phoned
   in or a day an employee forgot to file. Today HR can't do that. The only way is
   for the employee to sign in and file it themselves, and then someone approves it.

## Goals

1. Everywhere a person can read a role, it says **HR** or **Manager**.
2. HR can book time off for any active employee from the normal request form. The
   booking is approved as soon as it is saved, and it carries HR's stamp.
3. HR can book past dates, such as a sick day entered after the fact.
4. HR can tell which requests were booked by HR. No one else sees that label.

## Non-goals

- The stored role values don't change. `profiles.org_role = 'god_admin'` and
  `team_memberships.role = 'admin'` stay, as do SQL names like `is_god_admin()`
  and the `god_*` / `team_*` stamp columns.
- HR bookings don't get a balance, blackout, window or overlap override. Past dates
  are the only rule HR can bypass.
- No Wellness Day booking on someone's behalf. The Wellness Day button stays
  self-only.
- No notifications. The app doesn't have any today.

## Part 1: Role names (display only)

| Stored value | Shown as | Stamp ring text | Slot label |
| --- | --- | --- | --- |
| `god_admin` (org role) | **HR** | `HR` | `HR` |
| `admin` (team membership role) | **Manager** | `MANAGER` | `MANAGER` |
| `employee` | Employee | n/a | n/a |

Surfaces to change:

- `ROLE_META` labels in `src/utils/constants.jsx`.
- `SLOT_RING_LABEL` and the "Waiting on / No other …" copy in `StampSlots.jsx`.
- `SLOT_LABEL` and the permission sentences in `requestHelpers.jsx`.
- Settings role toggles and pills.
- Any copy that says "god admin", "team admin" or "admin" meaning a role.

Code identifiers stay as they are, for example `isGodAdmin` and `canApprove`.

A few database error messages mention "God Admin". The frontend already rewrites
database errors in `src/utils/errors.jsx`, so those messages get rewritten there
and no SQL change is needed. New SQL in this work uses the new names.

**The two names must be documented as the same role**, so nobody later "fixes" the
mismatch or adds a second role:

- `PRODUCT.md`: the Users section reads "HR (stored as `god_admin`)" and
  "Manager (stored as team membership role `admin`)".
- `src/utils/constants.jsx`: a comment above `ROLE_META` states the mapping.
- `supabase/README.md`: a short "Role names" section with the same table.

## Part 2: HR books time off for someone

### Entry points

1. **The existing "New Request" button in the top bar.** There is no new button.
   For HR, the form gains a "Who is this for?" row. Non-HR users never see the row.
2. **"Book time off" on an employee's profile** (`EmployeeProfile.jsx`), shown to
   HR only. It opens the same form with that person already picked, through
   `openRequest({ forUserId })`.

### "Who is this for?" row

- It is the first row of the form. It shows an avatar and a name, defaults to
  **You** (HR's own account), and has a "Change" affordance.
- Clicking it opens a person picker (a new `BookForPicker`, built in the same style
  as `PersonPicker` but without an "All people" option). It contains:
  - A search box that is focused on open and matches name and team name. Enter
    picks the first match, and Escape closes.
  - **Recent**: the last 4 people this HR user booked for, most recent first,
    kept in `localStorage` per viewer. It is hidden when empty or while searching.
  - **Everyone**: all active people except HR themselves, grouped by team and
    alphabetical within each team. People with no team go under "No team".
    Inactive people are left out: you can't
    book for them.
  - A "You" option at the top, to switch back.
- The picker is a popover on desktop. On a phone it fills the modal's width, since
  the modal is already full-width at that size.

### When someone else is picked

The form re-keys everything that currently comes from the signed-in user's id to
the picked person:

- balances, grants and normal days off
- existing requests, used for overlap checks
- the holiday cards the person has left
- team coverage and teammate conflicts, using the picked person's team

Changing the person resets the draft lines, because a draft built on one person's
balances isn't valid for another.

The copy changes to make the outcome clear:

- **Banner** under the row: "Booking for **Maria Lopez** · Kitchen. It will be
  approved right away with your HR stamp."
- **Date picker** allows past dates (`allowPast`), and client validation skips the
  "Start date is in the past" check.
- **Note label**: "Note for your approver" becomes "Note (Maria will see this)".
- **Submit button**: "Submit request" becomes **"Book & approve"**.
- **Success toast**: "Booked for Maria. It's approved."
- **Errors** name the person: "Maria already has a request that overlaps these
  dates", not "You already have …".

If the form is closed and reopened from the top bar, the person resets to **You**.

### How the booked request looks afterwards

- Both seals are pressed by the HR user. If the person has a manager, the manager
  seal is an HR override, exactly as when HR stamps a manager slot today. If they
  have no manager, that slot shows the usual X.
- **HR only:** a line "Booked by Dana Smith (HR)" appears on the request card and
  in the detail modal. The requester and their manager don't see this line. For
  them it looks like any other approved request, with HR's stamps on it.
- Undo follows the existing rules. HR can take either stamp off, which puts the
  request back to pending. Nothing new is added here.

## Part 3: Database (one new migration)

`supabase/migrations/202609280001_hr_booking.sql`, with a matching `_rollback.sql`.
The migration is additive and re-runnable. It must run on the live schema **and**
on the recovered schema the PGlite tests build.

### Findings from live (read-only, 2026-09-28)

- All repo migrations through `202609180005_undo_denial` are applied.
- The live `submit_request(p_note, p_lines)` differs from the repo's recovered one:
  - It validates inline.
  - It uses `pto_balance()` and `leave_year_of()`.
  - Backdating is set per type with `allow_backdate` and reaches back to yesterday
    at most.
  - It checks only `is_active`, with no account-setup gate.
- The live `submit_holiday_day_off` refuses past start dates, and refuses anyone
  with `password_setup_required`.
- `settle_request` approves a request once both slots are stamped or X. The
  deferred `requests_settle_on_submit` trigger runs it when the transaction ends.

### Shape

The internal "as person" functions keep the rules in one place. Browser callers
can't reach them, so there is no impersonation and no session-variable trick.

1. **`hr_bookings(request_id, booked_by, booked_at)`**, a separate table. It is
   not a column on `requests`, because requesters and managers can read every column
   of the requests they can see. RLS is on and no browser role has any grant, so
   `book_requests_for` writes it and `request_stamp_facts` is the only way to read it.
2. **`submit_request_as(p_requester uuid, p_note text, p_lines jsonb, p_booked_by uuid)`**
   - Its body is the live `submit_request`, with `v_uid := p_requester`.
   - When `p_booked_by` is not null, the past-date check is skipped. Everything
     else still applies: window, blackout, overlap and balance.
   - Error text says the person's first name instead of "you".
   - It is revoked from `public`, `anon` and `authenticated`.
3. **`submit_request(p_note, p_lines)`** becomes a wrapper. It keeps the
   signed-in and active checks, then calls `submit_request_as(auth.uid(), …, null)`.
   Callers see no change in behaviour.
4. **`submit_holiday_day_off_as(p_requester, p_holiday_id, p_start, p_end, p_note, p_booked_by)`**
   - Its body is the live function's.
   - When booked by HR, it skips the setup gate and the past-date check. The
     person must still be active, and the holiday's 30-day window still applies.
   - It is revoked from browser roles. `submit_holiday_day_off(...)` becomes a
     wrapper.
5. **`submit_requests_as(p_requester, p_requests jsonb, p_booked_by)`** holds the
   existing loop from `submit_requests`, calling the two `_as` functions. It is
   revoked from browser roles, and `submit_requests(p_requests)` becomes a wrapper.
6. **`book_requests_for(p_requester uuid, p_requests jsonb) returns uuid[]`** is
   the only new function the browser can call. It:
   - checks `is_god_admin()` and refuses otherwise ("Only HR can book time off for
     someone else.");
   - refuses when `p_requester = auth.uid()` ("Use a normal request for your own
     time off.");
   - refuses when the person is missing or inactive;
   - calls `submit_requests_as(p_requester, p_requests, auth.uid())`;
   - then, for each new id, records it in `hr_bookings`, stamps the HR slot, and stamps the
     manager slot when `has_team_approver(p_requester)`. The manager stamp has
     `team_stamp_override = true` unless the HR user is a manager on one of the
     person's teams, which mirrors `stamp_request`.
   - It calls `settle_request` on each id straight away, rather than waiting for
     the deferred trigger, so a failure shows up in the call. Each request is
     approved with `decided_by` set to HR.
8. **`revalidate_request`** returns early for HR bookings. On live this changes
   nothing, because live has no `assert_request_valid()`. The recovered test
   schema's validator would otherwise refuse the past dates an HR booking allows.
7. **`request_stamp_facts`** gains a `booked_by_name` column. It is filled only
   when the caller is HR (`is_god_admin()`), and is null for everyone else, so the
   "Booked by" line is HR-only. Adding a column changes the return type, so the
   function is dropped and recreated. Its grants are re-applied.

**Running on both schemas.** The recovered schema has no `pto_balance`,
`pto_used`, `leave_year_of`, `year_start` or `year_end`. The migration creates
each one **only if it is missing** (checked with `to_regprocedure`). The bodies are
copied from live, so live is never touched and the tests run the same
`submit_request_as` that production does. This also brings the repo's copy of
`submit_request` in line with production.

### Rollback

- Restore `submit_request`, `submit_holiday_day_off`, `submit_requests` and
  `revalidate_request` to their live bodies, which are saved in the rollback file.
- Drop `book_requests_for` and the three `_as` functions.
- Recreate `request_stamp_facts` without `booked_by_name`.
- Drop the `hr_bookings` table. Requests HR already booked stay approved; only
  the "booked by HR" marker is lost.

## Frontend data flow

- `supabaseDataSource.bookRequestsFor(personId, items)` calls
  `rpc("book_requests_for", …)`, using the same item shape as `submitRequest`.
- The stamp-facts mapper reads `booked_by_name`. `mapRequest` doesn't change.
- `tests/fixture-server.mjs` gets a `book_requests_for` handler, so fixture mode
  still works for tests. The fixture is never used for hosting.
- `RequestForm` takes the target person as state, initialised from
  `prefill.forUserId`, falling back to the current user. Every query key that holds
  the user id uses the target's id, so the cache doesn't mix two people.

## Testing

- **Database (PGlite)**:
  - HR books a future request, and it is approved with both stamps.
  - HR books a past date and it succeeds, while the same past date filed by the
    employee is refused.
  - A non-HR caller is refused.
  - HR booking for themselves is refused.
  - Booking for an inactive person is refused.
  - Booking past the person's balance is refused, and the error names the person.
  - HR books a Holiday Day Off for someone who hasn't finished account setup.
  - The browser role can't execute the `_as` functions.
  - `request_stamp_facts` returns `booked_by_name` to HR, and null to the requester
    and their manager.
  - Existing `submit_requests` tests still pass unchanged.
- **Frontend**:
  - Source checks for the role labels: no user-visible "God Admin" is left.
  - Form tests: the "Who is this for?" row is HR-only; picking a person swaps the
    balance source; the submit label and banner change.
- **Manual, before release**: `pnpm build`, then run the flow locally against the
  real backend after the migration has been applied in Studio.

## Rollout order

1. The user reviews the SQL, then applies `202609280001_hr_booking.sql` in Studio.
2. Deploy the frontend, following the AWS frontend deploy steps.

The new frontend calls `book_requests_for`, so the migration has to go first. The
old frontend keeps working after the migration, because the public function
signatures don't change.
