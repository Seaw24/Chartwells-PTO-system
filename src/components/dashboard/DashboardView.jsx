import React from "react";
import { ChevronLeft as Vendor_ChevronLeft } from "lucide-react";
import { ChevronRight as Vendor_ChevronRight } from "lucide-react";
import { Users as Vendor_Users } from "lucide-react";
import { Link as Vendor_Link } from "react-router-dom";
import { ArrowUpRight as Vendor_ArrowUpRight } from "lucide-react";
import { CalendarRange as Vendor_CalendarRange } from "lucide-react";
import { addMonths as Vendor_addMonths } from "date-fns";
import { addWeeks as Vendor_addWeeks } from "date-fns";
import { useCatalog } from "../../context/CatalogContext.jsx";
import { useEntered } from "../../hooks/motion.jsx";
import { useCountUp } from "../../hooks/motion.jsx";
import { PtoTypeIcon } from "../ui/PtoTypeIcon.jsx";
import { StatusChip } from "../requests/RequestDetailModal.jsx";
import { FilterDropdown } from "../ui/FilterDropdown.jsx";
import { SegmentedControl } from "../ui/SegmentedControl.jsx";
import { Button } from "../ui/Button.jsx";
import { toDateLocal } from "../../utils/dateHelpers.jsx";
import { toISO } from "../../utils/dateHelpers.jsx";
import { belongsToTeam } from "../../utils/constants.jsx";
import { buildTeamTimeline } from "../team/TeamTimeline.jsx";
import { initialTeamLayout } from "../team/TeamTimeline.jsx";
import { DesktopTeamTimeline } from "../team/TeamTimeline.jsx";
import { MobileTeamTimeline } from "../team/TeamTimeline.jsx";
export function PersonalSummary({ personal: personal }) {
  const { ptoTypeById: ptoTypeById } = useCatalog(),
    { balances = [], upcoming = [], pending = [] } = personal;
  return (
    <section aria-label="Your time off" className="mt-2">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="eyebrow">{"Your time off"}</h2>
        <Vendor_Link
          to="/requests"
          className="group/all inline-flex items-center gap-0.5 text-[12px] font-semibold text-ink-soft transition-colors hover:text-accent-ink"
        >
          {"All requests"}
          <Vendor_ArrowUpRight
            size={13}
            className="transition-transform duration-[180ms] ease-out group-hover/all:translate-x-px group-hover/all:-translate-y-px"
          />
        </Vendor_Link>
      </div>
      <div className="grid overflow-hidden rounded-card border border-line bg-card shadow-card lg:grid-cols-[1.4fr_1fr]">
        <div className="flex items-center gap-5 bg-panel/40 p-5 sm:gap-7 sm:p-6">
          <BalanceRings balances={balances} />
          <ul className="min-w-0 flex-1 space-y-3.5">
            {balances.map((i) => {
              var l;
              const o =
                  ((l = ptoTypeById(i.typeId)) == null ? void 0 : l.color) ||
                  "var(--c-ink-mute)",
                c = i.grant ? i.remaining >= i.grant : !1;
              return (
                <li className="flex items-center gap-2.5" key={i.typeId}>
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]"
                    style={{
                      background: o,
                    }}
                  />
                  <span
                    className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink-soft"
                    title={i.name}
                  >
                    {i.name}
                  </span>
                  <span className="flex shrink-0 items-baseline gap-1">
                    <span className="text-[16px] font-bold leading-none tabular tracking-tight text-ink">
                      {i.remaining}
                    </span>
                    <span className="text-[11px] font-medium text-ink-mute">
                      {"/ "}
                      {i.grant}
                    </span>
                  </span>
                  <span
                    className={`hidden w-12 shrink-0 text-right text-[10px] font-semibold uppercase tracking-[0.04em] sm:block ${c ? "text-success-ink" : "text-ink-mute/70"}`}
                  >
                    {c ? "full" : `${Math.max(0, i.grant - i.remaining)} used`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="border-t border-line-soft p-5 lg:border-l lg:border-t-0 sm:p-6">
          <p className="eyebrow mb-3">{"Coming up"}</p>
          {upcoming.length === 0 && pending.length === 0 ? (
            <div className="flex min-h-[104px] flex-col items-center justify-center gap-1.5 text-center">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-panel text-ink-mute/60">
                <Vendor_CalendarRange size={18} />
              </span>
              <p className="text-[13px] font-medium text-ink-soft">
                {"Nothing on the books"}
              </p>
              <p className="text-[11px] text-ink-mute">
                {"No approved or pending time off ahead."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-line-soft">
              {upcoming.map((i, o) => (
                <BalanceRow r={i} index={o} key={`u-${i.id}`} />
              ))}
              {pending.map((i, o) => (
                <BalanceRow
                  r={i}
                  index={upcoming.length + o}
                  key={`p-${i.id}`}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
export function BalanceRings({ balances: balances }) {
  const { ptoTypeById: ptoTypeById } = useCatalog(),
    n = 148,
    r = 8,
    s = n / 2,
    i = [65, 51, 37],
    o = useEntered(),
    c = balances.slice(0, 3),
    l = balances.reduce((h, d) => h + (d.remaining ?? 0), 0),
    u = useCountUp(l);
  return (
    <div
      className="relative shrink-0"
      style={{
        width: n,
        height: n,
      }}
    >
      <svg width={n} height={n} className="-rotate-90 overflow-visible">
        {c.map((h, d) => {
          var v;
          const f =
              ((v = ptoTypeById(h.typeId)) == null ? void 0 : v.color) ||
              "var(--c-ink-mute)",
            p = i[d],
            y = 2 * Math.PI * p,
            g = h.grant
              ? Math.min(1, Math.max(0, (h.remaining ?? 0) / h.grant))
              : 0,
            k = y * (1 - (o ? g : 0));
          return (
            <g key={h.typeId}>
              <circle
                cx={s}
                cy={s}
                r={p}
                fill="none"
                strokeWidth={r}
                stroke={`color-mix(in oklch, ${f} 17%, var(--c-panel))`}
              />
              <circle
                cx={s}
                cy={s}
                r={p}
                fill="none"
                strokeWidth={r}
                stroke={f}
                strokeLinecap="round"
                strokeDasharray={y}
                strokeDashoffset={k}
                style={{
                  transition: "stroke-dashoffset 620ms var(--ease-out-quart)",
                  transitionDelay: `${d * 90}ms`,
                }}
              />
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="flex flex-col items-center leading-none">
          <span className="text-[26px] font-bold tabular tracking-tight text-ink">
            {u}
          </span>
          <span className="mt-2 text-[9.5px] font-semibold text-ink-mute">
            {"days left"}
          </span>
        </div>
      </div>
    </div>
  );
}
export function BalanceRow({ r: e, index = 0 }) {
  var s;
  const { ptoTypeById: ptoTypeById } = useCatalog(),
    r =
      ((s = ptoTypeById(e.typeId)) == null ? void 0 : s.color) ||
      "var(--c-ink-mute)";
  return (
    <li
      style={{
        "--i": index,
      }}
      className="stagger-in flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
    >
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-btn"
        style={{
          background: `color-mix(in oklch, ${r} 14%, var(--c-card))`,
        }}
      >
        <PtoTypeIcon typeId={e.typeId} size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-ink">
          {e.rangeLabel}
        </p>
        <p className="truncate text-[11px] text-ink-mute">{e.label}</p>
      </div>
      <StatusChip status={e.status} size="xs" />
    </li>
  );
}
// The team timeline (every team, Week or Month), then the viewer's own time off. Clicking a day
// starts a request; names and bars open only what the viewer may already open.
export function DashboardView({
  activeUser: activeUser,
  todayIso: todayIso,
  users = [],
  requests = [],
  holidays = [],
  personal: personal,
  loading: loading,
  onStartRequest: onStartRequest,
  onBarClick: onBarClick,
  canOpenPerson: canOpenPerson,
  onSelectPerson: onSelectPerson,
}) {
  const { teams: teams } = useCatalog(),
    layout = React.useMemo(
      () => initialTeamLayout(activeUser, teams),
      [activeUser, teams],
    ),
    [unit, setUnit] = React.useState("week"),
    [anchor, setAnchor] = React.useState(todayIso),
    [teamFilter, setTeamFilter] = React.useState("all"),
    // Only the teams someone has toggled; the rest follow the viewer's initial layout, or start
    // open when one team is picked.
    [toggled, setToggled] = React.useState({}),
    collapsed = React.useMemo(() => {
      const c = {};
      for (const t of layout.teams)
        c[t.id] =
          t.id in toggled
            ? toggled[t.id]
            : teamFilter === "all" && !!layout.collapsed[t.id];
      return c;
    }, [layout, toggled, teamFilter]),
    pickTeam = (id) => {
      setTeamFilter(id);
      setToggled({});
    },
    toggleTeam = (id) =>
      setToggled((prev) => ({
        ...prev,
        [id]: !collapsed[id],
      })),
    shift = (step) =>
      setAnchor((iso) =>
        toISO(
          unit === "month"
            ? Vendor_addMonths(toDateLocal(iso), step)
            : Vendor_addWeeks(toDateLocal(iso), step),
        ),
      ),
    shown =
      teamFilter === "all"
        ? layout.teams
        : layout.teams.filter((t) => t.id === teamFilter),
    data = React.useMemo(
      () =>
        buildTeamTimeline({
          todayIso: todayIso,
          anchorIso: anchor,
          unit: unit,
          users: users,
          requests: requests,
          holidays: holidays,
          teams: shown,
        }),
      [todayIso, anchor, unit, users, requests, holidays, layout, teamFilter],
    ),
    teamOptions = [
      {
        value: "all",
        label: "All teams",
        hint: users.filter((u) => u.team).length,
      },
      ...layout.teams.map((t) => ({
        value: t.id,
        label: t.name,
        hint: users.filter((u) => belongsToTeam(u, t.id)).length,
      })),
    ];
  if (loading) return <DashboardSkeleton />;
  const summary =
      data.totalOff === 0
        ? `Everyone's in this ${unit}.`
        : `${data.totalOff} ${data.totalOff === 1 ? "person" : "people"} off this ${unit}.`,
    timelineProps = {
      data: data,
      collapsed: collapsed,
      onToggleTeam: toggleTeam,
      activeUserId: activeUser.id,
      canOpenPerson: canOpenPerson,
      onSelectPerson: onSelectPerson,
      onBarClick: onBarClick,
      minRequestIso: todayIso,
      onStartRequest: onStartRequest,
    };
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3">
        <div className="min-w-0">
          <p className="eyebrow">
            {"Team · "}
            {data.rangeLabel}
          </p>
          <h1 className="mt-1.5 text-[26px] font-bold leading-none tracking-tight text-ink">
            {"Team coverage"}
          </h1>
          <p className="mt-2 text-[13px] font-medium text-ink-soft">
            {summary}
            <span className="text-ink-mute">
              {" Pick any day to request time off."}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => shift(-1)}
                aria-label={`Previous ${unit}`}
                className="grid h-9 w-9 place-items-center rounded-btn border border-line bg-card text-ink-soft hover:bg-panel"
              >
                <Vendor_ChevronLeft size={18} />
              </button>
              <button
                onClick={() => shift(1)}
                aria-label={`Next ${unit}`}
                className="grid h-9 w-9 place-items-center rounded-btn border border-line bg-card text-ink-soft hover:bg-panel"
              >
                <Vendor_ChevronRight size={18} />
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnchor(todayIso)}
            >
              {"Today"}
            </Button>
            <span className="ml-1 text-[15px] font-bold tabular tracking-tight text-ink sm:text-base">
              {data.rangeLabel}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown
              options={teamOptions}
              value={teamFilter}
              onChange={pickTeam}
              leadingIcon={Vendor_Users}
              size="sm"
              searchable={!0}
              searchPlaceholder="Search teams…"
              ariaLabel="Filter by team"
            />
            <SegmentedControl
              options={[
                {
                  value: "week",
                  label: "Week",
                },
                {
                  value: "month",
                  label: "Month",
                },
              ]}
              value={unit}
              onChange={setUnit}
              size="sm"
            />
          </div>
        </div>
      </header>
      <div className="hidden md:block">
        <DesktopTeamTimeline {...timelineProps} />
        <LeaveLegend />
      </div>
      <div className="md:hidden">
        <MobileTeamTimeline {...timelineProps} />
        <LeaveLegend className="mt-3" />
      </div>
      <PersonalSummary personal={personal} />
    </div>
  );
}
export function LeaveLegend({ className = "" }) {
  const { ptoTypes: ptoTypes } = useCatalog();
  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 pt-3 ${className}`}
    >
      <span className="eyebrow">{"Leave type"}</span>
      {ptoTypes.map((n) => (
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-soft"
          key={n.id}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: n.color,
            }}
          />
          {n.name}
        </span>
      ))}
      <span className="ml-auto hidden items-center gap-1.5 text-[11px] text-ink-mute sm:inline-flex">
        <span
          className="inline-block h-3 w-5 rounded-[4px]"
          style={{
            border:
              "1px dashed color-mix(in oklch, var(--c-ink-mute) 55%, transparent)",
          }}
        />
        {" pending"}
      </span>
    </div>
  );
}
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div className="space-y-2.5">
          <div className="skeleton h-6 w-52 rounded" />
          <div className="skeleton h-3 w-60 rounded" />
        </div>
        <div className="skeleton h-8 w-32 rounded-btn" />
      </div>
      <div className="overflow-hidden rounded-card border border-line bg-card shadow-raised">
        <div className="skeleton h-11 w-full" />
        {Array.from({
          length: 6,
        }).map((e, t) => (
          <div
            className="flex items-center gap-3 border-t border-line-soft px-4 py-3"
            key={t}
          >
            <div className="skeleton h-6 w-6 rounded-full" />
            <div
              className="skeleton h-6 rounded-chip"
              style={{
                width: `${30 + (t % 3) * 18}%`,
                marginLeft: `${(t % 4) * 12}%`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
