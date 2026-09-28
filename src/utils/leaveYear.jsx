// Leave years per PTO type, mirroring leave_year_for()/leave_year_start() in
// supabase/migrations/202609280002_leave_year_reset.sql. A type resets every year on
// resetMonth/resetDay; a leave year is named after the calendar year it starts in. Before
// firstReset the type keeps calendar years, and the year running when the rule was set stretches
// to the day before firstReset.
const pad = (n) => String(n).padStart(2, "0");
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
// Feb 29 is left out so every year has the reset day.
export const daysInResetMonth = (m) =>
  m === 2 ? 28 : [4, 6, 9, 11].includes(m) ? 30 : 31;
const rule = (type) => ({
  m: (type == null ? void 0 : type.resetMonth) ?? 1,
  d: (type == null ? void 0 : type.resetDay) ?? 1,
  first: (type == null ? void 0 : type.firstReset) ?? null,
});
export function leaveYearFor(type, dayIso) {
  const { m, d, first } = rule(type),
    y = Number(dayIso.slice(0, 4));
  if (first && dayIso < first) return Math.min(y, Number(first.slice(0, 4)) - 1);
  return dayIso.slice(5) < `${pad(m)}-${pad(d)}` ? y - 1 : y;
}
export function leaveYearStart(type, year) {
  const { m, d, first } = rule(type);
  return first && year < Number(first.slice(0, 4)) ? iso(year, 1, 1) : iso(year, m, d);
}
export function leaveYearEnd(type, year) {
  const next = new Date(`${leaveYearStart(type, year + 1)}T12:00:00`);
  next.setDate(next.getDate() - 1);
  return iso(next.getFullYear(), next.getMonth() + 1, next.getDate());
}
const short = (dayIso, withYear = true) =>
  `${MONTHS[Number(dayIso.slice(5, 7)) - 1]} ${Number(dayIso.slice(8))}${withYear ? `, ${dayIso.slice(0, 4)}` : ""}`;
// "2027" for a calendar year, else "Oct 1, 2027 – Sep 30, 2028".
export function leaveYearLabel(type, year) {
  const s = leaveYearStart(type, year),
    e = leaveYearEnd(type, year);
  return s.endsWith("-01-01") && e === iso(year, 12, 31)
    ? String(year)
    : `${short(s)} – ${short(e)}`;
}
// "Resets Jan 1" / "Resets Oct 1".
export const resetDayLabel = (type) => {
  const { m, d } = rule(type);
  return `${MONTHS[m - 1]} ${d}`;
};
// The next reset strictly after today.
export function nextReset(type, todayIso) {
  return leaveYearStart(type, leaveYearFor(type, todayIso) + 1);
}
// The first date the rule would next fall on after today: where a new rule can start.
export function nextOccurrence(month, day, todayIso) {
  const y = Number(todayIso.slice(0, 4)),
    here = iso(y, month, day);
  return here > todayIso ? here : iso(y + 1, month, day);
}
export const shortDate = short;
