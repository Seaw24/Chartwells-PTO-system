import { useCatalog } from "../../context/CatalogContext.jsx";
import { useDataSource } from "../../data/dataSource.jsx";
import { useToday } from "../../data/today.jsx";
import React from "react";
import { requestLines } from "../../utils/requestHelpers.jsx";
import { requestDays } from "../../utils/requestHelpers.jsx";
import { requestTypeLabel } from "../../utils/requestHelpers.jsx";
import { PtoTypePill } from "./RequestDetailModal.jsx";
import { StatusChip } from "./RequestDetailModal.jsx";
import { requestRangeLabel } from "../../utils/requestHelpers.jsx";
import { formatDateRange } from "../../utils/dateHelpers.jsx";
import { lineDays } from "../../utils/requestHelpers.jsx";
import { timeAgo } from "../../utils/dateHelpers.jsx";
import { firstName } from "../../utils/constants.jsx";
import { Button } from "../ui/Button.jsx";
import { StampSlots } from "./StampSlots.jsx";
import { isWellnessGrant } from "../../utils/requestHelpers.jsx";
import { WellnessPill } from "./Wellness.jsx";
import { wellnessCardStyle } from "./Wellness.jsx";
import { wellnessDividerStyle } from "./Wellness.jsx";
import { useHolidayIssue } from "./HolidayDayOff.jsx";
import { HolidayIssueNotice } from "./HolidayDayOff.jsx";
import { holidayIssueCardStyle } from "./HolidayDayOff.jsx";
import { holidayIssueDividerStyle } from "./HolidayDayOff.jsx";
export function RequestCard(e) {
  return isWellnessGrant(e.request) ? (
    <WellnessRequestCard {...e} />
  ) : (
    <TimeOffRequestCard {...e} />
  );
}
export function TimeOffRequestCard({ request: request, onCancel: onCancel }) {
  var p;
  const {
      ptoTypes: ptoTypes,
      ptoTypeById: ptoTypeById,
      userById: userById,
    } = useCatalog(),
    { normalDaysOffFor: normalDaysOffFor } = useDataSource(),
    o = useToday(),
    [c, l] = React.useState([0, 6]),
    u = requestLines(request),
    h = u.length > 1,
    d = requestDays(request, c),
    f = request.decidedByName ?? userById(request.decidedBy)?.name ?? null,
    holidayIssue = useHolidayIssue(request);
  return (
    React.useEffect(() => {
      let y = !0;
      return (
        normalDaysOffFor(request.userId).then((g) => {
          y && l(g);
        }),
        () => {
          y = !1;
        }
      );
    }, [request.userId]),
    (
      <div
        className="lift flex h-full flex-col rounded-card border border-line bg-card p-5 shadow-card"
        style={holidayIssue ? holidayIssueCardStyle : void 0}
      >
        <div className="flex items-start justify-between gap-3">
          {h ? (
            <p className="text-[15px] font-bold tracking-tight text-ink">
              {requestTypeLabel(request, ptoTypes)}
            </p>
          ) : (
            <PtoTypePill
              typeId={(p = u[0]) == null ? void 0 : p.type}
              label={u[0]?.holidayName}
            />
          )}
          <StatusChip status={request.status} size="xs" />
        </div>
        <p className="mt-3 text-[15px] font-semibold text-ink">
          {requestRangeLabel(request)}
        </p>
        {h && (
          <div className="mt-3 space-y-2 rounded-btn border border-line-soft bg-surface/60 px-3 py-2.5">
            {u.map((y, g) => {
              const k = ptoTypeById(y.type);
              return (
                <div
                  className="flex items-center justify-between gap-3 text-xs"
                  key={`${y.type}-${y.start}-${g}`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        background: k == null ? void 0 : k.color,
                      }}
                      aria-hidden="true"
                    />
                    <span className="truncate text-ink-soft">
                      <span className="font-semibold text-ink">
                        {k == null ? void 0 : k.name}
                      </span>
                      {" · "}
                      {formatDateRange(y.start, y.end)}
                    </span>
                  </span>
                  <span className="shrink-0 tabular text-ink-mute">
                    {lineDays(y, c)}
                    {"d"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-mute">
          <span className="font-semibold tabular text-ink-soft">
            {d}
            {" charged day"}
            {d === 1 ? "" : "s"}
          </span>
          <span>
            {"Submitted "}
            {timeAgo(request.submittedAt, o)}
          </span>
          {f && request.decidedAt && (
            <span>
              {request.status === "approved" ? "Approved" : "Denied"}
              {" by "}
              {firstName(f)}
            </span>
          )}
        </div>
        <div className="mt-3">
          <StampSlots request={request} size="sm" />
        </div>
        <HolidayIssueNotice
          issue={holidayIssue}
          status={request.status}
          hint={
            request.status === "pending" && onCancel
              ? "Cancel it, then book the day another way if you still need it."
              : ""
          }
          className="mt-3"
        />
        {request.status === "denied" && request.denialReason && (
          <p className="mt-3 rounded-btn bg-danger-soft px-3 py-2 text-xs text-danger-ink">
            <span className="font-semibold">{"Reason:"}</span>{" "}
            {request.denialReason}
          </p>
        )}
        {request.note && (
          <p className="mt-3 rounded-btn bg-surface/70 px-3 py-2 text-xs italic text-ink-soft">
            {"“"}
            {request.note}
            {"”"}
          </p>
        )}
        {request.status === "pending" && onCancel && (
          <div
            className="mt-auto flex justify-end border-t border-line-soft pt-3.5"
            style={holidayIssue ? holidayIssueDividerStyle : void 0}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancel(request)}
            >
              {"Cancel request"}
            </Button>
          </div>
        )}
      </div>
    )
  );
}
export function WellnessRequestCard({ request: request, onCancel: onCancel }) {
  const { userById: userById, ptoTypeById: ptoTypeById } = useCatalog(),
    today = useToday(),
    decider =
      request.decidedByName ?? userById(request.decidedBy)?.name ?? null,
    typeName = ptoTypeById(request.grantTypeId)?.name ?? "Wellness Day",
    days = request.grantDays;
  return (
    <div
      className="lift flex h-full flex-col rounded-card border p-5 shadow-card"
      style={wellnessCardStyle}
    >
      <div className="flex items-start justify-between gap-3">
        <WellnessPill />
        <StatusChip status={request.status} size="xs" />
      </div>
      <p className="mt-3 text-[15px] font-semibold text-ink">
        <span className="tabular">
          {"+"}
          {days}
          {days === 1 ? " day" : " days"}
        </span>
        <span className="font-medium text-ink-mute">
          {" to your "}
          {typeName}
          {" balance"}
        </span>
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-mute">
        <span
          className={`font-semibold ${request.status === "approved" ? "text-success-ink" : "text-ink-soft"}`}
        >
          {request.status === "approved"
            ? "Added to your balance"
            : `For ${request.grantYear}`}
        </span>
        <span>
          {"Submitted "}
          {timeAgo(request.submittedAt, today)}
        </span>
        {decider && request.decidedAt && (
          <span>
            {request.status === "approved" ? "Approved" : "Denied"}
            {" by "}
            {firstName(decider)}
          </span>
        )}
      </div>
      {request.status === "denied" && request.denialReason && (
        <p className="mt-3 rounded-btn bg-danger-soft px-3 py-2 text-xs text-danger-ink">
          <span className="font-semibold">{"Reason:"}</span>{" "}
          {request.denialReason}
        </p>
      )}
      {request.note && (
        <p
          className="mt-3 rounded-btn px-3 py-2 text-xs italic text-ink-soft"
          style={{
            background: "var(--c-card)",
          }}
        >
          {"“"}
          {request.note}
          {"”"}
        </p>
      )}
      {request.status === "pending" && onCancel && (
        <div
          className="mt-auto flex justify-end border-t pt-3.5"
          style={wellnessDividerStyle}
        >
          <Button variant="outline" size="sm" onClick={() => onCancel(request)}>
            {"Cancel request"}
          </Button>
        </div>
      )}
    </div>
  );
}
