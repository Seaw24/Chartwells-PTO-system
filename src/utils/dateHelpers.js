import {
  parseISO,
  format,
  eachDayOfInterval,
  differenceInCalendarDays,
  formatDistanceToNowStrict,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
} from 'date-fns';

// All dates in the app are ISO 'yyyy-MM-dd' strings. Parse at local noon to dodge TZ shifts.
export const toDate = (iso) => (iso instanceof Date ? iso : parseISO(`${iso}T12:00:00`));
export const toISO = (date) => format(date, 'yyyy-MM-dd');

export const fmtShort = (iso) => format(toDate(iso), 'MMM d');
export const fmtMedium = (iso) => format(toDate(iso), 'EEE, MMM d');
export const fmtLong = (iso) => format(toDate(iso), 'EEE, MMM d, yyyy');
export const fmtMonthYear = (date) => format(date, 'MMMM yyyy');
export const fmtTime = (iso) => format(toDate(iso), 'MMM d, h:mm a');

// Human range: "Mon, Oct 13 — Wed, Oct 15, 2026" (single day collapses).
export function fmtRange(startIso, endIso) {
  if (startIso === endIso) return fmtLong(startIso);
  const s = toDate(startIso);
  const e = toDate(endIso);
  const sameYear = s.getFullYear() === e.getFullYear();
  const left = format(s, 'EEE, MMM d');
  const right = sameYear ? format(e, 'EEE, MMM d, yyyy') : format(e, 'EEE, MMM d, yyyy');
  return `${left} – ${right}`;
}

// Charged PTO days in an inclusive range. Normal days off are excluded; holidays still count.
export function businessDays(startIso, endIso, normalDaysOff = [0, 6]) {
  if (!startIso || !endIso) return 0;
  const start = toDate(startIso);
  const end = toDate(endIso);
  if (end < start) return 0;
  const daysOff = new Set(normalDaysOff);
  return eachDayOfInterval({ start, end }).filter((d) => !daysOff.has(d.getDay())).length;
}

export const calendarDays = (startIso, endIso) =>
  Math.abs(differenceInCalendarDays(toDate(endIso), toDate(startIso))) + 1;

export function relativeTime(iso) {
  return `${formatDistanceToNowStrict(toDate(iso))} ago`;
}

// Inclusive overlap test between two ISO ranges.
export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return toDate(aStart) <= toDate(bEnd) && toDate(bStart) <= toDate(aEnd);
}

export function dateInRange(iso, startIso, endIso) {
  return isWithinInterval(toDate(iso), { start: toDate(startIso), end: toDate(endIso) });
}

// Calendar grid: full weeks (Sun start) covering the given month.
export function monthGrid(monthDate) {
  const gridStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 0 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

export function weekGrid(anchorDate) {
  const start = startOfWeek(anchorDate, { weekStartsOn: 0 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
