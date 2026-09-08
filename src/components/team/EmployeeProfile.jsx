import { useCatalog } from "../../context/CatalogContext.jsx";
import React from "react";
import { toDateLocal } from "../../utils/dateHelpers.jsx";
import { lineEntriesForRequest } from "../../utils/requestHelpers.jsx";
import { toISO } from "../../utils/dateHelpers.jsx";
import { addDays as Vendor_addDays } from "date-fns";
import { addMonths as Vendor_addMonths } from "date-fns";
import { addWeeks as Vendor_addWeeks } from "date-fns";
import { format as Vendor_format } from "date-fns";
import { weekGrid } from "../../utils/dateHelpers.jsx";
import { ChevronLeft as Vendor_ChevronLeft } from "lucide-react";
import { ChevronRight as Vendor_ChevronRight } from "lucide-react";
import { SkipForward as Vendor_SkipForward } from "lucide-react";
import { SegmentedControl } from "../ui/SegmentedControl.jsx";
import { monthGrid } from "../../utils/dateHelpers.jsx";
import { WEEKDAY_LABELS } from "../../utils/dateHelpers.jsx";
import { isSameMonth as Vendor_isSameMonth } from "date-fns";
import { EmptyState } from "../ui/EmptyState.jsx";
import { CalendarX as Vendor_CalendarX } from "lucide-react";
import { formatDateRange } from "../../utils/dateHelpers.jsx";
import { usePresence } from "../../hooks/motion.jsx";
import ReactDOM from "react-dom";
import { Avatar } from "../ui/Avatar.jsx";
import { UserTeams } from "../../utils/organization.jsx";
import { X as Vendor_X } from "lucide-react";
import { Button } from "../ui/Button.jsx";
import { CalendarPlus as Vendor_CalendarPlus } from "lucide-react";
import { isGodAdmin } from "../../utils/constants.jsx";
import { SlidersHorizontal as Vendor_SlidersHorizontal } from "lucide-react";
import { Lock as Vendor_Lock } from "lucide-react";
import { requestStart } from "../../utils/requestHelpers.jsx";
import { CalendarClock as Vendor_CalendarClock } from "lucide-react";
import { ArrowUpRight as Vendor_ArrowUpRight } from "lucide-react";
import { requestLines } from "../../utils/requestHelpers.jsx";
import { requestDays } from "../../utils/requestHelpers.jsx";
import { PtoTypeIcon } from "../ui/PtoTypeIcon.jsx";
import { requestTypeLabel } from "../../utils/requestHelpers.jsx";
import { requestRangeLabel } from "../../utils/requestHelpers.jsx";
import { StatusChip } from "../requests/RequestDetailModal.jsx";
import { Pencil as Vendor_Pencil } from "lucide-react";
export function canViewPerson(e, t) {
  return !e || !t
    ? !1
    : e.id === t.id || e.role === "god_admin"
      ? !0
      : e.role === "admin"
        ? !!e.team && t.team === e.team
        : !1;
}
export function canManagePerson(e, t) {
  return !e || !t || e.id === t.id
    ? !1
    : e.role === "god_admin"
      ? !0
      : e.role === "admin"
        ? !!e.team && t.team === e.team
        : !1;
}
export function PersonCalendar({
  requests: requests,
  holidays = [],
  normalDaysOff = [0, 6],
  todayIso: todayIso,
  onOpenBar: onOpenBar,
}) {
  const { ptoTypeById: ptoTypeById } = useCatalog(),
    [o, c] = React.useState("month"),
    [l, u] = React.useState(toDateLocal(todayIso)),
    h = React.useMemo(() => {
      const _ = {};
      return (
        requests
          .flatMap(lineEntriesForRequest)
          .filter((j) => ["approved", "pending"].includes(j.status))
          .forEach((j) => {
            let S = toDateLocal(j.start);
            const R = toDateLocal(j.end);
            for (; S <= R;) {
              const E = toISO(S);
              ((_[E] || (_[E] = [])).push(j), (S = Vendor_addDays(S, 1)));
            }
          }),
        _
      );
    }, [requests]),
    d = React.useMemo(() => {
      const _ = {};
      return (
        holidays.forEach((j) => {
          _[j.date] = j;
        }),
        _
      );
    }, [holidays]),
    f = React.useMemo(() => Object.keys(h).sort(), [h]),
    p = React.useMemo(() => {
      const _ = toISO(l);
      return f.find((j) => j > _) || null;
    }, [f, l]),
    [y, g] = React.useState(null),
    k = React.useRef(null);
  React.useEffect(() => {
    var j, S;
    if (!y || !k.current) return;
    (S = (j = k.current.querySelector("button") || k.current).focus) == null ||
      S.call(j);
  }, [y, o, l]);
  const v = (_) => {
      (g(null),
        u((j) =>
          o === "month"
            ? Vendor_addMonths(j, _)
            : o === "week"
              ? Vendor_addWeeks(j, _)
              : Vendor_addDays(j, _),
        ));
    },
    m = () => {
      (g(null), u(toDateLocal(todayIso)));
    },
    x = () => {
      p && (g(p), u(toDateLocal(p)));
    },
    b = (_, j) => {
      (g(_), onOpenBar == null || onOpenBar(j));
    },
    N =
      o === "month"
        ? Vendor_format(l, "MMMM yyyy")
        : o === "week"
          ? `Week of ${Vendor_format(weekGrid(l)[0], "MMM d")}`
          : Vendor_format(l, "EEE, MMM d, yyyy");
  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <CalendarNavButton label="Previous" onClick={() => v(-1)}>
            <Vendor_ChevronLeft size={16} />
          </CalendarNavButton>
          <CalendarNavButton label="Next" onClick={() => v(1)}>
            <Vendor_ChevronRight size={16} />
          </CalendarNavButton>
          <button
            type="button"
            onClick={m}
            className="ml-1 rounded-btn border border-line bg-card px-2.5 py-1 text-[11px] font-semibold text-ink-soft hover:bg-panel"
          >
            {"Today"}
          </button>
          <span className="ml-1.5 text-[13px] font-bold tabular tracking-tight text-ink">
            {N}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={x}
            disabled={!p}
            title={p ? "Jump to their next time off" : "No upcoming time off"}
            className="inline-flex items-center gap-1 rounded-btn border border-line bg-card px-2.5 py-1 text-[11px] font-semibold text-ink-soft hover:bg-panel disabled:pointer-events-none disabled:opacity-45"
          >
            <Vendor_SkipForward size={13} strokeWidth={2.25} />
            {" Next off"}
          </button>
          <SegmentedControl
            options={[
              {
                value: "month",
                label: "M",
              },
              {
                value: "week",
                label: "W",
              },
              {
                value: "day",
                label: "D",
              },
            ]}
            value={o}
            onChange={c}
            size="sm"
          />
        </div>
      </div>
      <div className="animate-fade-in" key={o}>
        {o === "month" && (
          <PersonMonth
            cursor={l}
            byDay={h}
            holidayByDay={d}
            normalDaysOff={normalDaysOff}
            todayIso={todayIso}
            selectedIso={y}
            selRef={k}
            openEntry={b}
          />
        )}
        {o === "week" && (
          <PersonWeek
            days={weekGrid(l)}
            byDay={h}
            holidayByDay={d}
            normalDaysOff={normalDaysOff}
            todayIso={todayIso}
            selectedIso={y}
            selRef={k}
            openEntry={b}
          />
        )}
        {o === "day" && (
          <PersonDay
            day={l}
            byDay={h}
            holidayByDay={d}
            todayIso={todayIso}
            selectedIso={y}
            selRef={k}
            openEntry={b}
          />
        )}
      </div>
    </div>
  );
}
export function CalendarNavButton({
  label: label,
  onClick: onClick,
  children: children,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-7 w-7 place-items-center rounded-btn border border-line bg-card text-ink-soft hover:bg-panel"
    >
      {children}
    </button>
  );
}
export function PersonMonth({
  cursor: cursor,
  byDay: byDay,
  holidayByDay: holidayByDay,
  normalDaysOff: normalDaysOff,
  todayIso: todayIso,
  selectedIso: selectedIso,
  selRef: selRef,
  openEntry: openEntry,
}) {
  const { ptoTypeById: ptoTypeById } = useCatalog(),
    u = monthGrid(cursor),
    h = new Set(normalDaysOff);
  return (
    <div className="overflow-hidden rounded-card border border-line bg-card">
      <div className="grid grid-cols-7 border-b border-line bg-panel/50">
        {WEEKDAY_LABELS.map((d) => (
          <div
            className="py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-mute"
            key={d}
          >
            {d[0]}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {u.map((d, f) => {
          const p = toISO(d),
            y = Vendor_isSameMonth(d, cursor),
            g = byDay[p] || [],
            k = holidayByDay[p],
            v = p === todayIso,
            m = p === selectedIso,
            x = h.has(d.getDay()),
            b = Array.from(new Set(g.map((N) => N.type)));
          return (
            <div
              ref={m ? selRef : void 0}
              className={`relative min-h-[46px] border-b border-r border-line-soft p-1 last:border-r-0 [&:nth-child(7n)]:border-r-0 ${m ? "z-10 bg-accent-soft/60 ring-2 ring-inset ring-accent" : y ? (x ? "bg-panel/30" : "") : "bg-panel/40"}`}
              key={p}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10.5px] font-bold tabular ${v ? "bg-accent-strong text-white" : m ? "bg-accent-soft text-accent-ink" : y ? (k ? "text-warning-ink" : "text-ink") : "text-ink-mute/60"}`}
                >
                  {d.getDate()}
                </span>
                {k && !v && (
                  <span
                    className="h-1 w-1 rounded-full bg-warning"
                    title={k.name}
                  />
                )}
              </div>
              {b.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {b.slice(0, 3).map((N) => {
                    var R, E, T;
                    const _ = g.find((C) => C.type === N),
                      j = _.status === "pending",
                      S =
                        ((R = ptoTypeById(N)) == null ? void 0 : R.color) ||
                        "var(--c-ink-mute)";
                    return (
                      <button
                        type="button"
                        onClick={() => openEntry(p, _)}
                        title={`${(E = ptoTypeById(N)) == null ? void 0 : E.name} · ${_.status}`}
                        aria-label={`Open ${(T = ptoTypeById(N)) == null ? void 0 : T.name} on ${p}`}
                        className="h-1.5 w-1.5 rounded-full outline-none ring-offset-1 focus-visible:ring-2 focus-visible:ring-accent"
                        style={{
                          background: j
                            ? `color-mix(in oklch, ${S} 15%, var(--c-card))`
                            : S,
                          border: j ? `1px dashed ${S}` : "none",
                        }}
                        key={N}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
export function PersonWeek({
  days: days,
  byDay: byDay,
  holidayByDay: holidayByDay,
  normalDaysOff: normalDaysOff,
  todayIso: todayIso,
  selectedIso: selectedIso,
  selRef: selRef,
  openEntry: openEntry,
}) {
  const l = new Set(normalDaysOff);
  return days.some((h) => (byDay[toISO(h)] || []).length > 0) ? (
    <ul className="overflow-hidden rounded-card border border-line bg-card">
      {days.map((h) => {
        const d = toISO(h),
          f = byDay[d] || [],
          p = holidayByDay[d],
          y = d === todayIso,
          g = d === selectedIso;
        return (
          <li
            ref={g ? selRef : void 0}
            className={`flex items-start gap-3 border-b border-line-soft px-3 py-2 last:border-b-0 ${g ? "bg-accent-soft/60 ring-1 ring-inset ring-accent-line" : l.has(h.getDay()) ? "bg-panel/25" : ""}`}
            key={d}
          >
            <div className="w-11 shrink-0 pt-0.5">
              <p
                className={`text-[10px] font-semibold uppercase tracking-wide ${g ? "text-accent-ink" : "text-ink-mute"}`}
              >
                {Vendor_format(h, "EEE")}
              </p>
              <p
                className={`text-[15px] font-bold tabular leading-tight ${y || g ? "text-accent-ink" : "text-ink"}`}
              >
                {h.getDate()}
              </p>
            </div>
            <div className="flex flex-1 flex-wrap items-center gap-1.5 pt-0.5">
              {f.length === 0 ? (
                <span className="text-[12px] text-ink-mute/70">
                  {p ? p.name : "—"}
                </span>
              ) : (
                f.map((k, v) => (
                  <PersonEntry
                    entry={k}
                    onClick={() => openEntry(d, k)}
                    key={`${k.type}-${v}`}
                  />
                ))
              )}
            </div>
          </li>
        );
      })}
    </ul>
  ) : (
    <NoPersonLeave range="this week" />
  );
}
export function PersonDay({
  day: day,
  byDay: byDay,
  holidayByDay: holidayByDay,
  todayIso: todayIso,
  selectedIso: selectedIso,
  selRef: selRef,
  openEntry: openEntry,
}) {
  const c = toISO(day),
    l = byDay[c] || [],
    u = holidayByDay[c],
    h = c === selectedIso,
    d = h
      ? "ring-2 ring-inset ring-accent bg-accent-soft/25"
      : "border border-line";
  return l.length === 0 ? (
    <div className={`rounded-card bg-card ${d}`}>
      <EmptyState
        icon={Vendor_CalendarX}
        title={u ? u.name : "Nothing scheduled"}
        description={
          u
            ? "Company holiday."
            : `No time off on ${Vendor_format(day, "EEE, MMM d")}.`
        }
        className="py-8"
      />
    </div>
  ) : (
    <div
      ref={h ? selRef : void 0}
      className={`space-y-2 rounded-card bg-card p-3 ${d}`}
    >
      {h && (
        <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-accent-ink">
          {"Next time off"}
        </p>
      )}
      {u && (
        <p className="text-[12px] font-semibold text-warning-ink">{u.name}</p>
      )}
      {l.map((f, p) => (
        <button
          type="button"
          onClick={() => openEntry(c, f)}
          className="flex w-full items-center gap-2.5 rounded-btn border border-line bg-card p-2.5 text-left hover:bg-panel focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          key={`${f.type}-${p}`}
        >
          <PersonEntry entry={f} />
          <span className="ml-auto tabular text-[12px] text-ink-mute">
            {formatDateRange(f.start, f.end)}
          </span>
        </button>
      ))}
    </div>
  );
}
export function PersonEntry({ entry: entry, onClick: onClick }) {
  const { ptoTypeById: ptoTypeById } = useCatalog(),
    r = ptoTypeById(entry.type),
    s = (r == null ? void 0 : r.color) || "var(--c-ink-mute)",
    i = entry.status === "pending";
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-chip px-2 py-0.5 text-[11px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent"
      style={{
        color: `color-mix(in oklch, ${s} 64%, var(--c-ink))`,
        background: i
          ? `color-mix(in oklch, ${s} 11%, var(--c-card))`
          : `color-mix(in oklch, ${s} 20%, var(--c-card))`,
        border: i
          ? `1px dashed color-mix(in oklch, ${s} 50%, transparent)`
          : `1px solid color-mix(in oklch, ${s} 34%, transparent)`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{
          background: s,
        }}
      />
      {r == null ? void 0 : r.name}
      {i ? " · pending" : ""}
    </button>
  );
}
export function NoPersonLeave({ range: range }) {
  return (
    <div className="rounded-card border border-line bg-card">
      <EmptyState
        icon={Vendor_CalendarX}
        title="No time off"
        description={`Nothing scheduled ${range}.`}
        className="py-8"
      />
    </div>
  );
}
export const a2 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const Tc = 440;
export const Cc = 920;
export let Yp = 620;
export function EmployeeProfile({
  open: open,
  viewer: viewer,
  person: person,
  detail: detail,
  todayIso: todayIso,
  onClose: onClose,
  onStartOnBehalf: onStartOnBehalf,
  onEditConfig: onEditConfig,
  onOpenRequest: onOpenRequest,
  onSaveNormalDaysOff: onSaveNormalDaysOff,
}) {
  const h = React.useRef(null),
    d = React.useRef(null),
    { mounted: mounted, closing: closing } = usePresence(open),
    y = React.useRef(person);
  person && (y.current = person);
  const g = person ?? y.current,
    [k, v] = React.useState(!0),
    [m, x] = React.useState(Yp),
    [b, N] = React.useState(!1);
  (React.useEffect(() => {
    const I = window.matchMedia("(min-width: 640px)"),
      D = () => v(I.matches);
    return (
      D(),
      I.addEventListener("change", D),
      () => I.removeEventListener("change", D)
    );
  }, []),
    React.useEffect(() => {
      if (!open) return;
      d.current = document.activeElement;
      const I = (q) => {
        (q.key === "Escape" && (onClose == null || onClose()),
          q.key === "Tab" && trapPersonFocus(q, h.current));
      };
      (document.addEventListener("keydown", I),
        (document.body.style.overflow = "hidden"));
      const D = setTimeout(() => {
        var q;
        return (q = h.current) == null ? void 0 : q.focus();
      }, 30);
      return () => {
        var q, Z;
        (document.removeEventListener("keydown", I),
          (document.body.style.overflow = ""),
          clearTimeout(D),
          (Z = (q = d.current) == null ? void 0 : q.focus) == null ||
            Z.call(q));
      };
    }, [open, onClose]));
  const _ = (I) =>
      Math.max(Tc, Math.min(Cc, Math.min(window.innerWidth - 72, I))),
    j = (I) => {
      const D = _(I);
      ((Yp = D), x(D));
    },
    S = (I) => {
      (I.preventDefault(), N(!0));
      const D = (Z) => j(window.innerWidth - Z.clientX),
        q = () => {
          (N(!1),
            (document.body.style.userSelect = ""),
            window.removeEventListener("pointermove", D),
            window.removeEventListener("pointerup", q));
        };
      ((document.body.style.userSelect = "none"),
        window.addEventListener("pointermove", D),
        window.addEventListener("pointerup", q));
    },
    R = (I) => {
      I.key === "ArrowLeft"
        ? (I.preventDefault(), j(m + 32))
        : I.key === "ArrowRight"
          ? (I.preventDefault(), j(m - 32))
          : I.key === "Home"
            ? (I.preventDefault(), j(Cc))
            : I.key === "End" && (I.preventDefault(), j(Tc));
    };
  if (!mounted || !g) return null;
  const E = canViewPerson(viewer, g),
    T = canManagePerson(viewer, g),
    C = (viewer == null ? void 0 : viewer.id) === g.id,
    H = T || C;
  return ReactDOM.createPortal(
    <div
      className={`fixed inset-0 z-50 ${closing ? "pointer-events-none" : ""}`}
    >
      <div
        className={`absolute inset-0 bg-navy/30 backdrop-blur-[2px] ${closing ? "animate-fade-out" : "animate-fade-in"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={h}
        role="dialog"
        aria-modal="true"
        aria-label={`${g.name} details`}
        tabIndex={-1}
        style={
          k
            ? {
                width: m,
              }
            : void 0
        }
        className={`absolute inset-0 flex flex-col bg-card shadow-pop outline-none sm:inset-y-0 sm:right-0 sm:left-auto ${closing ? "animate-slide-out-down sm:animate-slide-out-right" : `sm:animate-slide-in-right ${b ? "" : "animate-slide-in-up"}`}`}
      >
        {k && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panel"
            aria-valuenow={Math.round(m)}
            aria-valuemin={Tc}
            aria-valuemax={Cc}
            tabIndex={0}
            onPointerDown={S}
            onKeyDown={R}
            onDoubleClick={() => j(620)}
            className="group absolute inset-y-0 left-0 z-20 hidden w-2.5 -translate-x-1/2 cursor-col-resize items-center justify-center outline-none sm:flex"
            title="Drag to resize (double-click to reset)"
          >
            <span
              className={`h-12 w-1 rounded-full transition-colors ${b ? "bg-accent" : "bg-line group-hover:bg-accent-line group-focus-visible:bg-accent"}`}
            />
          </div>
        )}
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={g.name} id={g.id} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-[17px] font-bold tracking-tight text-ink">
                {g.name}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <UserTeams user={g} variant="inline" />
                {C && (
                  <span className="rounded-chip bg-panel px-1.5 py-0.5 text-[10px] font-semibold text-ink-mute">
                    {"You"}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-btn text-ink-mute hover:bg-panel hover:text-ink"
            aria-label="Close"
          >
            <Vendor_X size={18} />
          </button>
        </header>
        <div className="scrollbar-slim flex-1 overflow-y-auto px-5 py-4">
          {detail === null ? (
            <PersonSkeleton full={E} />
          ) : (
            <div className="space-y-6">
              {T && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onStartOnBehalf == null ? void 0 : onStartOnBehalf(g)
                    }
                  >
                    <Vendor_CalendarPlus size={15} />
                    {" Add time off"}
                  </Button>
                  {isGodAdmin(viewer == null ? void 0 : viewer.role) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        onEditConfig == null ? void 0 : onEditConfig(g)
                      }
                    >
                      <Vendor_SlidersHorizontal size={15} />
                      {" Edit config"}
                    </Button>
                  )}
                </div>
              )}
              {E ? (
                <PersonBalances balances={detail.balances} />
              ) : (
                <PrivateLeaveNotice />
              )}
              <section>
                <h3 className="eyebrow mb-2.5">{"Calendar"}</h3>
                <PersonCalendar
                  requests={detail.requests}
                  holidays={detail.holidays}
                  normalDaysOff={detail.normalDaysOff}
                  todayIso={todayIso}
                  onOpenBar={(I) =>
                    onOpenRequest == null
                      ? void 0
                      : onOpenRequest(I.requestId || I.id)
                  }
                />
              </section>
              <PersonHistory
                requests={detail.requests}
                normalDaysOff={detail.normalDaysOff}
                todayIso={todayIso}
                showReason={E}
                onOpenRequest={onOpenRequest}
              />
              {E && (
                <NormalDaysOffEditor
                  normalDaysOff={detail.normalDaysOff}
                  editable={H}
                  onSave={(I) =>
                    onSaveNormalDaysOff == null
                      ? void 0
                      : onSaveNormalDaysOff(g, I)
                  }
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
export function PersonBalances({ balances: balances }) {
  const { ptoTypeById: ptoTypeById } = useCatalog();
  return (
    <section>
      <h3 className="eyebrow mb-2.5">{"Balances"}</h3>
      <div className="grid grid-cols-2 gap-x-5 gap-y-4 rounded-card border border-line bg-card p-4">
        {balances.map((n) => {
          var i;
          const r =
              ((i = ptoTypeById(n.typeId)) == null ? void 0 : i.color) ||
              "var(--c-ink-mute)",
            s = n.grant ? Math.min(100, (n.used / n.grant) * 100) : 0;
          return (
            <div className="min-w-0" key={n.typeId}>
              <div className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    background: r,
                  }}
                />
                <span className="truncate text-[11px] font-medium text-ink-mute">
                  {n.name}
                </span>
              </div>
              <p className="mt-1.5 flex items-baseline gap-1">
                <span className="text-[21px] font-bold leading-none tabular tracking-tight text-ink">
                  {n.remaining}
                </span>
                <span className="text-[11px] font-medium text-ink-mute">
                  {"/ "}
                  {n.grant}
                  {" left"}
                </span>
              </p>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${s}%`,
                    background: `color-mix(in oklch, ${r} 62%, var(--c-line))`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
export function PrivateLeaveNotice() {
  return (
    <div className="flex items-start gap-2.5 rounded-card border border-line bg-panel/50 px-3.5 py-3">
      <Vendor_Lock size={15} className="mt-0.5 shrink-0 text-ink-mute" />
      <p className="text-[12px] leading-snug text-ink-soft">
        {
          "You’re viewing limited details. Balances and request reasons are visible to this person’s team admins."
        }
      </p>
    </div>
  );
}
export function PersonHistory({
  requests: requests,
  normalDaysOff: normalDaysOff,
  todayIso: todayIso,
  showReason: showReason,
  onOpenRequest: onOpenRequest,
}) {
  const [i, o] = React.useState(!1),
    c = [...requests].sort((d, f) =>
      requestStart(d) < requestStart(f) ? 1 : -1,
    ),
    l = c.length,
    u = [...requests]
      .filter(
        (d) =>
          requestStart(d) >= todayIso &&
          (d.status === "approved" || d.status === "pending"),
      )
      .sort((d, f) => (requestStart(d) < requestStart(f) ? -1 : 1))[0],
    h = [];
  u && h.push(u);
  for (const d of c) {
    if (h.length >= 3) break;
    h.some((f) => f.id === d.id) || h.push(d);
  }
  return (
    <section>
      <div className="mb-2.5 flex items-baseline justify-between">
        <h3 className="eyebrow">{"Requests"}</h3>
        <span className="text-[11px] font-medium text-ink-mute tabular">
          {l}
          {" total"}
        </span>
      </div>
      {l === 0 ? (
        <div className="rounded-card border border-line bg-card">
          <EmptyState
            icon={Vendor_CalendarX}
            title="No requests"
            description="No time off requested yet."
            className="py-8"
          />
        </div>
      ) : (
        <>
          {u && !i && (
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-ink-mute">
              <Vendor_CalendarClock size={12} strokeWidth={2.5} />
              {" Next up"}
            </p>
          )}
          {i ? (
            <div className="overflow-hidden rounded-card border border-line bg-panel/30">
              <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
                <span className="text-[11px] font-semibold text-ink-soft">
                  {"All "}
                  {l}
                  {" · newest first"}
                </span>
                <span className="text-[10px] font-medium text-ink-mute">
                  {"scroll"}
                </span>
              </div>
              <div className="scrollbar-slim max-h-[268px] space-y-1.5 overflow-y-auto p-1.5">
                {c.map((d) => (
                  <PersonHistoryRow
                    r={d}
                    normalDaysOff={normalDaysOff}
                    showReason={showReason}
                    onClick={() =>
                      onOpenRequest == null ? void 0 : onOpenRequest(d.id)
                    }
                    key={d.id}
                  />
                ))}
              </div>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {h.map((d) => (
                <PersonHistoryRow
                  r={d}
                  normalDaysOff={normalDaysOff}
                  showReason={showReason}
                  onClick={() =>
                    onOpenRequest == null ? void 0 : onOpenRequest(d.id)
                  }
                  key={d.id}
                />
              ))}
            </ul>
          )}
          {l > h.length && (
            <button
              type="button"
              onClick={() => o((d) => !d)}
              className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-accent-ink hover:underline"
            >
              {i ? "Show less" : `View all ${l}`}
              <Vendor_ArrowUpRight
                size={13}
                className={
                  i ? "rotate-90 transition-transform" : "transition-transform"
                }
              />
            </button>
          )}
        </>
      )}
    </section>
  );
}
export function PersonHistoryRow({
  r: e,
  normalDaysOff: normalDaysOff,
  showReason: showReason,
  onClick: onClick,
}) {
  var h;
  const { ptoTypeById: ptoTypeById, ptoTypes: ptoTypes } = useCatalog(),
    o = requestLines(e),
    c = ptoTypeById((h = o[0]) == null ? void 0 : h.type),
    l = (c == null ? void 0 : c.color) || "var(--c-ink-mute)",
    u = requestDays(e, normalDaysOff);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-btn border border-line bg-card px-3 py-2.5 text-left transition-shadow hover:shadow-card"
    >
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-btn"
        style={{
          background: `color-mix(in oklch, ${l} 13%, var(--c-card))`,
          color: l,
        }}
      >
        <PtoTypeIcon typeId={c == null ? void 0 : c.id} size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-ink">
          {requestTypeLabel(e, ptoTypes)}
        </p>
        <p className="truncate text-[11px] text-ink-mute tabular">
          {requestRangeLabel(e)}
          {" · "}
          <span className="text-ink-soft">
            {u}
            {"d"}
          </span>
          {showReason && e.note && e.status !== "denied" ? (
            <span className="not-italic">
              {" · "}
              {e.note}
            </span>
          ) : (
            ""
          )}
        </p>
      </div>
      <StatusChip status={e.status} size="xs" />
    </button>
  );
}
export function NormalDaysOffEditor({
  normalDaysOff = [],
  editable = !1,
  onSave: onSave,
}) {
  const [r, s] = React.useState(normalDaysOff);
  React.useEffect(() => {
    s(normalDaysOff);
  }, [normalDaysOff]);
  const i = new Set(r),
    o = (c) => {
      const l = new Set(r);
      l.has(c) ? l.delete(c) : l.add(c);
      const u = [...l].sort((h, d) => h - d);
      (s(u), onSave == null || onSave(u));
    };
  return (
    <section>
      <div className="mb-2.5 flex items-baseline justify-between">
        <h3 className="eyebrow">{"Normal days off"}</h3>
        {editable && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-ink-mute">
            <Vendor_Pencil size={11} strokeWidth={2.25} />
            {" Tap to edit"}
          </span>
        )}
      </div>
      <div className="flex gap-1.5">
        {a2.map((c, l) => {
          const u = i.has(l),
            h = `flex h-8 flex-1 items-center justify-center rounded-btn text-[11px] font-semibold transition-colors ${u ? "bg-panel text-ink-mute" : "border border-line bg-card text-ink"}`,
            d = u ? `${c}: normally off` : `${c}: working`;
          return editable ? (
            <button
              type="button"
              onClick={() => o(l)}
              aria-pressed={u}
              title={`${d} (tap to toggle)`}
              className={`${h} outline-none hover:border-accent-line hover:text-ink focus-visible:ring-2 focus-visible:ring-accent ${u ? "hover:bg-accent-soft/60" : ""}`}
              key={c}
            >
              {c[0]}
            </button>
          ) : (
            <span className={h} title={d} key={c}>
              {c[0]}
            </span>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] text-ink-mute">
        {"Shaded days don’t count as charged PTO."}
      </p>
    </section>
  );
}
export function trapPersonFocus(e, t) {
  if (!t) return;
  const n = t.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  if (!n.length) return;
  const r = n[0],
    s = n[n.length - 1];
  e.shiftKey && document.activeElement === r
    ? (e.preventDefault(), s.focus())
    : !e.shiftKey &&
      document.activeElement === s &&
      (e.preventDefault(), r.focus());
}
export function PersonSkeleton({ full: full }) {
  return (
    <div className="space-y-6">
      {full && <div className="skeleton h-24 w-full rounded-card" />}
      <div className="skeleton h-52 w-full rounded-card" />
      <div className="space-y-1.5">
        <div className="skeleton h-12 w-full rounded-btn" />
        <div className="skeleton h-12 w-full rounded-btn" />
      </div>
    </div>
  );
}
