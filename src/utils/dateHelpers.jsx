import { parseISO as Vendor_parseISO } from "date-fns";
import { format as Vendor_format } from "date-fns";
import { eachDayOfInterval as Vendor_eachDayOfInterval } from "date-fns";
import { formatDistance as Vendor_formatDistance } from "date-fns";
import { startOfWeek as Vendor_startOfWeek } from "date-fns";
import { startOfMonth as Vendor_startOfMonth } from "date-fns";
import { endOfWeek as Vendor_endOfWeek } from "date-fns";
import { endOfMonth as Vendor_endOfMonth } from "date-fns";
import { addDays as Vendor_addDays } from "date-fns";
export const toDateLocal = (e) => {
  if (e instanceof Date) return e;
  const t = String(e);
  return Vendor_parseISO(/^\d{4}-\d{2}-\d{2}$/.test(t) ? `${t}T12:00:00` : t);
};
export const toISO = (e) => Vendor_format(e, "yyyy-MM-dd");
export const fmtShort = (e) => Vendor_format(toDateLocal(e), "MMM d");
export const fmtFull = (e) => Vendor_format(toDateLocal(e), "EEE, MMM d, yyyy");
export const fmtMonth = (e) => Vendor_format(e, "MMMM yyyy");
export const fmtDateTime = (e) =>
  Vendor_format(toDateLocal(e), "MMM d, h:mm a");
export function formatDateRange(e, t) {
  if (e === t) return fmtFull(e);
  const n = toDateLocal(e),
    r = toDateLocal(t),
    s = n.getFullYear() === r.getFullYear(),
    i = Vendor_format(n, "EEE, MMM d"),
    o = Vendor_format(r, "EEE, MMM d, yyyy");
  return `${i} – ${o}`;
}
export function businessDays(e, t, n = [0, 6], r = []) {
  if (!e || !t) return 0;
  const s = toDateLocal(e),
    i = toDateLocal(t);
  if (i < s) return 0;
  const o = new Set(n),
    c = new Set(r.map((l) => (typeof l == "string" ? l : l.date)));
  return Vendor_eachDayOfInterval({
    start: s,
    end: i,
  }).filter((l) => !o.has(l.getDay()) && !c.has(toISO(l))).length;
}
export function timeAgo(e, t = new Date()) {
  return `${Vendor_formatDistance(toDateLocal(e), toDateLocal(t))} ago`;
}
export function rangesOverlap(e, t, n, r) {
  return toDateLocal(e) <= toDateLocal(r) && toDateLocal(n) <= toDateLocal(t);
}
export function monthGrid(e) {
  const t = Vendor_startOfWeek(Vendor_startOfMonth(e), {
      weekStartsOn: 0,
    }),
    n = Vendor_endOfWeek(Vendor_endOfMonth(e), {
      weekStartsOn: 0,
    });
  return Vendor_eachDayOfInterval({
    start: t,
    end: n,
  });
}
export function weekGrid(e) {
  const t = Vendor_startOfWeek(e, {
    weekStartsOn: 0,
  });
  return Array.from(
    {
      length: 7,
    },
    (n, r) => Vendor_addDays(t, r),
  );
}
export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
