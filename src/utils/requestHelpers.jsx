import { rangesOverlap } from "./dateHelpers.jsx";
import { DEFAULT_NORMAL_DAYS_OFF } from "./constants.jsx";
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
export function lineDays(e, t = DEFAULT_NORMAL_DAYS_OFF, n = []) {
  return businessDays(e.start, e.end, t, n);
}
export function requestDays(e, t = DEFAULT_NORMAL_DAYS_OFF, n = []) {
  return requestLines(e).reduce((r, s) => r + lineDays(s, t, n), 0);
}
export function requestTypeIds(e) {
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
  const t = requestLines(e);
  return t.length === 0
    ? ""
    : t.length === 1
      ? formatDateRange(t[0].start, t[0].end)
      : `${formatDateRange(requestStart(e), requestEnd(e))} (${t.length} lines)`;
}
export function requestTypeLabel(e, t = []) {
  var r;
  const n = requestTypeIds(e);
  return n.length === 0
    ? "PTO"
    : n.length === 1
      ? ((r = t.find((s) => s.id === n[0])) == null ? void 0 : r.name) || "PTO"
      : `${n.length} PTO types`;
}
export function canDecideRequest(e, t, n = []) {
  if (!e || !t || t.status !== "pending" || e.id === t.userId) return !1;
  const r = n.find((s) => s.id === t.userId);
  return r
    ? r.role === "god_admin"
      ? e.role === "god_admin"
      : e.role === "god_admin"
        ? !0
        : e.role === "admin"
          ? e.team && r.team === e.team
          : !1
    : !1;
}
