# Seal stamps on request cards

## Problem

The two approval slots render as 36–44px initials circles tucked into the
bottom action row of an approval card, beside the Deny button. They read as
avatars rather than approvals, they are easy to miss, and every click — even
stamping your own empty slot — opens a confirmation modal. Who pressed a stamp
is only discoverable through a native `title` tooltip.

## Goals

1. The stamps look like round rubber seals, and they are big enough to be the
   first thing you see on the card.
2. They sit on the right of the card, level with the requester's name.
3. A click acts. A second click undoes. No confirmation dialog.
4. One exception: a god admin touching somebody else's stamp still confirms.
5. Hovering a seal tells you who pressed it and when.

## Non-goals

- No change to the approval rules themselves (`canStampSlot`,
  `canUnstampSlot`, `isOverrideStamp` keep their current semantics).
- No change to deny, to the bulk-approve flow, or to the data layer.

## Seal artwork

One presentational `Seal` component, a 100×100 `viewBox` scaled by a `size`
prop: **84px** on approval cards, **60px** on request cards, the detail modal
and the approvals table row. Shared artwork means one visual language
everywhere.

Composition, outside in: a scalloped outer edge, a ring of small stars, twin
inner rings, then the face.

| Face element | Content |
| --- | --- |
| Curved top text (`textPath`) | `TEAM ADMIN` / `GOD ADMIN` |
| Centre | approver's initials, bold |
| Curved bottom text | stamp date, e.g. `SEP 18` |

The two text arcs sit at different radii — the upper one at 33.5, the lower at
40.5 — because glyphs grow away from the baseline on the top arc and towards
the centre on the (anticlockwise) lower one. Both then land inside the band
between the inner and outer rings.

The curved band text only appears at 84px and up; below that it renders under
8px and stops being readable, so the compact seal drops it and takes a
`TEAM` / `GOD` caption underneath instead. The big seal names its own slot, so
it carries no caption.

States keep the app's existing status colors rather than the reference image's
navy, so green still means granted everywhere in the product:

| State | Treatment |
| --- | --- |
| `stamped` | green ink, full scalloped seal |
| `override` | amber ink, bolt badge notched into the lower right |
| `denied` | red ink, diagonal `DENIED` banner across the face |
| `waiting` | grey dashed single ring, no scallops, faint centre tick, `WAITING` along the bottom |
| `na` | grey dashed ring, centre ✕, `N/A` along the bottom |

Granted seals are rotated — team −6°, god +5° — so they read hand-pressed.
Placeholders sit square. A seal that appears already pressed plays a 220ms
scale-down-and-settle once, so the act of stamping is visible without a toast
being the only feedback.

## Interaction

All branching lives in one pure helper so it can be tested without a DOM:

```
stampAction(me, request, slot, users) -> null | { mode, needsConfirm }
```

`mode` is `"stamp"` or `"remove"`. `needsConfirm` is true only when the actor
is reaching into someone else's slot.

| Actor and action | Result |
| --- | --- |
| Stamp an empty slot you own | immediate, success toast |
| Remove your own stamp | immediate, info toast |
| God admin, own god slot, either direction | immediate |
| God admin stamps an empty team slot | immediate; toast says "in the team admin's place" |
| God admin clicks their own override | immediate — it comes off like any stamp of theirs |
| God admin clicks a team admin's stamp | **confirm dialog**, then it comes off |
| God admin clicks another god admin's stamp | **confirm dialog**, then it comes off |

`needsConfirm` reduces to one condition: the slot already holds a stamp that
*somebody else* pressed. Your own slot, your own stamp and any empty slot act
on the click.

### Nothing is stamped over

A click on a seal that is already pressed means exactly one thing, whoever you
are: take it off. `canStampSlot` therefore refuses any slot that already holds
a stamp — including for a God Admin, who used to be allowed through and so
found their own override un-clickable, because the click was read as a request
to re-stamp it.

An override is consequently only ever pressed into an **empty** team slot: it
is a God Admin standing in for a team admin, which is why `isOverrideStamp`
reduces to "is this God Admin not a team admin for this person". A God Admin
who does run the requester's team fills that slot as the team admin, with no
override mark.

Every dialog therefore has one action — *Take their stamp off*, or *Take the
denial back* — and `stampAction` has no `canRemove`, because there is never a
second thing the click could have meant.

One consequence: `team_stamp_override_of` can no longer be written, since an
override never replaces anything. The column and the "Overrode <name>" copy are
kept for rows that already have it.

A click somebody is **not** allowed to make is not ignored. Every seal is a
button for every viewer; when there is no action available,
`stampBlockedReason` says why in the app's usual bottom-right toast — "Only a
God Admin can fill the GOD slot.", "You can't stamp your own request." — and
the same sentence is the closing line of the hover card.

While a stamp request is in flight the seal dims and ignores clicks.

## Hover

A new shared `src/components/ui/Tooltip.jsx`: a 120ms-delay popover that opens
on pointer hover **and** keyboard focus, and closes on pointer leave, blur,
Escape or scroll. It is fixed-positioned against the trigger's bounding box so
it is not clipped by the card.

Contents for a pressed seal: the approver's name in bold, their role, the full
timestamp, and for an override the line "overrode <name>'s stamp". For an empty
slot: "Waiting on a team admin", plus "Click to stamp" when the viewer can act.

The existing `aria-label` summary from `slotSummary` stays on the button for
screen readers; the tooltip is wired with `aria-describedby`.

## Layout

- **`ApprovalCard` and `WellnessApprovalCard`** — `StampSlots` moves out of the
  bottom action row into a right rail inside the header row, level with the
  name. `Submitted 2d ago` moves down beside the team pills to clear the
  corner. The bottom row keeps Deny alone. Below the `sm` breakpoint the rail
  wraps to full width and left-aligns.
- **`RequestCard`, `RequestDetailModal`, `Approvals` table row** — unchanged
  positions, rendering the same component at `size="sm"`.

## Testing

`stampAction` is new pure logic and nothing currently covers the stamp
helpers, so it gets unit tests first, in `tests/frontend.test.mjs`:

- an admin on a team member's empty team slot → `{stamp, needsConfirm: false}`
- the same admin on their own stamp, window open → `{remove, needsConfirm: false}`
- a god admin on their own empty god slot → `{stamp, needsConfirm: false}`
- a god admin on an empty team slot → `{stamp, needsConfirm: false}`
- a god admin on a team admin's stamp → `{remove, needsConfirm: true}`
- a god admin clearing another god admin's stamp → `{remove, needsConfirm: true}`
- a god admin on their own override → `{remove, needsConfirm: false}`
- a god admin who runs the team, on an empty team slot → `{stamp, override: false}`
- the requester on their own request → `null`

`slotState` gets a test that a viewer whose roster holds one person still reads
the stamper's name and role off the row, and that a pending slot is never
called an X from that roster. `stampBlockedReason` gets one assertion per
refusal. On the database side, `tests/database.test.mjs` applies the new
migration and asserts that an employee, their team admin and a god admin are
handed byte-identical facts for the same request — the regression that started
this — and that an unrelated employee gets no rows at all.

`npm run check` must stay clean, since it fails on any unbound identifier in a
`.jsx` file.

## The seals have to read the same for every role

Live RLS on `profiles` is

```
(id = auth.uid() or is_god_admin() or is_admin_for_user(id))
```

so the roster a viewer can read is not the organisation: a team admin sees
their own teams, an employee sees only themselves, and God Admins are
invisible to both. Two things were being inferred from that partial roster,
and so came out differently for each role:

- **whether anybody can fill a slot.** A team admin was told "no other god
  admin can approve this one" while a God Admin plainly existed, because none
  was visible to them.
- **the name behind a stamp,** which fell back to "Someone" for anybody the
  viewer cannot read — including, for an employee, everyone who approved their
  own time off.

Neither is the viewer's question to answer. `202609180004_stamp_visibility.sql`
adds `request_stamp_facts(p_request_id default null)`, a `security definer`
function returning, per request, `team_na_now`, `god_na_now`, the stamper names
and their display roles, and the decider's name. Rows are restricted to the
requests the caller can already read — the same condition as `requests_read`,
with `is_admin_for_user()` inlined so the file also runs on this repo's
bootstrap, where that helper does not exist — so it exposes no new request,
only the names of people who acted on requests the caller can already see.

On the client:

- `applyStampFacts(requests, factRows)` merges the facts onto the mapped rows.
  It is a separate step rather than a second argument to `mapRequest`, because
  most reads call that through `.map()`, where a second argument is the index.
- `slotState` takes `naNow` while pending and the frozen `na` once decided, and
  **never** recomputes either from the roster. With neither, a slot reads as
  waiting; an X is never guessed.
- `canStampSlot` and `isOverrideStamp` follow the same rule, so
  `hasTeamApprover`/`hasGodApprover` are gone from the client — the SQL
  functions of those names remain the only source of truth.
- Names come from the row first (`stamperName`, `stamperRole`), with the
  catalog as a fallback for rows fetched before the migration landed. The same
  applies to "Approved by …" on request cards, the detail modal and the
  approvals history row.
- The RPC failing is swallowed, so the frontend runs before the migration is
  applied — the cards simply show waiting slots and unnamed stamps.

Six reads carry the facts: `getRequests`, `requestById`, `requestsForUser`,
`pendingForApprover`, `recentDecisionsBy` and `decisionHistory`. The reads that
only do balance and coverage arithmetic do not.

## Taking a denial back

This was a rule, and it went missing between three versions of it:

| Where | Rule |
| --- | --- |
| This repo's `recovered_contract` bootstrap | `undo_decision()` accepted `status in ('approved','denied')` — an admin who managed the requester could undo either within 24 hours |
| The deployed database | `undo_decision()` accepts `'approved'` only: *"Only an approval can be undone"* |
| After `202609180001_two_stamp_approval` | `undo_decision()` revoked from `authenticated` altogether, because one call must never grant a request |

Nothing replaced the denial path, so a denial became permanent:
`unstamp_request()` refuses any status but `pending` and `approved`, and
`deny_request()` only acts on `pending`. Undoing an *approval* survived,
because that is now done by taking a stamp off.

`202609180005_undo_denial.sql` puts the denial path back, through
`unstamp_request()` rather than a separate procedure — on the card the two are
the same gesture, a click on the seal in that slot, so they answer to the same
rule:

> the admin who did it, while the window is open, or any god admin at any time.

### The window

It used to be 24 hours from the decision, which is the wrong clock: it could
close while the time off was still weeks away, and stay open after the leave
had already begun. It now closes when the time off begins — a decision can be
changed right up to the day before the first requested day, and not once that
day has arrived. `decision_window_open(request_id)` is
`min(start_date) > current_date`, mirrored on the client as
`decisionWindowOpen`.

This applies to **both** actions the function guards: taking a denial back and
taking a stamp off. One clock, so the seal behaves the same whichever state it
is in.

A wellness grant has no dated lines, so it has no such moment and its window
never closes — `coalesce(..., true)`. What bounds it instead already existed:
the `requests_apply_wellness_grant` trigger refuses to pull a grant back below
the days already booked against it (`current_amount - grant_days <
booked_days`), so the balance cannot go negative however late the undo comes.

God admins still bypass the window, as they already bypassed the 24 hours. That
is unchanged, not a decision taken here.

`undo_decision()` is not resurrected. The migration also adds
`undone_by`/`undone_at` with `if not exists`: the deployed database already has
them and uses them, this repo's bootstrap has `request_audit` instead, and
adding them lets one file run on both while keeping the live audit trail.

Lifting a denial clears `denied_slot`, `denial_reason` and the decision, thaws
the frozen X flags, and then calls `settle_request()` — the stamps a denial did
not touch are still there, so the request settles on today's facts and may
grant itself again immediately. Only the slot the denial came from can lift it;
the other seal never settled.

On the card: `canLiftDenial` carries the rule, `canUnstampSlot` routes a denied
request to it, and `stampAction` reports `{mode: "remove"}` so the red seal
behaves like any other — a click from the admin who denied it acts straight
away, and a god admin reaching into somebody else's denial gets the confirm
dialog. That dialog quotes the reason it is about to discard. A click that is
not allowed explains itself in the toast: "The time off has already started, so
this denial can't be taken back.", "Only Sarah or a God Admin can take this
denial back.", "This request was denied, so this slot never settled."

## Constraint: the stylesheet is frozen

`src/index.css` is checked-in *compiled* Tailwind output — it has no
`@tailwind` directives, so the PostCSS pass injects nothing and any class that
is not already in the file silently does nothing. Every class the new
components use has to be one the file already contains, which rules out
`z-[70]`, `max-w-[15rem]`, `-translate-y-full`, `hover:scale-[1.06]`,
`p-[2px]` and `sm:items-start`. Where no existing class fits, the rule goes in
a `style` attribute instead: that is why the tooltip does its
`translate(-50%, -100%)` inline.
