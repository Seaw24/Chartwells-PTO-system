# Request notification emails

## Goal

Email the right people when a time-off request moves:

1. **New request → approvers.** When someone submits time off, their Managers and HR get an email
   with a button that opens Approvals filtered to that person.
2. **Decision → requester.** When a Manager or HR approves, denies, or undoes a decision, the person
   who asked gets an email with a button that opens that request in My Requests.

Password reset, invite, and "HR booked this for you" emails are out of scope for this version.

## Behaviour

### New request → approvers

- **Recipients:** every active Manager (`team_memberships.role = 'admin'`) of a team the requester
  is in, plus every active HR user (`profiles.org_role = 'god_admin'`), all at the same time. Never
  the requester.
- **One email per submit.** A submit is one database transaction. Several time offs added in one
  request panel become several request rows, but each recipient gets one email.
- **Only requests still pending at commit notify.** HR bookings (`book_requests_for`) are approved
  before commit and send nothing. Requests settled on submit (nobody can stamp them) send nothing. A
  rolled-back submit sends nothing.
- Covers every submit path: time off and Holiday Day Off.

### Decision → requester

Detected from the change to the `requests` row, so every code path counts:

| Change on the row | Email to the requester |
| --- | --- |
| `team_stamp_by` null → set | **Approved** by {actor} as Manager (or as HR when `team_stamp_override`) |
| `god_stamp_by` null → set | **Approved** by {actor} as HR |
| `status` pending → denied | **Denied** by {actor} ({Manager/HR} from `denied_slot`), with the reason |
| a stamp set → null | **Approval taken back** by {actor}; the request is pending again |
| `status` denied → pending | **Denial undone** by {actor}; the request is pending again |

- For an approval, the email also says where the request stands, using its status when the email is
  built: "It's fully approved." or "It's now waiting on HR." / "…waiting on your manager."
- An HR override replacing an existing Manager stamp (stamp A → stamp B) sends nothing; the
  requester was already told the slot was approved.
- Changes to a request created in the same transaction send nothing. This keeps HR bookings
  (inserted, stamped and approved in one transaction) silent.
- A requester cancelling their own request sends nothing.
- One email per action. Approving three cards sends three emails.

## The emails

Shared:

- **From:** `Chartwells PTO <GMAIL_USER>` for now (the owner's Gmail, sent over Gmail SMTP with an
  App Password). Sending sits behind one small module so it can move to Resend or a dedicated account
  later by changing that module and the settings only.
- **Look:** matches the product (DESIGN.md): a navy header band with the product name, a light card
  body in Inter (system-font fallback), near-navy ink, and an ember `accent-strong` button with white
  text and the 9px `btn` radius. Status uses the product's success/danger tints and always pairs a
  word with the colour. Colours are the `src/index.css` light-theme tokens converted from OKLCH to
  hex, because email clients don't support OKLCH.
- **Renders well in Outlook desktop** (the company runs Microsoft 365), Outlook web, Gmail and iOS
  Mail: a table layout, inline styles, a "bulletproof" button (VML for Outlook), a 600px max width
  that shrinks on phones, and nothing that depends on images loading.
- Every email has a plain-text part with the same words and the link. All names and reasons are
  HTML-escaped.

New request (to approvers):

- **Subject:** `New time off request from {name}`
- **Preheader:** `{name} is waiting on your approval.`
- **Body:** "You got a time off request from **{name}**." and a button, "Review in Approvals".
- **Link:** `{APP_URL}/approvals?q={url-encoded name}`

Decision (to the requester):

- **Subject**, by event: `{actor} approved your time off` · `{actor} denied your time off` ·
  `{actor} took back their approval` · `{actor} undid the denial of your time off`
- **Body:** the headline sentence with the actor's role ("Sam Lee (Manager) approved your time
  off."), a one-line summary of the request so they know which one (for example "Vacation · Mon, Nov 2
  – Wed, Nov 4", "Holiday Day Off for Thanksgiving · Fri, Nov 27"), then the
  status sentence or the denial reason, and a button, "View request".
- **Link:** `{APP_URL}/requests?req={request id}`

## Link handling in the app

- `Approvals.jsx` reads `?q=` on load into its existing search state, the same way it already reads
  `?req=`, then removes the parameter from the URL. The name shows in the search box and can be
  cleared.
- `MyRequests.jsx` reads `?req=` on load and opens `RequestDetailModal` for that request (the pattern
  Approvals and Calendar already use), then removes the parameter.
- `AuthGuard` passes the attempted location to `/login`, and `Login.jsx` returns there after
  sign-in instead of always going to `/`. Only same-origin paths are accepted.
- An approver who opens the link after the requests were handled sees the normal filtered page.

## How it is wired

1. **Migration** `supabase/migrations/202610130001_request_notifications.sql` (+ rollback):
   - `AFTER INSERT` and `AFTER UPDATE` row triggers on `requests` append events to a
     transaction-local list: `{kind: 'submitted', request}` on insert, and the decision events from
     the table above on update, each with the acting user (`auth.uid()`).
   - A deferred constraint trigger (`initially deferred`) runs at commit. The first to fire takes
     the list, clears it, and makes one `net.http_post` call to the `notify` edge function with
     `{ events: [...] }`. Later firings in the same transaction find the list empty. A failing call
     is caught and logged as a warning, so it can never undo the action.
   - The database does no filtering. `pg_net` sends after commit, so the function sees the final
     state and applies the rules: it drops `submitted` events for requests no longer pending and
     decision events for requests created in the same batch. Keeping the rules in one pure module
     makes them unit-testable.
   - The function URL and shared secret are read from a private settings table (no browser access),
     so neither is hard-coded in the migration.
   - Re-runnable, and written for the deployed schema (`pg_net` 0.20.3 is installed there).
2. **Edge function** `supabase/functions/notify/`:
   - `index.ts` rejects calls without the shared secret (`NOTIFY_SECRET`; the function is reachable
     through CloudFront and `VERIFY_JWT` is off, so the secret is the only gate), re-loads the
     requests, lines, people and teams with the service role, and hands them to `plan.ts`. A
     `{ samples_to }` body sends one of each email to that address, for checking the design.
   - `plan.ts` turns events plus loaded rows into the list of emails (recipients, filtering, role
     wording, status sentence, request summary). Pure functions, no network.
   - `email.ts` builds subject, HTML and text for both kinds. Pure functions, no network.
   - `send.ts` sends over Gmail SMTP (`smtp.gmail.com:465`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`,
     `EMAIL_FROM_NAME`). `APP_URL` builds links. Gmail allows about 500 recipients a day.
3. **Failure:** email is best-effort. `pg_net` sends after commit, so a slow or failed email never
   blocks or undoes the action. The function logs errors. No retries.

## Testing

- Database tests (PGlite, existing harness, with a `net.http_post` stub):
  - no settings row → no call;
  - a submit with two time offs → one call carrying two `submitted` events;
  - a rolled-back submit → no call; a cancel → no call;
  - Manager stamp, HR stamp, deny, unstamp, undo denial → one call each with the right kind, slot
    and actor;
  - an override replacing a stamp → no call;
  - a failing `net.http_post` → the submit still succeeds.
- Unit tests for `plan.ts` and `email.ts`: recipients (Managers of the requester's teams + active HR,
  never the requester or inactive people), one email per approver per batch, dropping settled
  requests and HR bookings, subjects per event, role wording, status sentence, request summary,
  escaping, encoded links.
- Frontend: `?q=` fills the Approvals search; `/requests?req=` opens the pop-up; login returns to
  the requested path and refuses outside URLs.
- Before going live: real sends of each email to the owner's inbox, checked in Outlook and on a
  phone. The owner types the App Password at a prompt; it is never written to a file or shared.

## Deployment

Done over AWS Systems Manager on instance `i-0ab29bf3040dc6657`; the Supabase project is at
`/opt/chartwells/chartwells-supabase`. Each step is confirmed with the owner first.

1. Copy `notify/` into `volumes/functions/`.
2. Add `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM_NAME`, `APP_URL`, `NOTIFY_SECRET` to `.env`
   and to the `functions` service in `docker-compose.yml`, then recreate that container (a few
   seconds' downtime for `employee-access`). The owner enters the App Password themselves.
3. Apply the migration with `psql` in `supabase-db`, and store the function URL and secret in the
   settings table.
4. Build and deploy the frontend (S3 + CloudFront invalidation).
