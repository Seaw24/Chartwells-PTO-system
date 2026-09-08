import { fmtShort } from "./dateHelpers.jsx";
import { rangesOverlap } from "./dateHelpers.jsx";
import { requestLines } from "./requestHelpers.jsx";
import { toDateLocal } from "./dateHelpers.jsx";
import { lineDays } from "./requestHelpers.jsx";
import { toISO } from "./dateHelpers.jsx";
import { lineEntriesForRequest } from "./requestHelpers.jsx";
export function windowsForType(e, t = []) {
  const n = t.filter((r) => r.typeId === e);
  return n.length ? n : null;
}
export function windowLabel(e, t = []) {
  const n = windowsForType(e, t);
  return n
    ? n.map((r) => `${fmtShort(r.start)} – ${fmtShort(r.end)}`).join(", ")
    : null;
}
export function isInWindow(e, t, n = []) {
  const r = windowsForType(t, n);
  return r ? r.some((s) => rangesOverlap(e, e, s.start, s.end)) : !0;
}
export const ACTIVE_STATUSES = ["approved", "pending"];
export function findOverlap(e, t, n = []) {
  for (const r of n) {
    if (!ACTIVE_STATUSES.includes(r.status)) continue;
    const s = requestLines(r).find((i) => rangesOverlap(e, t, i.start, i.end));
    if (s)
      return {
        start: s.start,
        end: s.end,
        status: r.status,
      };
  }
  return null;
}
export function overlapMessage(e) {
  const t =
      e.start === e.end
        ? fmtShort(e.start)
        : `${fmtShort(e.start)} – ${fmtShort(e.end)}`,
    n =
      e.status === "approved"
        ? "already approved time off"
        : "already requested and waiting for approval";
  return `${t} is ${n}. Ask for any extra days as a separate request.`;
}
export function findBlackout(e, t, n, r = []) {
  return r.find(
    (s) =>
      (s.types === "all" || (Array.isArray(s.types) && s.types.includes(n))) &&
      rangesOverlap(e, t, s.start, s.end),
  );
}
export function blackoutOnDate(e, t = []) {
  const n = t.filter((s) => rangesOverlap(e, e, s.start, s.end));
  if (!n.length) return null;
  const r = n.find((s) => s.types === "all");
  return r
    ? {
        scope: "all",
        typeIds: null,
        reason: r.reason,
      }
    : {
        scope: "some",
        typeIds: [...new Set(n.flatMap((s) => s.types))],
        reason: n[0].reason,
      };
}
export function validateDraft({
  draft: draft,
  todayIso: todayIso,
  balance = null,
  balances = {},
  normalDaysOff = [0, 6],
  existingRequests = [],
  ptoTypes = [],
  dateRules = [],
  blackouts = [],
  holidays = [],
}) {
  var N, _;
  const h = [],
    d = [],
    f = requestLines(draft),
    p = f.length
      ? f.map((j, S) => ({
          index: S,
          line: j,
          days: 0,
          errors: [],
        }))
      : [
          {
            index: 0,
            line: {
              type: "",
              start: "",
              end: "",
            },
            days: 0,
            errors: [],
          },
        ],
    y = {},
    g = (j, S) => {
      (p[j].errors.push(S), h.push(`Line ${j + 1}: ${S}`));
    };
  (f.length || g(0, "Add at least one PTO line."),
    f.forEach((j, S) => {
      const { type: type, start: start, end: end } = j,
        C = ptoTypes.find((q) => q.id === type);
      if (
        (type || g(S, "Pick a PTO type."),
        (!start || !end) && g(S, "Choose a start and end date."),
        !start || !end)
      )
        return;
      if (toDateLocal(end) < toDateLocal(start)) {
        g(S, "End date is before the start date.");
        return;
      }
      const H = lineDays(j, normalDaysOff, holidays);
      if (
        ((p[S].days = H),
        type && (y[type] = (y[type] || 0) + H),
        !(C != null && C.allowBackdate) &&
          toDateLocal(start) < toDateLocal(todayIso) &&
          g(S, "Start date is in the past."),
        C != null && C.allowBackdate)
      ) {
        const q = toISO(new Date(toDateLocal(todayIso).getTime() - 864e5));
        toDateLocal(start) < toDateLocal(q) &&
          g(
            S,
            `${C.name} can be filed for today or yesterday at the earliest.`,
          );
      }
      C != null &&
        C.restrictedDates &&
        (datesInRange(start, end).every((Z) =>
          isInWindow(Z, type, dateRules),
        ) ||
          g(
            S,
            `${C.name} is only available during: ${windowLabel(type, dateRules)}.`,
          ));
      const I = findBlackout(start, end, type, blackouts);
      I && g(S, `Overlaps a blackout period (${I.reason}).`);
      const D = findOverlap(start, end, existingRequests);
      D && g(S, overlapMessage(D));
    }),
    f.forEach((j, S) => {
      !j.start ||
        !j.end ||
        f.slice(S + 1).forEach((R, E) => {
          const T = S + E + 1;
          !R.start ||
            !R.end ||
            (rangesOverlap(j.start, j.end, R.start, R.end) &&
              (g(S, `Overlaps line ${T + 1}. Keep each date range separate.`),
              g(T, `Overlaps line ${S + 1}. Keep each date range separate.`)));
        });
    }));
  const k = {
    ...balances,
  };
  balance != null &&
    f.length === 1 &&
    (N = f[0]) != null &&
    N.type &&
    (k[f[0].type] = balance);
  const v = {};
  Object.entries(y).forEach(([j, S]) => {
    var R;
    if (k[j] != null && ((v[j] = k[j] - S), S > k[j])) {
      const T = `${((R = ptoTypes.find((C) => C.id === j)) == null ? void 0 : R.name) || "PTO"} balance is short. This needs ${S} day${S === 1 ? "" : "s"} but only ${k[j]} remain.`;
      f.forEach((C, H) => {
        C.type === j && g(H, T);
      });
    }
  });
  const m = Object.values(y).reduce((j, S) => j + S, 0),
    x = (_ = f.find((j) => j.type)) == null ? void 0 : _.type,
    b = x ? (v[x] ?? null) : null;
  return {
    ok: h.length === 0,
    errors: h,
    warnings: d,
    days: m,
    daysByType: y,
    remainingAfter: b,
    remainingAfterByType: v,
    lineResults: p,
  };
}
export function findTeamConflicts({
  draft: draft,
  requests: requests,
  users: users,
  selfId: selfId,
  teamId: teamId,
}) {
  const i = requestLines(draft).filter((o) => o.start && o.end);
  return i.length
    ? requests
        .flatMap((o) =>
          lineEntriesForRequest(o).filter(
            (c) =>
              c.userId !== selfId &&
              ["approved", "pending"].includes(c.status) &&
              i.some((l) => rangesOverlap(l.start, l.end, c.start, c.end)),
          ),
        )
        .map((o) => ({
          ...o,
          user: users.find((c) => c.id === o.userId),
        }))
        .filter((o) => o.user && (!teamId || o.user.team === teamId))
    : [];
}
export function datesInRange(e, t) {
  const n = [];
  let r = toDateLocal(e);
  const s = toDateLocal(t);
  for (; r <= s;) (n.push(toISO(r)), (r = new Date(r.getTime() + 864e5)));
  return n;
}
export const windowedTypes = (e = [], t = []) =>
  e.filter((n) => windowsForType(n.id, t));
export function isBlackoutDay(e, t = []) {
  var n;
  return (
    ((n = blackoutOnDate(toISO(e), t)) == null ? void 0 : n.scope) === "all"
  );
}
export function blackoutTypes(e = [], t = []) {
  const n = new Set(t.filter((r) => r.types !== "all").flatMap((r) => r.types));
  return e.filter((r) => n.has(r.id));
}
export function dateTypeMarks(
  e,
  { ptoTypes = [], dateRules = [], blackouts = [] } = {},
) {
  const s = toISO(e),
    i = blackoutOnDate(s, blackouts);
  if ((i == null ? void 0 : i.scope) === "all") return [];
  const o = (i == null ? void 0 : i.typeIds) ?? [],
    c = (l, u) => ({
      id: l.id,
      name: l.name,
      color: l.color,
      kind: u,
    });
  return [
    ...ptoTypes.filter((l) => o.includes(l.id)).map((l) => c(l, "blackout")),
    ...windowedTypes(ptoTypes, dateRules)
      .filter((l) => !o.includes(l.id))
      .filter((l) =>
        windowsForType(l.id, dateRules).some((u) =>
          rangesOverlap(s, s, u.start, u.end),
        ),
      )
      .map((l) => c(l, "window")),
  ];
}
export function contiguousRuns(e, t) {
  const n = [];
  let r = -1;
  return (
    e.forEach((s, i) => {
      t(s)
        ? r === -1 && (r = i)
        : r !== -1 &&
          (n.push({
            startIdx: r,
            endIdx: i - 1,
          }),
          (r = -1));
    }),
    r !== -1 &&
      n.push({
        startIdx: r,
        endIdx: e.length - 1,
      }),
    n
  );
}
export function calendarBands(
  e,
  { ptoTypes = [], dateRules = [], blackouts = [] } = {},
) {
  const s = {
      ptoTypes: ptoTypes,
      dateRules: dateRules,
      blackouts: blackouts,
    },
    i = (c, l) => dateTypeMarks(c, s).filter((u) => u.kind === l),
    o = [];
  return (
    contiguousRuns(e, (c) => isBlackoutDay(c, blackouts)).forEach((c) =>
      o.push({
        kind: "blackout",
        label: "Blackout",
        color: "var(--c-danger)",
        ...c,
      }),
    ),
    ptoTypes.forEach((c) => {
      contiguousRuns(e, (l) =>
        i(l, "blackout").some((u) => u.id === c.id),
      ).forEach((l) =>
        o.push({
          kind: "blackout",
          typeId: c.id,
          label: `${c.name} blackout`,
          color: c.color,
          ...l,
        }),
      );
    }),
    windowedTypes(ptoTypes, dateRules).forEach((c) => {
      contiguousRuns(e, (l) =>
        i(l, "window").some((u) => u.id === c.id),
      ).forEach((l) =>
        o.push({
          kind: "window",
          typeId: c.id,
          label: `${c.name} window`,
          color: c.color,
          ...l,
        }),
      );
    }),
    o
  );
}
export function placeBands(e) {
  const t = [];
  return {
    placed: e.map((r) => {
      let s = t.findIndex((i) =>
        i.every((o) => r.startIdx > o.endIdx || r.endIdx < o.startIdx),
      );
      return (
        s === -1 && ((s = t.length), t.push([])),
        t[s].push(r),
        {
          ...r,
          row: s,
        }
      );
    }),
    rowCount: t.length,
  };
}
