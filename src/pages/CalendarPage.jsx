import { useResource } from "../hooks/useResource.jsx";
import { toISO } from "../utils/dateHelpers.jsx";
import { rangesOverlap } from "../utils/dateHelpers.jsx";
import { format as Vendor_format } from "date-fns";
import { isBlackoutDay } from "../utils/policyEngine.jsx";
import { dateTypeMarks } from "../utils/policyEngine.jsx";
import { useCatalog } from "../context/CatalogContext.jsx";
import React from "react";
import { CalendarDays as Vendor_CalendarDays } from "lucide-react";
import { Ban as Vendor_Ban } from "lucide-react";
import { Avatar } from "../components/ui/Avatar.jsx";
import { firstName } from "../utils/constants.jsx";
import { PtoTypePill } from "../components/requests/RequestDetailModal.jsx";
import { StatusChip } from "../components/requests/RequestDetailModal.jsx";
import { Users as Vendor_Users } from "lucide-react";
import { Check as Vendor_Check } from "lucide-react";
import { Button } from "../components/ui/Button.jsx";
import { Plus as Vendor_Plus } from "lucide-react";
import { toDateLocal } from "../utils/dateHelpers.jsx";
import { useCurrentUser } from "../context/AuthContext.jsx";
import { useToday } from "../data/today.jsx";
import { useDataSource } from "../data/dataSource.jsx";
import { useRequestModal } from "../components/requests/RequestModalProvider.jsx";
import { canApprove } from "../utils/constants.jsx";
import { useVersion } from "../context/DataVersionContext.jsx";
import { useBumpVersion } from "../context/DataVersionContext.jsx";
import { useSearchParams as Vendor_useSearchParams } from "react-router-dom";
import { requestStart } from "../utils/requestHelpers.jsx";
import { lineEntriesForRequest } from "../utils/requestHelpers.jsx";
import { startOfWeek as Vendor_startOfWeek } from "date-fns";
import { eachDayOfInterval as Vendor_eachDayOfInterval } from "date-fns";
import { startOfMonth as Vendor_startOfMonth } from "date-fns";
import { endOfMonth as Vendor_endOfMonth } from "date-fns";
import { addDays as Vendor_addDays } from "date-fns";
import { fmtMonth } from "../utils/dateHelpers.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { CalendarX as Vendor_CalendarX } from "lucide-react";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { SegmentedControl } from "../components/ui/SegmentedControl.jsx";
import { addMonths as Vendor_addMonths } from "date-fns";
import { addWeeks as Vendor_addWeeks } from "date-fns";
import { ChevronLeft as Vendor_ChevronLeft } from "lucide-react";
import { ChevronRight as Vendor_ChevronRight } from "lucide-react";
import { FilterDropdown } from "../components/ui/FilterDropdown.jsx";
import { PersonPicker } from "../components/ui/PersonPicker.jsx";
import { MonthView } from "../components/calendar/CalendarViews.jsx";
import { WeekView } from "../components/calendar/CalendarViews.jsx";
import { TeamTimeline } from "../components/calendar/CalendarViews.jsx";
import { CalendarLegend } from "../components/calendar/CalendarViews.jsx";
import { RequestDetailModal } from "../components/requests/RequestDetailModal.jsx";
import { Modal } from "../components/ui/Modal.jsx";
export const Up = {
  approved: 0,
  pending: 1,
};
export function aggregateCoverage(e, t = "all") {
  return e.reduce((n, r) => {
    if (t !== "all" && r.teamId !== t) return n;
    const s = n[r.day] ?? {
      outCount: 0,
      onShiftCount: 0,
    };
    return (
      (s.outCount += r.outCount),
      (s.onShiftCount += r.onShiftCount),
      (n[r.day] = s),
      n
    );
  }, {});
}
export function buildMobileDays({
  days: days,
  requests: requests,
  holidays: holidays,
  todayIso: todayIso,
  coverageByDay: coverageByDay,
  ptoTypes: ptoTypes,
  dateRules: dateRules,
  blackouts: blackouts,
  aggregateOnly = !1,
}) {
  const u = {
    ptoTypes: ptoTypes,
    dateRules: dateRules,
    blackouts: blackouts,
  };
  return days.map((h) => {
    const d = toISO(h),
      f = requests
        .filter((g) => rangesOverlap(d, d, g.start, g.end))
        .sort((g, k) => (Up[g.status] ?? 2) - (Up[k.status] ?? 2)),
      p = new Set(f.map((g) => g.userId)).size,
      y = coverageByDay[d];
    return {
      date: h,
      iso: d,
      weekday: Vendor_format(h, "EEE"),
      dayNumber: Vendor_format(h, "d"),
      dateLabel: Vendor_format(h, "EEEE, MMMM d"),
      isToday: d === todayIso,
      isPast: d < todayIso,
      isWeekend: h.getDay() === 0 || h.getDay() === 6,
      holiday: holidays.find((g) => g.date === d),
      blackout: isBlackoutDay(h, blackouts),
      typeMarks: dateTypeMarks(h, u),
      entries: f,
      offCount: aggregateOnly ? ((y == null ? void 0 : y.outCount) ?? 0) : p,
      onShiftCount: aggregateOnly
        ? y == null
          ? void 0
          : y.onShiftCount
        : void 0,
    };
  });
}
export function MobileCalendar({
  days: days,
  requests: requests,
  holidays: holidays,
  todayIso: todayIso,
  coverageByDay: coverageByDay,
  selectedIso: selectedIso,
  onSelectDay: onSelectDay,
  onRequestDay: onRequestDay,
  onChipClick: onChipClick,
  highlight: highlight,
  aggregateOnly = !1,
  hasActiveFilters = !1,
}) {
  const {
      ptoTypes: ptoTypes,
      dateRules: dateRules,
      blackouts: blackouts,
      ptoTypeById: ptoTypeById,
      userById: userById,
    } = useCatalog(),
    v = React.useMemo(
      () =>
        buildMobileDays({
          days: days,
          requests: requests,
          holidays: holidays,
          todayIso: todayIso,
          coverageByDay: coverageByDay,
          ptoTypes: ptoTypes,
          dateRules: dateRules,
          blackouts: blackouts,
          aggregateOnly: aggregateOnly,
        }),
      [
        days,
        requests,
        holidays,
        todayIso,
        coverageByDay,
        ptoTypes,
        dateRules,
        blackouts,
        aggregateOnly,
      ],
    ),
    m = v.find((x) => x.iso === selectedIso) || v[0];
  return m ? (
    <section className="space-y-3" aria-label="Weekly time-off agenda">
      <div className="rounded-card border border-line bg-card p-1.5 shadow-card">
        <div className="grid grid-cols-7 gap-0.5">
          {v.map((x) => {
            const b = x.iso === m.iso;
            return (
              <button
                type="button"
                onClick={() => onSelectDay(x.iso)}
                aria-pressed={b}
                aria-label={`${x.dateLabel}, ${x.offCount} off`}
                className={`flex min-w-0 flex-col items-center rounded-btn px-0.5 py-2 transition-colors duration-[120ms] ${b ? "bg-accent-soft text-accent-ink" : "text-ink active:bg-panel"}`}
                key={x.iso}
              >
                <span
                  className={`text-[9px] font-bold uppercase tracking-[0.06em] ${b ? "text-accent-ink" : "text-ink-mute"}`}
                >
                  {x.weekday}
                </span>
                <span
                  className={`mt-1 grid h-7 w-7 place-items-center rounded-full text-sm font-bold tabular ${x.isToday ? "bg-accent-strong text-navy-fg" : b ? "bg-card text-accent-ink shadow-card" : x.isWeekend ? "text-ink-mute" : "text-ink"}`}
                >
                  {x.dayNumber}
                </span>
                <span
                  className={`mt-1 text-[9px] font-semibold tabular ${x.offCount > 0 ? "text-warning-ink" : "text-ink-mute"}`}
                >
                  {x.offCount > 0 ? `${x.offCount} off` : "Clear"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="overflow-hidden rounded-card border border-line bg-card shadow-raised">
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-base font-bold tracking-tight text-ink">
              {m.dateLabel}
            </p>
            <p className="mt-0.5 text-xs text-ink-mute">
              {m.entries.length > 0
                ? "Tap a person to view the request"
                : m.isToday
                  ? "Today"
                  : m.isPast
                    ? "Past day"
                    : "Open for requests"}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular ${m.offCount > 0 ? "bg-warning-soft text-warning-ink" : "bg-success-soft text-success-ink"}`}
          >
            {m.offCount > 0
              ? `${m.offCount} off${m.onShiftCount == null ? "" : `, ${m.onShiftCount} in`}`
              : "Everyone in"}
          </span>
        </div>
        {(m.holiday || m.blackout || m.typeMarks.length > 0) && (
          <div className="space-y-2 border-b border-line-soft bg-panel/35 px-4 py-3">
            {m.holiday && (
              <CalendarAlert
                icon={Vendor_CalendarDays}
                label={m.holiday.name}
                tone="warning"
              />
            )}
            {m.blackout && (
              <CalendarAlert
                icon={Vendor_Ban}
                label="Blackout, no leave can be requested"
                tone="danger"
              />
            )}
            {m.typeMarks.map((x) => (
              <div
                className="flex items-center gap-2 text-xs font-medium text-ink-soft"
                key={`${x.kind}:${x.id}`}
              >
                <span
                  className={`h-2.5 w-5 shrink-0 rounded-chip ${x.kind === "blackout" ? "hatch-type" : ""}`}
                  style={
                    x.kind === "blackout"
                      ? {
                          "--hatch-ink": x.color,
                        }
                      : {
                          background: x.color,
                        }
                  }
                  aria-hidden="true"
                />
                {x.name} {x.kind === "blackout" ? "blackout" : "request window"}
              </div>
            ))}
          </div>
        )}
        {m.entries.length > 0 ? (
          <ul>
            {m.entries.map((x) => {
              const b = userById(x.userId),
                N = ptoTypeById(x.type),
                _ =
                  (x.requestId || x.id) ===
                  (highlight == null ? void 0 : highlight.id);
              return (
                <li
                  className="border-t border-line-soft first:border-t-0"
                  key={x.lineKey || x.id}
                >
                  <button
                    type="button"
                    onClick={() => onChipClick(x)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-panel ${_ ? "bg-accent-soft/60 ring-1 ring-inset ring-accent-line" : ""}`}
                  >
                    <Avatar
                      name={b == null ? void 0 : b.name}
                      id={b == null ? void 0 : b.id}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {firstName(b == null ? void 0 : b.name)}
                      </span>
                      <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <PtoTypePill
                          typeId={N == null ? void 0 : N.id}
                          size="xs"
                        />
                        <span className="text-[11px] text-ink-mute tabular">
                          {calendarRangeLabel(x.start, x.end)}
                        </span>
                      </span>
                    </span>
                    <StatusChip
                      status={x.status}
                      size="xs"
                      className="shrink-0"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : m.offCount > 0 && aggregateOnly ? (
          <div className="flex items-start gap-3 px-4 py-4">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-warning-soft text-warning-ink">
              <Vendor_Users size={16} />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">
                {m.offCount} {m.offCount === 1 ? "person is" : "people are"}
                {" off"}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-mute">
                {"Names and leave types stay private."}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-4">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-success-soft text-success-ink">
              <Vendor_Check size={16} strokeWidth={2.5} />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">
                {hasActiveFilters ? "No matching time off" : "No one is off"}
              </p>
              <p className="mt-0.5 text-xs text-ink-mute">
                {hasActiveFilters
                  ? "Change the filters to see other entries."
                  : "Everyone is in on this day."}
              </p>
            </div>
          </div>
        )}
        {!m.isPast && !m.blackout && (
          <div className="border-t border-line-soft bg-panel/25 px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onRequestDay(m.iso)}
            >
              <Vendor_Plus size={15} />
              {" Request this day"}
            </Button>
          </div>
        )}
      </div>
    </section>
  ) : null;
}
export function CalendarAlert({
  icon: LocalComponent_icon,
  label: label,
  tone: tone,
}) {
  const r = tone === "danger" ? "text-danger-ink" : "text-warning-ink";
  return (
    <div className={`flex items-center gap-2 text-xs font-semibold ${r}`}>
      <LocalComponent_icon size={14} strokeWidth={2.25} />
      {label}
    </div>
  );
}
export function calendarRangeLabel(e, t) {
  if (e === t) return "One day";
  const n = toDateLocal(e),
    r = toDateLocal(t);
  return n.getMonth() === r.getMonth()
    ? `${Vendor_format(n, "MMM d")} to ${Vendor_format(r, "d")}`
    : `${Vendor_format(n, "MMM d")} to ${Vendor_format(r, "MMM d")}`;
}
export const CALENDAR_STATUSES = [
  {
    id: "approved",
    label: "Approved",
  },
  {
    id: "pending",
    label: "Pending",
  },
];
export function CalendarPage() {
  var lh, ch;
  const e = useCurrentUser(),
    t = useToday(),
    { getRequests: getRequests, coverageForRange: coverageForRange } =
      useDataSource(),
    {
      users: users,
      teams: teams,
      ptoTypes: ptoTypes,
      holidays: holidays,
      userById: userById,
      teamById: teamById,
    } = useCatalog(),
    { openRequest: openRequest } = useRequestModal(),
    d = canApprove(e.role),
    [y, g] = React.useState(!1),
    [k, v] = React.useState(
      () =>
        typeof window < "u" && window.matchMedia("(max-width: 639px)").matches,
    ),
    [m, x] = React.useState(() =>
      typeof window < "u" && window.matchMedia("(max-width: 639px)").matches
        ? "week"
        : "month",
    ),
    [b, N] = React.useState(toDateLocal(t)),
    [_, j] = React.useState(t),
    [S, R] = React.useState(() => new Set(ptoTypes.map((O) => O.id))),
    [E, T] = React.useState(new Set(["approved", "pending"])),
    [C, H] = React.useState(e.role === "admin" ? e.team : "all"),
    [I, D] = React.useState("all"),
    [q, Z] = React.useState(!1),
    [P, $] = React.useState(null),
    [U, X] = React.useState(null),
    [V, he] = React.useState(null),
    K = useVersion(),
    A = useBumpVersion(),
    [fe, ye] = Vendor_useSearchParams();
  const { data: f = null } = useResource(
    ["calendar-requests"],
    async () => ({
      requests: await getRequests(),
    }),
    true,
  );
  (React.useEffect(() => {
    const O = window.matchMedia("(max-width: 639px)"),
      te = (ge) => {
        (v(ge.matches), ge.matches && x("week"));
      };
    return (
      O.addEventListener("change", te),
      () => O.removeEventListener("change", te)
    );
  }, []),
    void 0);
  const Q = (f == null ? void 0 : f.requests) ?? [];
  React.useEffect(() => {
    const O = fe.get("req");
    if (!O) return;
    const te = Q.find((ge) => ge.id === O);
    if (te) {
      const ge = requestStart(te);
      (N(toDateLocal(ge)), j(ge), he(O));
    }
    ye(
      {},
      {
        replace: !0,
      },
    );
  }, [fe, Q, ye]);
  const Y = V ? Q.find((O) => O.id === V) : null,
    ee = React.useMemo(
      () =>
        e.role === "god_admin"
          ? C === "all"
            ? users
            : users.filter((O) => O.team === C)
          : users.filter((O) => O.team === e.team),
      [e, C, users],
    );
  React.useEffect(() => {
    I !== "all" && !ee.some((O) => O.id === I) && D("all");
  }, [ee, I]);
  const Pe = React.useMemo(() => {
      const O = {};
      return (
        users.forEach((te) => {
          te.team && (O[te.team] = (O[te.team] || 0) + 1);
        }),
        [
          {
            value: "all",
            label: "All teams",
            hint: users.filter((te) => te.team).length,
          },
          ...teams.map((te) => ({
            value: te.id,
            label: te.name,
            hint: O[te.id] || 0,
          })),
        ]
      );
    }, [users]),
    ve = I !== "all" ? userById(I) : null,
    _e = React.useMemo(() => {
      const O = Q.flatMap((te) => {
        const ge = userById(te.userId);
        if (e.role === "employee") {
          if ((ge == null ? void 0 : ge.team) !== e.team) return [];
        } else if (e.role === "admin") {
          if ((ge == null ? void 0 : ge.team) !== e.team) return [];
        } else if (C !== "all" && (ge == null ? void 0 : ge.team) !== C)
          return [];
        return I !== "all" && te.userId !== I
          ? []
          : E.has(te.status)
            ? lineEntriesForRequest(te).filter((jn) => S.has(jn.type))
            : [];
      });
      return (
        Y &&
          !O.some((te) => te.requestId === Y.id) &&
          O.push(...lineEntriesForRequest(Y)),
        O
      );
    }, [Q, e, C, I, S, E, Y]),
    Mt = React.useMemo(
      () =>
        ve ? [ve] : C === "all" ? users : users.filter((O) => O.team === C),
      [C, ve, users],
    ),
    mt = [
      {
        value: "month",
        label: "Month",
      },
      {
        value: "week",
        label: "Week",
      },
      d && {
        value: "timeline",
        label: "Timeline",
      },
    ].filter(Boolean),
    jt = Vendor_startOfWeek(b, {
      weekStartsOn: 0,
    }),
    W = React.useMemo(
      () =>
        m === "month"
          ? Vendor_eachDayOfInterval({
              start: Vendor_startOfMonth(b),
              end: Vendor_endOfMonth(b),
            })
          : m === "week"
            ? Array.from(
                {
                  length: 7,
                },
                (O, te) => Vendor_addDays(jt, te),
              )
            : Array.from(
                {
                  length: 14,
                },
                (O, te) => Vendor_addDays(jt, te),
              ),
      [m, b],
    );
  const { data: B = [] } = useResource(
    ["coverage", toISO(W[0]), toISO(W[W.length - 1])],
    () => coverageForRange(toISO(W[0]), toISO(W[W.length - 1])),
    true,
  );
  (React.useEffect(() => {
    if (!k || W.some((te) => toISO(te) === _)) return;
    const O = W.find((te) => toISO(te) === t);
    j(toISO(O || W[0]));
  }, [k, W, _, t]),
    void 0);
  const we = e.role === "god_admin" ? C : e.team,
    be = React.useMemo(() => aggregateCoverage(B, we), [B, we]),
    cn = m === "month" ? fmtMonth(b) : weekRangeLabel(W[0], W[W.length - 1]),
    un = m === "month" ? "month" : m === "week" ? "week" : "fortnight",
    Dt = React.useMemo(() => {
      const O = new Set();
      let te = {
        count: 0,
        d: W[0],
      };
      return (
        W.forEach((ge) => {
          const jn = toISO(ge),
            zl = new Set(
              _e
                .filter((Qr) => rangesOverlap(jn, jn, Qr.start, Qr.end))
                .map((Qr) => Qr.userId),
            );
          (zl.forEach((Qr) => O.add(Qr)),
            zl.size > te.count &&
              (te = {
                count: zl.size,
                d: ge,
              }));
        }),
        {
          offCount: O.size,
          peak: te,
        }
      );
    }, [W, _e]),
    Jr = W.reduce(
      (O, te) => {
        const ge = be[toISO(te)];
        return (ge == null ? void 0 : ge.outCount) > O.outCount
          ? {
              day: te,
              outCount: ge.outCount,
            }
          : O;
      },
      {
        day: W[0],
        outCount: 0,
      },
    ),
    Na =
      e.role === "employee"
        ? Jr.outCount > 0
          ? `${Jr.outCount} out on the busiest day, ${Vendor_format(Jr.day, "EEE MMM d")}. Names and leave types stay private.`
          : `Everyone is in this ${un}.`
        : ve
          ? Dt.offCount > 0
            ? `${firstName(ve.name)} has time off this ${un}.`
            : `${firstName(ve.name)} is in all ${un}.`
          : Dt.offCount === 0
            ? `Everyone is in this ${un}.`
            : Dt.peak.count >= 2
              ? `${Dt.offCount} ${Dt.offCount === 1 ? "person" : "people"} off this ${un} · busiest ${Vendor_format(Dt.peak.d, "EEE MMM d")} (${Dt.peak.count} off)`
              : `${Dt.offCount} ${Dt.offCount === 1 ? "person" : "people"} off this ${un}.`,
    Sa = ve
      ? ve.name
      : e.role === "god_admin"
        ? C === "all"
          ? "All teams"
          : (lh = teamById(C)) == null
            ? void 0
            : lh.name
        : ((ch = teamById(e.team)) == null ? void 0 : ch.name) || "Coverage",
    F =
      (S.size < ptoTypes.length ? 1 : 0) +
      (E.size < CALENDAR_STATUSES.length ? 1 : 0),
    se = W[W.length - 1],
    pe =
      _e
        .filter((O) => toDateLocal(O.start) > se)
        .sort((O, te) => (O.start < te.start ? -1 : 1))[0] || null;
  function tt() {
    pe && (N(toDateLocal(pe.start)), j(pe.start), he(pe.requestId || pe.id));
  }
  function Lt(O) {
    const te = typeof O == "function" ? O(b) : O;
    (he(null), N(te), k && j(toISO(te)));
  }
  const ei = (O, te, ge) => {
    const jn = new Set(O);
    (jn.has(ge) ? jn.delete(ge) : jn.add(ge), te(jn));
  };
  function Ea(O, te) {
    te ? X(te) : $(O.requestId || O.id);
  }
  return y ? (
    <div className="rounded-card border border-line bg-card shadow-card">
      <EmptyState
        icon={Vendor_CalendarX}
        title="Couldn't load the calendar"
        description="Something went wrong fetching time off. Give it another try."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            {"Try again"}
          </Button>
        }
      />
    </div>
  ) : f === null ? (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" rounded="rounded" />
          <Skeleton className="h-7 w-44" rounded="rounded" />
          <Skeleton className="h-3.5 w-60" rounded="rounded" />
        </div>
        <Skeleton className="h-9 w-48" rounded="rounded-btn" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-44" rounded="rounded-btn" />
        <Skeleton className="h-9 w-40" rounded="rounded-btn" />
      </div>
      <Skeleton className="h-[62vh] w-full" rounded="rounded-card" />
    </div>
  ) : (
    <div className="flex min-h-0 flex-1 flex-col gap-4 sm:gap-5">
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">{Sa}</p>
          <h1 className="mt-1.5 text-[26px] font-bold leading-none tracking-tight text-ink">
            {cn}
          </h1>
          <p className="mt-2 text-[13px] font-medium text-ink-soft">{Na}</p>
        </div>
        <div className="hidden sm:block">
          <SegmentedControl
            options={mt}
            value={m}
            onChange={x}
            size="sm"
            className="shrink-0"
          />
        </div>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() =>
                Lt((O) =>
                  m === "month"
                    ? Vendor_addMonths(O, -1)
                    : Vendor_addWeeks(O, m === "timeline" ? -2 : -1),
                )
              }
              className="grid h-9 w-9 place-items-center rounded-btn border border-line bg-card text-ink-soft transition-colors hover:bg-panel"
              aria-label="Previous period"
            >
              <Vendor_ChevronLeft size={18} />
            </button>
            <button
              onClick={() =>
                Lt((O) =>
                  m === "month"
                    ? Vendor_addMonths(O, 1)
                    : Vendor_addWeeks(O, m === "timeline" ? 2 : 1),
                )
              }
              className="grid h-9 w-9 place-items-center rounded-btn border border-line bg-card text-ink-soft transition-colors hover:bg-panel"
              aria-label="Next period"
            >
              <Vendor_ChevronRight size={18} />
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => Lt(toDateLocal(t))}
          >
            {"Today"}
          </Button>
          {d && (
            <span className="hidden sm:inline-flex">
              <Button
                variant="outline"
                size="sm"
                onClick={tt}
                disabled={!pe}
                title={
                  ve
                    ? `Jump to ${firstName(ve.name)}'s next time off`
                    : "Jump to the next day someone's off"
                }
              >
                {ve ? `${firstName(ve.name)}'s next off` : "Next off"}
              </Button>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {e.role === "god_admin" && (
            <FilterDropdown
              options={Pe}
              value={C}
              onChange={H}
              leadingIcon={Vendor_Users}
              size="sm"
              searchable={!0}
              searchPlaceholder="Search teams…"
              ariaLabel="Filter by team"
            />
          )}
          {d && <PersonPicker people={ee} value={I} onChange={D} />}
          <Button
            variant={q ? "navy" : "outline"}
            size="sm"
            onClick={() => Z((O) => !O)}
          >
            {"Filters"}
            {F > 0 && (
              <span
                className={`ml-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold tabular ${q ? "bg-navy-fg/20 text-navy-fg" : "bg-accent-soft text-accent-ink"}`}
              >
                {F}
              </span>
            )}
          </Button>
        </div>
      </div>
      {q && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-card border border-line bg-card px-4 py-3 shadow-card animate-fade-up">
          <FilterGroup label="Type">
            {ptoTypes.map((O) => (
              <StatusFilter
                active={S.has(O.id)}
                onClick={() => ei(S, R, O.id)}
                color={O.color}
                key={O.id}
              >
                {O.name}
              </StatusFilter>
            ))}
          </FilterGroup>
          <FilterGroup label="Status">
            {CALENDAR_STATUSES.map((O) => (
              <StatusFilter
                active={E.has(O.id)}
                onClick={() => ei(E, T, O.id)}
                key={O.id}
              >
                {O.label}
              </StatusFilter>
            ))}
          </FilterGroup>
        </div>
      )}
      <div className="sm:hidden">
        <MobileCalendar
          days={W}
          requests={_e}
          holidays={holidays}
          todayIso={t}
          coverageByDay={be}
          selectedIso={_}
          onSelectDay={j}
          onRequestDay={(O) =>
            openRequest({
              start: O,
              end: O,
            })
          }
          onChipClick={Ea}
          highlight={Y}
          aggregateOnly={e.role === "employee"}
          hasActiveFilters={F > 0 || I !== "all"}
        />
      </div>
      <div
        className={`hidden min-h-0 flex-col animate-fade-in sm:flex ${m === "month" ? "flex-none" : "flex-1"}`}
        key={m}
      >
        {m === "month" && (
          <MonthView
            monthDate={b}
            requests={_e}
            holidays={holidays}
            todayIso={t}
            highlight={Y}
            onChipClick={Ea}
            onEmptyClick={(O) => {
              toISO(O) >= t &&
                openRequest({
                  start: toISO(O),
                  end: toISO(O),
                });
            }}
            coverageByDay={be}
          />
        )}
        {m === "week" && (
          <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
            <WeekView
              anchorDate={b}
              requests={_e}
              holidays={holidays}
              todayIso={t}
              highlight={Y}
              onChipClick={Ea}
              onEmptyClick={(O) => {
                toISO(O) >= t &&
                  openRequest({
                    start: toISO(O),
                    end: toISO(O),
                  });
              }}
              coverageByDay={be}
            />
          </div>
        )}
        {m === "timeline" && (
          <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
            <TeamTimeline
              anchorDate={b}
              members={Mt}
              requests={_e}
              holidays={holidays}
              todayIso={t}
              highlight={Y}
              onChipClick={Ea}
            />
          </div>
        )}
      </div>
      <div className="hidden sm:block">
        <CalendarLegend />
      </div>
      <RequestDetailModal
        requestId={P}
        open={!!P}
        onClose={() => $(null)}
        onChanged={A}
      />
      <Modal open={!!U} onClose={() => X(null)} title="All entries" size="sm">
        {U && (
          <ul className="space-y-2">
            {U.map((O) => {
              var te, ge;
              return (
                <li key={O.lineKey || O.id}>
                  <button
                    onClick={() => {
                      (X(null), $(O.requestId || O.id));
                    }}
                    className="flex w-full items-center gap-2.5 rounded-btn border border-line p-2.5 text-left hover:bg-panel"
                  >
                    <Avatar
                      name={
                        (te = userById(O.userId)) == null ? void 0 : te.name
                      }
                      id={O.userId}
                      size="xs"
                    />
                    <span className="flex-1 text-sm font-medium text-ink">
                      {(ge = userById(O.userId)) == null ? void 0 : ge.name}
                    </span>
                    <PtoTypePill typeId={O.type} size="xs" />
                    <StatusChip status={O.status} size="xs" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </div>
  );
}
export function weekRangeLabel(e, t) {
  const n = e.getMonth() === t.getMonth();
  return `${Vendor_format(e, "MMM d")} – ${Vendor_format(t, n ? "d" : "MMM d")}`;
}
export function FilterGroup({ label: label, children: children }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-bold uppercase tracking-wide text-ink-mute">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}
export function StatusFilter({
  active: active,
  onClick: onClick,
  color: color,
  children: children,
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${active ? "border-ink/15 bg-panel text-ink" : "border-line text-ink-mute hover:text-ink"}`}
    >
      {color && (
        <span
          className="h-2 w-2 rounded-full"
          style={{
            background: active ? color : "var(--c-line)",
          }}
        />
      )}
      {children}
    </button>
  );
}
