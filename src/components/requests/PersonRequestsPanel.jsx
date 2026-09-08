import { useResource } from "../../hooks/useResource.jsx";
import { Check as Vendor_Check } from "lucide-react";
import { Clock as Vendor_Clock } from "lucide-react";
import { X as Vendor_X } from "lucide-react";
import { Ban as Vendor_Ban } from "lucide-react";
import { useCatalog } from "../../context/CatalogContext.jsx";
import { useDataSource } from "../../data/dataSource.jsx";
import React from "react";
import { lineEntriesForRequest } from "../../utils/requestHelpers.jsx";
import { toDateLocal } from "../../utils/dateHelpers.jsx";
import { differenceInCalendarDays as Vendor_differenceInCalendarDays } from "date-fns";
import { requestStart } from "../../utils/requestHelpers.jsx";
import { Modal } from "../ui/Modal.jsx";
import { Avatar } from "../ui/Avatar.jsx";
import { UserTeams } from "../../utils/organization.jsx";
import { formatDateRange } from "../../utils/dateHelpers.jsx";
import { EmptyState } from "../ui/EmptyState.jsx";
import { CalendarX as Vendor_CalendarX } from "lucide-react";
import { requestLines } from "../../utils/requestHelpers.jsx";
import { requestDays } from "../../utils/requestHelpers.jsx";
import { PtoTypeIcon } from "../ui/PtoTypeIcon.jsx";
import { StatusChip } from "./RequestDetailModal.jsx";
import { requestTypeLabel } from "../../utils/requestHelpers.jsx";
import { requestRangeLabel } from "../../utils/requestHelpers.jsx";
export const $E = {
  approved: Vendor_Check,
  pending: Vendor_Clock,
  denied: Vendor_X,
  cancelled: Vendor_Ban,
};
export const Hp = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
export function PersonRequestsPanel({
  userId: userId,
  open: open,
  onClose: onClose,
  onOpenRequest: onOpenRequest,
}) {
  const {
      ptoTypes: ptoTypes,
      ptoTypeById: ptoTypeById,
      userById: userById,
    } = useCatalog(),
    {
      requestsForUser: requestsForUser,
      balanceFor: balanceFor,
      grantFor: grantFor,
      normalDaysOffFor: normalDaysOffFor,
    } = useDataSource(),
    _unused = null;
  const { data: d = null } = useResource(
    ["person-history", userId, ptoTypes.map((type) => type.id)],
    async () => {
      const [requests, normalDaysOff, rows] = await Promise.all([
        requestsForUser(userId),
        normalDaysOffFor(userId),
        Promise.all(
          ptoTypes.map(async (type) => ({
            type: type.id,
            balance: await balanceFor(userId, type.id),
            grant: await grantFor(userId, type.id),
          })),
        ),
      ]);
      return {
        userId,
        requests,
        normalDaysOff,
        balanceByType: Object.fromEntries(
          rows.map((row) => [row.type, row.balance]),
        ),
        grantByType: Object.fromEntries(
          rows.map((row) => [row.type, row.grant]),
        ),
      };
    },
    open && !!userId,
  );
  void 0;
  const p = userById(d?.userId);
  const y = (d == null ? void 0 : d.requests) ?? [],
    g = React.useMemo(() => y.flatMap(lineEntriesForRequest), [y]),
    k = React.useMemo(() => {
      if (!y.length) return new Date().getFullYear();
      const b = {};
      return (
        g.forEach((N) => {
          const _ = toDateLocal(N.start).getFullYear();
          b[_] = (b[_] || 0) + 1;
        }),
        Number(Object.entries(b).sort((N, _) => _[1] - N[1])[0][0])
      );
    }, [g, y.length]),
    { lanes: lanes, laneCount: laneCount } = React.useMemo(() => {
      const b = new Date(k, 0, 1),
        N = k % 4 === 0 && (k % 100 !== 0 || k % 400 === 0) ? 366 : 365,
        _ = g
          .filter(
            (R) =>
              toDateLocal(R.start).getFullYear() === k ||
              toDateLocal(R.end).getFullYear() === k,
          )
          .map((R) => {
            const E = Math.max(
                0,
                Vendor_differenceInCalendarDays(toDateLocal(R.start), b),
              ),
              T = Math.min(
                N - 1,
                Vendor_differenceInCalendarDays(toDateLocal(R.end), b),
              );
            return {
              ...R,
              l: (E / N) * 100,
              w: ((T - E + 1) / N) * 100,
              s: E,
              e: T,
            };
          })
          .sort((R, E) => R.s - E.s),
        j = [];
      return {
        lanes: _.map((R) => {
          let E = j.findIndex((T) => R.s > T);
          return (
            E === -1 ? ((E = j.length), j.push(R.e)) : (j[E] = R.e),
            {
              ...R,
              lane: E,
            }
          );
        }),
        laneCount: Math.max(j.length, 1),
      };
    }, [g, k]),
    x = React.useMemo(
      () => [...y].sort((b, N) => (requestStart(b) < requestStart(N) ? -1 : 1)),
      [y],
    );
  return !p || d === null || (userId && d.userId !== userId) ? null : (
    <Modal open={open} onClose={onClose} title="Time-off history" size="xl">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={p.name} id={p.id} size="lg" />
            <div>
              <p className="text-lg font-bold text-ink">{p.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <UserTeams user={p} variant="inline" />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ptoTypes.map((b) => {
              const N = d.grantByType[b.id],
                _ = d.balanceByType[b.id];
              return (
                <span
                  className="flex items-center gap-1.5 rounded-chip border border-line bg-card px-2 py-1 text-[11px] font-medium text-ink-soft"
                  title={`${b.name}: ${_} of ${N} left`}
                  key={b.id}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      background: b.color,
                    }}
                  />
                  <span className="font-mono tabular text-ink">{_}</span>
                  <span className="text-ink-mute">
                    {"/"}
                    {N}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-mute">
              {k}
              {" at a glance"}
            </p>
            <span className="text-[11px] text-ink-mute">
              {"solid = approved · dashed = pending"}
            </span>
          </div>
          <div className="overflow-x-auto scrollbar-slim rounded-card border border-line bg-card p-3">
            <div className="min-w-[560px]">
              <div
                className="relative"
                style={{
                  height: `${laneCount * 26 + 8}px`,
                }}
              >
                <div className="absolute inset-0 flex">
                  {Hp.map((b, N) => (
                    <div
                      className="flex-1 border-l border-line-soft first:border-l-0"
                      key={N}
                    />
                  ))}
                </div>
                {lanes.length === 0 && (
                  <p className="absolute inset-0 grid place-items-center text-xs text-ink-mute">
                    {"No time off recorded in "}
                    {k}
                    {"."}
                  </p>
                )}
                {lanes.map((b) => {
                  const N = ptoTypeById(b.type),
                    _ = b.status === "denied" || b.status === "cancelled",
                    j = b.status === "pending",
                    S = $E[b.status];
                  return (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenRequest == null
                          ? void 0
                          : onOpenRequest(b.requestId || b.id)
                      }
                      className="absolute flex h-[22px] items-center gap-1 overflow-hidden rounded-chip px-1.5 text-[10px] font-semibold transition-shadow hover:shadow-lift"
                      style={{
                        top: `${b.lane * 26 + 2}px`,
                        left: `${b.l}%`,
                        width: `calc(${b.w}% - 2px)`,
                        minWidth: "16px",
                        color: _
                          ? "var(--c-ink-mute)"
                          : `color-mix(in oklch, ${N.color} 72%, var(--c-ink))`,
                        background: _
                          ? "var(--c-panel)"
                          : `color-mix(in oklch, ${N.color} ${j ? 12 : 22}%, var(--c-card))`,
                        border: j
                          ? `1px dashed color-mix(in oklch, ${N.color} 55%, transparent)`
                          : _
                            ? "1px solid var(--c-line)"
                            : `1px solid color-mix(in oklch, ${N.color} 32%, transparent)`,
                      }}
                      title={`${N.name} · ${formatDateRange(b.start, b.end)} · ${b.status}`}
                      key={b.lineKey || b.id}
                    >
                      <S size={10} className="shrink-0" strokeWidth={2.5} />
                      <span className="truncate">{N.name}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-1 flex border-t border-line-soft pt-1">
                {Hp.map((b, N) => (
                  <div
                    className="flex-1 text-center text-[10px] font-medium text-ink-mute"
                    key={N}
                  >
                    {b}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-mute">
            {"All requests "}
            <span className="text-ink-mute/70">
              {"("}
              {x.length}
              {")"}
            </span>
          </p>
          {x.length === 0 ? (
            <EmptyState
              icon={Vendor_CalendarX}
              title="No requests"
              description="This person hasn't requested time off yet."
              className="py-8"
            />
          ) : (
            <div className="-mx-1 flex gap-3 overflow-x-auto scrollbar-slim px-1 pb-1">
              {x.map((b) => {
                var R, E, T;
                const N = requestLines(b),
                  _ = ptoTypeById((R = N[0]) == null ? void 0 : R.type),
                  j = (_ == null ? void 0 : _.color) || "var(--c-ink-mute)",
                  S = requestDays(b, d.normalDaysOff);
                return (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenRequest == null ? void 0 : onOpenRequest(b.id)
                    }
                    className="flex w-[210px] shrink-0 flex-col gap-2 rounded-card border border-line bg-card p-3 text-left shadow-card transition-shadow duration-[180ms] hover:shadow-lift"
                    key={b.id}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-btn"
                        style={{
                          background: `color-mix(in oklch, ${j} 12%, var(--c-card))`,
                          color: j,
                        }}
                      >
                        <PtoTypeIcon
                          typeId={_ == null ? void 0 : _.id}
                          size={16}
                        />
                      </span>
                      <StatusChip status={b.status} size="xs" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ink">
                        {requestTypeLabel(b, ptoTypes)}
                      </p>
                      <p className="text-xs text-ink-soft">
                        {requestRangeLabel(b)}
                      </p>
                    </div>
                    <p className="text-[11px] text-ink-mute">
                      <span className="font-medium text-ink-soft tabular">
                        {S}
                      </span>
                      {" charged day"}
                      {S === 1 ? "" : "s"}
                      {b.decidedBy &&
                        ` · by ${(T = (E = userById(b.decidedBy)) == null ? void 0 : E.name) == null ? void 0 : T.split(" ")[0]}`}
                    </p>
                    {N.length > 1 && (
                      <div className="space-y-1">
                        {N.map((C, H) => {
                          var I;
                          return (
                            <p
                              className="truncate text-[11px] text-ink-mute"
                              key={`${C.type}-${C.start}-${H}`}
                            >
                              {(I = ptoTypeById(C.type)) == null
                                ? void 0
                                : I.name}
                              {": "}
                              {formatDateRange(C.start, C.end)}
                            </p>
                          );
                        })}
                      </div>
                    )}
                    {b.status === "denied" && b.denialReason && (
                      <p className="rounded-chip bg-danger-soft px-2 py-1 text-[11px] text-danger-ink">
                        {b.denialReason}
                      </p>
                    )}
                    {b.note && b.status !== "denied" && (
                      <p className="line-clamp-2 text-[11px] italic text-ink-mute">
                        {"“"}
                        {b.note}
                        {"”"}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
