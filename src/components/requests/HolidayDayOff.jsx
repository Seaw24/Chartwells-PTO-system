import { CalendarX2 as Vendor_CalendarX2 } from "lucide-react";
import { useCatalog } from "../../context/CatalogContext.jsx";
import { requestHolidayIssue } from "../../utils/holidayDayOff.jsx";
import { holidayDaysUsed } from "../../utils/holidayDayOff.jsx";
// A Holiday Day Off whose holiday was removed or moved reads red wherever it appears:
// tinted fill + full hairline border, like other card states.
export const holidayIssueCardStyle = {
  background: "color-mix(in oklab, var(--c-danger) 5%, var(--c-card))",
  borderColor: "color-mix(in oklab, var(--c-danger) 38%, transparent)",
};
export const holidayIssueDividerStyle = {
  borderColor: "color-mix(in oklab, var(--c-danger) 20%, transparent)",
};
export function useHolidayIssue(request) {
  const { holidays: holidays } = useCatalog();
  return requestHolidayIssue(request, holidays);
}
export function HolidayIssueNotice({
  issue: issue,
  status: status,
  hint = "",
  className = "",
}) {
  if (!issue) return null;
  const detail = [
    issue.detail,
    status === "pending" ? "It can't be approved." : "",
    hint,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div
      role="status"
      className={`flex items-start gap-2.5 rounded-btn bg-danger-soft px-3 py-2.5 ${className}`}
    >
      <Vendor_CalendarX2
        size={16}
        strokeWidth={2.25}
        className="mt-px shrink-0 text-danger-ink"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-danger-ink">{issue.title}</p>
        <p
          className="mt-0.5 text-xs leading-snug"
          style={{
            color: "color-mix(in oklab, var(--c-danger-ink) 84%, var(--c-card))",
          }}
        >
          {detail}
        </p>
      </div>
    </div>
  );
}
// The one day a holiday allows, left for the requester apart from this request.
export function HolidayBalance({
  line: line,
  requests = [],
  request: request,
}) {
  const remaining = Math.max(
    0,
    1 -
      holidayDaysUsed(line.holidayId, requests, {
        userId: request.userId,
        exceptRequestId: request.id,
      }),
  );
  return (
    <>
      <b className="tabular text-ink">
        {remaining}
        {"/"}
        {1}
      </b>{" "}
      {line.holidayName}
      {" day off"}
    </>
  );
}
