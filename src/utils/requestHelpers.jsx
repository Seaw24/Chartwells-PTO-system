import { rangesOverlap } from "./dateHelpers.jsx";
import { DEFAULT_NORMAL_DAYS_OFF } from "./constants.jsx";
import { firstName } from "./constants.jsx";
import { businessDays } from "./dateHelpers.jsx";
import { toDateLocal } from "./dateHelpers.jsx";
import { toISO } from "./dateHelpers.jsx";
import { formatDateRange } from "./dateHelpers.jsx";
export function requestLines(e = {}) {
  return Array.isArray(e.lines) && e.lines.length > 0
    ? e.lines
    : e.type || e.start || e.end
      ? [
          {
            type: e.type || "",
            start: e.start || "",
            end: e.end || "",
          },
        ]
      : [];
}
// Wellness grant requests add days to a balance and have no dated lines.
export const isWellnessGrant = (e) =>
  (e == null ? void 0 : e.kind) === "wellness_grant";
export function requestPrimaryTypeId(e) {
  var t;
  return isWellnessGrant(e)
    ? e.grantTypeId
    : (t = requestLines(e)[0]) == null
      ? void 0
      : t.type;
}
export function requestStart(e) {
  const t = requestLines(e)
    .map((n) => n.start)
    .filter(Boolean);
  return t.length ? t.sort()[0] : "";
}
export function requestEnd(e) {
  const t = requestLines(e)
    .map((n) => n.end)
    .filter(Boolean);
  return t.length ? t.sort().at(-1) : "";
}
export function requestOverlaps(e, t, n) {
  return requestLines(e).some(
    (r) => r.start && r.end && rangesOverlap(t, n, r.start, r.end),
  );
}
export function requestIncludesDay(e, t) {
  return requestOverlaps(e, t, t);
}
export function lineDays(e, t = DEFAULT_NORMAL_DAYS_OFF) {
  return businessDays(e.start, e.end, t);
}
export function requestDays(e, t = DEFAULT_NORMAL_DAYS_OFF) {
  return requestLines(e).reduce((r, s) => r + lineDays(s, t), 0);
}
export function requestTypeIds(e) {
  if (isWellnessGrant(e)) return e.grantTypeId ? [e.grantTypeId] : [];
  return Array.from(
    new Set(
      requestLines(e)
        .map((t) => t.type)
        .filter(Boolean),
    ),
  );
}
export function lineEntriesForRequest(e) {
  return requestLines(e).map((t, n) => ({
    ...e,
    requestId: e.id,
    lineIndex: n,
    line: t,
    lineKey: `${e.id}:${n}`,
    type: t.type,
    start: t.start,
    end: t.end,
  }));
}
export function bookedDaysByDate(e = []) {
  const t = {};
  return (
    e
      .filter((n) => ["approved", "pending"].includes(n.status))
      .flatMap(lineEntriesForRequest)
      .forEach((n) => {
        let r = toDateLocal(n.start);
        const s = toDateLocal(n.end);
        for (; r <= s;) {
          const i = toISO(r);
          ((!t[i] || n.status === "approved") &&
            (t[i] = {
              status: n.status,
              typeId: n.type,
            }),
            (r = new Date(r.getTime() + 864e5)));
        }
      }),
    t
  );
}
export function requestRangeLabel(e) {
  if (isWellnessGrant(e))
    return `+${e.grantDays} day${e.grantDays === 1 ? "" : "s"} to balance`;
  const t = requestLines(e);
  return t.length === 0
    ? ""
    : t.length === 1
      ? formatDateRange(t[0].start, t[0].end)
      : `${formatDateRange(requestStart(e), requestEnd(e))} (${t.length} lines)`;
}
export function requestTypeLabel(e, t = []) {
  var r;
  if (isWellnessGrant(e)) return "Wellness day request";
  const n = requestTypeIds(e),
    // A Holiday Day Off reads as the holiday it was booked for.
    holidayName = requestLines(e).find((s) => s.holidayName)?.holidayName;
  return n.length === 0
    ? "PTO"
    : n.length === 1
      ? holidayName ||
        ((r = t.find((s) => s.id === n[0])) == null ? void 0 : r.name) ||
        "PTO"
      : `${n.length} PTO types`;
}
// --- Two-stamp approval -----------------------------------------------------
// The two slots, named. Lives here so the copy for a blocked click reads the same as the seal.
export const SLOT_LABEL = { team: "TEAM", god: "GOD" };
// Every request carries a TEAM slot and a GOD slot and is granted once both settle. A slot nobody
// can fill is an X: while a request is pending that is recomputed from the current roster, and the
// database freezes it onto the row once the request is decided.
const sharesTeamAsAdmin = (e, t) => {
  const n = new Set((t?.memberships ?? []).map((r) => r.teamId));
  return (e?.memberships ?? []).some(
    (r) => r.role === "admin" && n.has(r.teamId),
  );
};
// Whether anybody at all can fill a slot is the server's answer, not something to recount from the
// roster this viewer happens to be allowed to read: has_team_approver()/has_god_approver() decide
// it, and the row carries the result as naNow while pending and na once decided.
const slotIsNa = (e, t) => {
  const n = (e?.stamps ?? {})[t] ?? {};
  return (e == null ? void 0 : e.status) === "pending"
    ? n.naNow === !0
    : !!n.na;
};
// One slot's state: denied, stamped, override, na (the X), or waiting.
export function slotState(e, t, n = []) {
  if (!e) return { state: "waiting" };
  const r = (e.stamps ?? {})[t] ?? {};
  // The names ride along with the state: the viewer's roster may not contain the person who
  // stamped, so whatever request_stamp_facts() put on the row has to survive this hop.
  if (e.deniedSlot === t)
    return {
      state: "denied",
      by: e.decidedBy,
      at: e.decidedAt,
      byName: e.decidedByName ?? null,
      byRole: null,
    };
  if (r.by)
    return {
      state: r.override ? "override" : "stamped",
      by: r.by,
      at: r.at,
      overrideOf: r.overrideOf ?? null,
      byName: r.byName ?? null,
      byRole: r.byRole ?? null,
      overrideOfName: r.overrideOfName ?? null,
    };
  // Whether anybody can fill this slot is a question about the whole organisation, and RLS shows
  // each viewer only part of it: an employee sees one profile, a team admin sees their teams. So a
  // pending slot takes the server's naNow, and a decided one the flag frozen onto the row. Without
  // either, a slot is waiting — an X is never guessed from a roster that may be incomplete.
  const a = e.status === "pending" ? r.naNow === !0 : r.na;
  return { state: a ? "na" : "waiting" };
}
export const requestStampSlots = (e, t = []) => ({
  team: slotState(e, "team", t),
  god: slotState(e, "god", t),
});
export function canStampSlot(e, t, n, r = []) {
  if (!e || !t || t.status !== "pending" || e.id === t.userId) return !1;
  // An X is already settled; nothing is stamped into it.
  if (slotIsNa(t, n)) return !1;
  // Nothing is ever stamped over: a slot that already holds one can only be taken off, so a click
  // on a pressed seal means exactly one thing whoever you are. A God Admin reaches the team slot
  // only while it is still empty, and that is what an override is.
  if (t.stamps?.[n]?.by) return !1;
  if (n === "god") return e.role === "god_admin";
  if (e.role === "god_admin") return !0;
  return (
    e.role === "admin" &&
    sharesTeamAsAdmin(
      e,
      r.find((i) => i.id === t.userId),
    )
  );
}
// A God Admin filling the empty team slot is standing in for a team admin — an override — unless
// they are a team admin for this person themselves, in which case it is simply their own stamp.
export const isOverrideStamp = (e, t, n = []) =>
  !!e &&
  e.role === "god_admin" &&
  !sharesTeamAsAdmin(
    e,
    n.find((s) => s.id === t.userId),
  );
// Is there still time for changing a decision to mean anything? Only until the first requested day
// arrives. A wellness grant has no dated lines and so no such moment; it stays open, bounded
// instead by the grant trigger that refuses to pull days back below the ones already booked.
// Mirrors decision_window_open() in 202609180005_undo_denial.sql.
export const decisionWindowOpen = (e) => {
  const t = requestLines(e)
    .map((n) => n.start)
    .filter(Boolean)
    .sort();
  return t.length === 0 || t[0] > toISO(new Date());
};
// A denial lives on the request rather than in a slot, so lifting it is not unstamping — but on the
// card it is the same gesture, a click on the seal that turned red, and it answers to the same
// rule: whoever did it, within a day, or any god admin. See 202609180005_undo_denial.sql.
export const canLiftDenial = (e, t, n) =>
  !!e &&
  !!t &&
  t.status === "denied" &&
  t.deniedSlot === n &&
  e.id !== t.userId &&
  (e.role === "god_admin" || (t.decidedBy === e.id && decisionWindowOpen(t)));
export const canUnstampSlot = (e, t, n, r = []) => {
  if (!e || !t) return !1;
  if (t.status === "denied") return canLiftDenial(e, t, n);
  if (!["pending", "approved"].includes(t.status)) return !1;
  const s = (t.stamps ?? {})[n] ?? {};
  if (!s.by) return !1;
  if (e.role === "god_admin") return !0;
  return s.by === e.id && decisionWindowOpen(t);
};
// What one click on a slot does. A click acts straight away; it only stops to ask when it would
// clobber a stamp somebody else pressed, which is the one case an admin cannot take back alone.
export function stampAction(e, t, n, r = []) {
  const s =
      t?.status === "denied" && t.deniedSlot === n
        ? (t.decidedBy ?? null)
        : (((t?.stamps ?? {})[n] ?? {}).by ?? null),
    i = !!s && s !== (e == null ? void 0 : e.id);
  if (canStampSlot(e, t, n, r))
    return {
      mode: "stamp",
      override: n === "team" && isOverrideStamp(e, t, r),
      needsConfirm: i,
    };
  if (canUnstampSlot(e, t, n, r))
    return { mode: "remove", override: !1, needsConfirm: i };
  return null;
}
// Why this viewer cannot touch this slot, in their own terms — null when they can. Everyone sees
// the same seals; this is the difference between them, said out loud on the card instead of left
// as a dead control.
export function stampBlockedReason(e, t, n, r = []) {
  if (stampAction(e, t, n, r)) return null;
  const s = SLOT_LABEL[n] ?? n,
    i = (t.stamps ?? {})[n] ?? {},
    o = r.find((c) => c.id === t.userId),
    a = firstName(o?.name) || "this person",
    d =
      firstName(t.decidedByName ?? r.find((c) => c.id === t.decidedBy)?.name) ||
      "the admin who denied it";
  if (!e) return "Sign in to approve requests.";
  if (e.id === t.userId) return "You can't stamp your own request.";
  // The seal that denied it can be lifted; anything else on a denied request cannot.
  if (t.status === "denied")
    return t.deniedSlot !== n
      ? "This request was denied, so this slot never settled."
      : t.decidedBy === e.id
        ? "The time off has already started, so this denial can't be taken back."
        : `Only ${d} or a God Admin can take this denial back.`;
  if (!["pending", "approved"].includes(t.status))
    return `This request was ${t.status} — its stamps are final.`;
  if (slotState(t, n, r).state === "na")
    return `Nobody else can fill the ${s} slot, so it settled on its own.`;
  if (i.by)
    return i.by === e.id
      ? "The time off has already started, so this stamp can't be taken off."
      : `Only a God Admin can take somebody else's ${s} stamp off.`;
  if (n === "god") return `Only a God Admin can fill the ${s} slot.`;
  if (e.role === "employee")
    return `Only an admin on ${a}'s team can fill the ${s} slot.`;
  return `You admin a different team, so you can't fill ${a}'s ${s} slot.`;
}
// Either admin may deny, so the deny button follows whichever slot they could stamp.
export const canDenyRequest = (e, t, n = []) =>
  canStampSlot(e, t, "god", n) || canStampSlot(e, t, "team", n);
// Kept for the places that only ask "may this person act on the card at all".
export const canDecideRequest = (e, t, n = []) => canDenyRequest(e, t, n);
