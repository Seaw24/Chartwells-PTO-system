import { addDays as Vendor_addDays } from "date-fns";
import { toDateLocal } from "./dateHelpers.jsx";
import { toISO } from "./dateHelpers.jsx";
import { fmtShort } from "./dateHelpers.jsx";
import { requestLines } from "./requestHelpers.jsx";
// Each company holiday opens a window, the holiday through 30 days after it, in which a person can
// book one working day off against it. That booking uses the hidden "Holiday Day Off" type.
export const HOLIDAY_WINDOW_DAYS = 30;
export const holidayWindowEnd = (date) =>
  toISO(Vendor_addDays(toDateLocal(date), HOLIDAY_WINDOW_DAYS));
export const holidayWindowLabel = (holiday) =>
  `${fmtShort(holiday.date)} – ${fmtShort(holidayWindowEnd(holiday.date))}`;
export const holidayNote = (name) => `Request time off for ${name}`;
export const findHolidayDayOffType = (ptoTypes = []) =>
  ptoTypes.find((type) => type.isHolidayDayOff) ?? null;
export const isHolidayDayOffLine = (line) =>
  !!(line && (line.holidayId || line.holidayName));
// Holidays whose window holds the whole range.
export const holidaysCovering = (holidays = [], start, end) =>
  start && end
    ? holidays.filter(
        (holiday) =>
          holiday.date <= start && end <= holidayWindowEnd(holiday.date),
      )
    : [];
// Pending and approved requests spend the one day a holiday allows.
export const holidayDaysUsed = (
  holidayId,
  requests = [],
  { userId = null, exceptRequestId = null } = {},
) =>
  requests
    .filter(
      (request) =>
        request.id !== exceptRequestId &&
        (!userId || request.userId === userId) &&
        ["pending", "approved"].includes(request.status),
    )
    .flatMap((request) => requestLines(request))
    .filter((line) => line.holidayId === holidayId).length;
// Why a booked Holiday Day Off no longer matches its holiday, or null while it still does.
export function holidayLineIssue(line, holidays = []) {
  if (!isHolidayDayOffLine(line)) return null;
  const holiday = holidays.find((h) => h.id === line.holidayId),
    name = holiday?.name ?? line.holidayName ?? "This holiday";
  if (!holiday)
    return {
      kind: "removed",
      holidayName: name,
      title: `${name} was removed`,
      detail: `${name} is no longer a company holiday.`,
    };
  if (line.start < holiday.date || line.end > holidayWindowEnd(holiday.date))
    return {
      kind: "moved",
      holidayName: name,
      title: `${name} moved to ${fmtShort(holiday.date)}`,
      detail: `This day is outside its new window, ${holidayWindowLabel(holiday)}.`,
    };
  return null;
}
// Only live requests warn; a denied or cancelled one has nothing left to approve.
export const requestHolidayIssue = (request, holidays = []) =>
  ["pending", "approved"].includes(request?.status)
    ? (requestLines(request)
        .map((line) => holidayLineIssue(line, holidays))
        .find(Boolean) ?? null)
    : null;
