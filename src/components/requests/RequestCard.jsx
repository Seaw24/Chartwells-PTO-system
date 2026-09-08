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
export function RequestCard({ request: request, onCancel: onCancel }) {
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
    f = userById(request.decidedBy);
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
      <div className="lift flex h-full flex-col rounded-card border border-line bg-card p-5 shadow-card">
        <div className="flex items-start justify-between gap-3">
          {h ? (
            <p className="text-[15px] font-bold tracking-tight text-ink">
              {requestTypeLabel(request, ptoTypes)}
            </p>
          ) : (
            <PtoTypePill typeId={(p = u[0]) == null ? void 0 : p.type} />
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
              {firstName(f.name)}
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
          <p className="mt-3 rounded-btn bg-surface/70 px-3 py-2 text-xs italic text-ink-soft">
            {"“"}
            {request.note}
            {"”"}
          </p>
        )}
        {request.status === "pending" && onCancel && (
          <div className="mt-auto flex justify-end border-t border-line-soft pt-3.5">
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
