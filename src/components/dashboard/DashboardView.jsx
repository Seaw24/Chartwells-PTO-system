import React from "react";
import { Plus as Vendor_Plus } from "lucide-react";
import { ChevronRight as Vendor_ChevronRight } from "lucide-react";
import { TriangleAlert as Vendor_TriangleAlert } from "lucide-react";
import { Check as Vendor_Check } from "lucide-react";
import { Avatar } from "../ui/Avatar.jsx";
import { firstName } from "../../utils/constants.jsx";
import { useCatalog } from "../../context/CatalogContext.jsx";
import { ChevronLeft as Vendor_ChevronLeft } from "lucide-react";
import { useEntered } from "../../hooks/motion.jsx";
import { format as Vendor_format } from "date-fns";
import { toDateLocal } from "../../utils/dateHelpers.jsx";
import { Link as Vendor_Link } from "react-router-dom";
import { ArrowUpRight as Vendor_ArrowUpRight } from "lucide-react";
import { CalendarRange as Vendor_CalendarRange } from "lucide-react";
import { useCountUp } from "../../hooks/motion.jsx";
import { PtoTypeIcon } from "../ui/PtoTypeIcon.jsx";
import { StatusChip } from "../requests/RequestDetailModal.jsx";
import { FilterDropdown } from "../ui/FilterDropdown.jsx";
import { Users as Vendor_Users } from "lucide-react";
export const Xs = 172;
export const Lx = 30;
export const to = 96;
export const Ec = 7;
export function CoverageTimeline({
  week: week,
  minRequestIso: minRequestIso,
  onBarClick: onBarClick,
  onStartRequest: onStartRequest,
  highlightId: highlightId,
}) {
  const { days: days, teams: teams } = week,
    c = days.findIndex((f) => f.isToday),
    [l, u] = React.useState({}),
    h = (f) =>
      u((p) => ({
        ...p,
        [f]: !p[f],
      })),
    d = Xs + to * 7;
  return (
    <div className="overflow-hidden rounded-card border border-line bg-card shadow-raised">
      <div className="scrollbar-slim overflow-x-auto">
        <div
          style={{
            minWidth: d,
          }}
        >
          <CoverageHeader
            days={days}
            dayW={to}
            minRequestIso={minRequestIso}
            onStartRequest={onStartRequest}
          />
          <div className="relative">
            <CoverageGrid days={days} todayIdx={c} dayW={to} />
            <div className="relative z-10">
              {teams.map((f, p) => (
                <CoverageTeam
                  team={f}
                  days={days}
                  dayW={to}
                  stagger={teams
                    .slice(0, p)
                    .reduce((y, g) => y + g.rows.length + 1, 0)}
                  collapsed={!!l[f.id]}
                  onToggle={() => h(f.id)}
                  onBarClick={onBarClick}
                  highlightId={highlightId}
                  key={f.id}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export function CoverageGrid({ days: days, todayIdx: todayIdx, dayW: dayW }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 flex"
      aria-hidden="true"
    >
      <div
        className="shrink-0"
        style={{
          width: Xs,
        }}
      />
      <div className="flex flex-1">
        {days.map((r, s) => {
          const i = s === todayIdx || s === todayIdx + 1;
          return (
            <div
              style={{
                minWidth: dayW,
              }}
              className={`flex-1 border-l first:border-l-0 ${i ? "border-accent-line" : "border-line-soft"} ${r.isToday ? "bg-accent-soft/80" : r.isWeekend ? "bg-panel/55" : ""}`}
              key={r.iso}
            />
          );
        })}
      </div>
    </div>
  );
}
export function CoverageHeader({
  days: days,
  dayW: dayW,
  minRequestIso: minRequestIso,
  onStartRequest: onStartRequest,
}) {
  return (
    <div className="sticky top-0 z-30 flex border-b border-line bg-card/95 backdrop-blur-sm">
      <div
        className="flex shrink-0 items-end border-r border-line px-4 pb-2 pt-3"
        style={{
          width: Xs,
        }}
      >
        <span className="eyebrow">{"Who's off"}</span>
      </div>
      <div className="flex flex-1">
        {days.map((s) => {
          const i = minRequestIso && s.iso < minRequestIso,
            o = s.isToday
              ? "bg-accent-soft/80"
              : s.isWeekend
                ? "bg-panel/55"
                : "",
            c = i
              ? "cursor-default"
              : s.isToday
                ? "hover:bg-accent-soft"
                : "hover:bg-accent-soft/55";
          return (
            <button
              type="button"
              disabled={i}
              onClick={
                i
                  ? void 0
                  : () =>
                      onStartRequest == null ? void 0 : onStartRequest(s.iso)
              }
              title={i ? void 0 : "Request time off"}
              aria-label={i ? void 0 : `Request time off starting ${s.iso}`}
              style={{
                minWidth: dayW,
              }}
              className={`group relative flex flex-1 flex-col items-center gap-0.5 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset ${i ? "transition-colors" : "press"} ${o} ${c}`}
              key={s.iso}
            >
              {!i && (
                <span className="pointer-events-none absolute right-1 top-1 grid h-4 w-4 origin-top-right scale-75 place-items-center rounded-full bg-accent-strong text-white opacity-0 shadow-btn transition-[opacity,transform] duration-150 ease-out group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100">
                  <Vendor_Plus size={11} strokeWidth={3} />
                </span>
              )}
              <span
                className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${s.isToday ? "text-accent-ink" : s.isWeekend ? "text-ink-mute/70" : "text-ink-mute"}`}
              >
                {s.dowShort}
              </span>
              {s.isToday ? (
                <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-accent-strong text-[12px] font-bold tabular text-white shadow-btn">
                  {s.dateNum}
                </span>
              ) : (
                <span
                  className={`grid h-[22px] w-[22px] place-items-center rounded-full text-[13px] font-bold tabular ring-1 ring-transparent transition-colors group-hover:ring-accent-line ${s.holiday ? "text-warning-ink" : s.isWeekend ? "text-ink-mute" : "text-ink"}`}
                >
                  {s.dateNum}
                </span>
              )}
              {s.holiday ? (
                <span
                  className="h-1 w-1 rounded-full bg-warning"
                  title={s.holiday.name}
                />
              ) : (
                <span className="h-1 w-1" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
export function CoverageTeam({
  team: team,
  days: days,
  dayW: dayW,
  stagger = 0,
  collapsed: collapsed,
  onToggle: onToggle,
  onBarClick: onBarClick,
  highlightId: highlightId,
}) {
  const l = team.shortDays.length === 0;
  return (
    <div className="border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="press-card group flex w-full items-stretch text-left outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
      >
        <div
          className="flex shrink-0 flex-col justify-center gap-0.5 border-r border-line py-2 pl-3 pr-2"
          style={{
            width: Xs,
          }}
        >
          <div className="flex items-center gap-1.5">
            <Vendor_ChevronRight
              size={15}
              strokeWidth={2.5}
              className={`shrink-0 text-ink-mute transition-transform duration-200 ease-out group-hover:text-ink ${collapsed ? "" : "rotate-90"}`}
            />
            <span className="text-[13px] font-bold tracking-tight text-ink">
              {team.name}
            </span>
            <span className="tabular text-[11px] font-medium text-ink-mute">
              {team.size}
            </span>
          </div>
          <div className="overflow-hidden whitespace-nowrap pl-[14px] text-[11px] font-semibold leading-tight">
            {team.anyoneOff ? (
              l ? (
                <span className="font-medium text-ink-mute">
                  {team.rows.length}
                  {" off"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-danger-ink">
                  <Vendor_TriangleAlert size={11} strokeWidth={2.5} />
                  {" Short "}
                  {team.shortDays.join(", ")}
                </span>
              )
            ) : (
              <span className="inline-flex items-center gap-1 font-medium text-ink-mute">
                <Vendor_Check
                  size={11}
                  strokeWidth={2.5}
                  className="text-success-ink"
                />
                {" Everyone in"}
              </span>
            )}
          </div>
        </div>
        <div className="flex-1" aria-hidden="true" />
      </button>
      {!collapsed && team.anyoneOff && (
        <>
          {team.rows.map((u, h) => (
            <CoveragePerson
              row={u}
              index={stagger + h}
              onBarClick={onBarClick}
              highlightId={highlightId}
              key={u.user.id}
            />
          ))}
          <CoverageTotals
            coverage={team.coverage}
            days={days}
            dayW={dayW}
            size={team.size}
          />
        </>
      )}
    </div>
  );
}
export function CoveragePerson({
  row: row,
  index = 0,
  onBarClick: onBarClick,
  highlightId: highlightId,
}) {
  const i = row.lanes.count * Lx + 14;
  return (
    <div
      style={{
        "--i": index,
      }}
      className="stagger-in group/row flex border-t border-line-soft transition-colors first:border-t-0 hover:bg-panel/30"
    >
      <div
        className="flex shrink-0 items-center gap-2.5 border-r border-line px-4"
        style={{
          width: Xs,
        }}
      >
        <Avatar name={row.user.name} id={row.user.id} size="xs" />
        <span className="truncate text-[13px] font-medium text-ink">
          {firstName(row.user.name)}
        </span>
      </div>
      <div
        className="relative flex-1"
        style={{
          height: i,
        }}
      >
        {row.lanes.bars.map((o) => (
          <CoverageBar
            bar={o}
            index={index}
            onBarClick={onBarClick}
            highlightId={highlightId}
            key={o.key}
          />
        ))}
      </div>
    </div>
  );
}
export function CoverageBar({
  bar: bar,
  index = 0,
  onBarClick: onBarClick,
  highlightId: highlightId,
}) {
  const { ptoTypeById: ptoTypeById } = useCatalog(),
    i = ptoTypeById(bar.type),
    o = (i == null ? void 0 : i.color) || "var(--c-ink-mute)",
    c = bar.status === "pending",
    l = bar.span >= 2,
    u = bar.requestId === highlightId,
    h = (bar.startIdx / 7) * 100,
    d = (bar.span / 7) * 100;
  return (
    <button
      type="button"
      onClick={() => (onBarClick == null ? void 0 : onBarClick(bar))}
      title={`${i == null ? void 0 : i.name} · ${bar.status}`}
      className={`press group absolute flex animate-bar-wipe items-center gap-1.5 overflow-hidden text-[11.5px] font-semibold outline-none hover:z-10 hover:-translate-y-px hover:shadow-card focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${u ? "ring-2 ring-accent ring-offset-1" : ""}`}
      style={{
        animationDelay: `${Math.min(index, 10) * 26 + 40}ms`,
        top: `${10 + bar.lane * Lx}px`,
        height: "24px",
        left: `calc(${h}% + ${bar.clipsLeft ? 0 : Ec}px)`,
        width: `calc(${d}% - ${(bar.clipsLeft ? 0 : Ec) + (bar.clipsRight ? 0 : Ec)}px)`,
        paddingLeft: "6px",
        paddingRight: "8px",
        borderRadius: bar.clipsLeft || bar.clipsRight ? "4px" : "7px",
        color: `color-mix(in oklch, ${o} 64%, var(--c-ink))`,
        background: c
          ? `color-mix(in oklch, ${o} 12%, var(--c-card))`
          : `linear-gradient(180deg, color-mix(in oklch, ${o} 21%, var(--c-card)), color-mix(in oklch, ${o} 29%, var(--c-card)))`,
        border: c
          ? `1px dashed color-mix(in oklch, ${o} 60%, transparent)`
          : `1px solid color-mix(in oklch, ${o} 52%, transparent)`,
      }}
    >
      {bar.clipsLeft && (
        <Vendor_ChevronLeft
          size={11}
          strokeWidth={2.75}
          className="-ml-0.5 shrink-0 opacity-60"
        />
      )}
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full shadow-[inset_0_1px_0_rgb(255_255_255/0.28)]"
        style={{
          background: o,
        }}
      />
      <span className="truncate">
        {i == null ? void 0 : i.name}
        {l && c ? " · pending" : ""}
      </span>
      {bar.clipsRight && (
        <Vendor_ChevronRight
          size={11}
          strokeWidth={2.75}
          className="-mr-0.5 ml-auto shrink-0 opacity-60"
        />
      )}
    </button>
  );
}
export function CoverageTotals({
  coverage: coverage,
  days: days,
  dayW: dayW,
  size: size,
}) {
  const s = useEntered();
  return (
    <div className="flex border-t border-line">
      <div
        className="flex shrink-0 items-center border-r border-line px-4 py-2"
        style={{
          width: Xs,
        }}
      >
        <span className="eyebrow">{"On shift"}</span>
      </div>
      <div className="flex flex-1">
        {coverage.map((i, o) => {
          if (i.closed)
            return (
              <div
                style={{
                  minWidth: dayW,
                }}
                className="flex flex-1 items-center justify-center py-2"
                key={i.iso}
              >
                <span className="text-[11px] text-ink-mute/50">{"—"}</span>
              </div>
            );
          const c = size ? (i.present / size) * 100 : 0;
          return (
            <div
              style={{
                minWidth: dayW,
              }}
              title={`${i.present} of ${size} on shift`}
              className="flex flex-1 flex-col items-center gap-1.5 px-2 py-2"
              key={i.iso}
            >
              <div
                className="h-1.5 w-[64%] max-w-[140px] overflow-hidden rounded-full"
                style={{
                  background: i.short
                    ? "var(--c-danger-soft)"
                    : "var(--c-line)",
                }}
              >
                <div
                  className="h-full origin-left rounded-full transition-transform duration-[420ms] ease-quart"
                  style={{
                    width: "100%",
                    transform: `scaleX(${s ? c / 100 : 0})`,
                    transitionDelay: `${Math.min(o, 6) * 26}ms`,
                    background: i.short
                      ? "var(--c-danger-strong)"
                      : "color-mix(in oklch, var(--c-navy) 34%, var(--c-line))",
                  }}
                />
              </div>
              <span
                className="inline-flex items-center gap-0.5 text-[11px] font-bold tabular leading-none"
                style={{
                  color: i.short ? "var(--c-danger-ink)" : "var(--c-ink-mute)",
                }}
              >
                {i.short && (
                  <Vendor_TriangleAlert size={10} strokeWidth={2.75} />
                )}
                {i.present}
                <span className="font-medium opacity-50">
                  {"/"}
                  {size}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export function MobileCoverage({
  week: week,
  minRequestIso: minRequestIso,
  onBarClick: onBarClick,
  onStartRequest: onStartRequest,
}) {
  const { days: days, teams: teams } = week,
    o = days.map((c, l) => {
      const u = teams.reduce((f, p) => f + p.size, 0),
        h = teams.reduce((f, p) => {
          var y;
          return (
            f + (((y = p.coverage[l]) == null ? void 0 : y.present) ?? p.size)
          );
        }, 0),
        d = teams.some((f) => {
          var p;
          return (p = f.coverage[l]) == null ? void 0 : p.short;
        });
      return {
        ...c,
        size: u,
        present: h,
        short: d && !c.isWeekend,
      };
    });
  return (
    <div className="space-y-4">
      <div className="rounded-card border border-line bg-card p-2 shadow-card">
        <div className="flex">
          {o.map((c) => {
            const l = c.size ? (c.present / c.size) * 100 : 0,
              u = minRequestIso && c.iso < minRequestIso;
            return (
              <button
                type="button"
                disabled={u}
                onClick={
                  u
                    ? void 0
                    : () =>
                        onStartRequest == null ? void 0 : onStartRequest(c.iso)
                }
                aria-label={u ? void 0 : `Request time off starting ${c.iso}`}
                className={`flex flex-1 flex-col items-center gap-1 rounded-[9px] py-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${u ? "opacity-45" : "active:bg-accent-soft/70"} ${c.isToday ? "bg-accent-soft/60" : ""}`}
                key={c.iso}
              >
                <span className="text-[9px] font-semibold uppercase tracking-wide text-ink-mute">
                  {c.dowLetter}
                </span>
                {c.isToday ? (
                  <span className="grid h-[20px] w-[20px] place-items-center rounded-full bg-accent-strong text-[11px] font-bold tabular text-white">
                    {c.dateNum}
                  </span>
                ) : (
                  <span
                    className={`text-[13px] font-bold tabular ${c.isWeekend ? "text-ink-mute" : "text-ink"}`}
                  >
                    {c.dateNum}
                  </span>
                )}
                {c.isWeekend ? (
                  <span className="h-3 text-[10px] leading-3 text-ink-mute/40">
                    {"·"}
                  </span>
                ) : c.short ? (
                  <Vendor_TriangleAlert
                    size={12}
                    strokeWidth={2.5}
                    className="text-danger-ink"
                  />
                ) : (
                  <span className="mt-0.5 h-1.5 w-6 overflow-hidden rounded-full bg-line">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${l}%`,
                        background:
                          "color-mix(in oklch, var(--c-navy) 34%, var(--c-line))",
                      }}
                    />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {teams.map((c) => (
        <div key={c.id}>
          <div className="mb-1.5 flex items-center justify-between px-0.5">
            <span className="text-[13px] font-bold tracking-tight text-ink">
              {c.name}
            </span>
            {c.shortDays.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-danger-ink">
                <Vendor_TriangleAlert size={11} strokeWidth={2.5} />
                {" Short "}
                {c.shortDays.join(", ")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-mute">
                <Vendor_Check
                  size={11}
                  strokeWidth={2.5}
                  className="text-success-ink"
                />
                {" Covered"}
              </span>
            )}
          </div>
          {c.rows.length > 0 ? (
            <ul className="overflow-hidden rounded-card border border-line bg-card shadow-card">
              {c.rows.map((l, u) =>
                l.bars.map((h, d) => (
                  <li
                    style={{
                      "--i": u,
                    }}
                    className={`stagger-in flex items-center gap-3 px-3 py-2.5 ${d === 0 ? "border-t border-line-soft first:border-t-0" : ""}`}
                    key={h.key}
                  >
                    {d === 0 ? (
                      <Avatar name={l.user.name} id={l.user.id} size="sm" />
                    ) : (
                      <span className="w-8 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      {d === 0 && (
                        <p className="text-[13px] font-semibold text-ink">
                          {firstName(l.user.name)}
                        </p>
                      )}
                      <MobileCoverageBar
                        bar={h}
                        onClick={() =>
                          onBarClick == null ? void 0 : onBarClick(h)
                        }
                      />
                    </div>
                  </li>
                )),
              )}
            </ul>
          ) : c.anyoneOff ? (
            <div className="flex items-center gap-2 rounded-card border border-line bg-card px-3 py-3 text-[13px] text-ink-soft shadow-card">
              <Vendor_TriangleAlert size={14} className="text-warning-ink" />
              {c.offCount}
              {
                " off at the busiest point this week. Names and leave types stay private."
              }
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-card border border-line bg-card px-3 py-3 text-[13px] text-ink-mute shadow-card">
              <Vendor_Check size={14} className="text-success-ink" />
              {" All "}
              {c.size}
              {" in this week"}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
export function MobileCoverageBar({ bar: bar, onClick: onClick }) {
  const { ptoTypeById: ptoTypeById } = useCatalog(),
    r = ptoTypeById(bar.type),
    s = (r == null ? void 0 : r.color) || "var(--c-ink-mute)",
    i = bar.status === "pending",
    o =
      bar.start === bar.end
        ? Vendor_format(toDateLocal(bar.start), "EEE MMM d")
        : `${Vendor_format(toDateLocal(bar.start), "MMM d")} – ${Vendor_format(toDateLocal(bar.end), "MMM d")}`;
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-0.5 flex items-center gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 rounded-chip"
    >
      <span
        className="inline-flex items-center gap-1.5 rounded-chip px-2 py-0.5 text-[11px] font-semibold"
        style={{
          color: `color-mix(in oklch, ${s} 64%, var(--c-ink))`,
          background: `color-mix(in oklch, ${s} ${i ? 11 : 20}%, var(--c-card))`,
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
      </span>
      <span className="tabular text-[12px] text-ink-mute">
        {o}
        {i ? " · pending" : ""}
      </span>
    </button>
  );
}
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
export function DashboardView({
  activeUser: activeUser,
  week: week,
  personal: personal,
  minRequestIso: minRequestIso,
  onStartRequest: onStartRequest,
  onBarClick: onBarClick,
  highlightId: highlightId,
  loading: loading,
}) {
  const [l, u] = React.useState("all");
  if (loading) return <DashboardSkeleton />;
  const h = [
      {
        value: "all",
        label: "All teams",
        hint: week.totalOff,
      },
      ...week.teams.map((p) => ({
        value: p.id,
        label: p.name,
        hint: p.offCount,
      })),
    ],
    d = l === "all" ? week.teams : week.teams.filter((p) => p.id === l),
    f = {
      ...week,
      teams: d,
    };
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[26px] font-bold leading-none tracking-tight text-ink">
            {"Team coverage"}
          </h1>
          <p className="mt-2 text-[13px] font-medium text-ink-soft">
            {"Pick any day below to request time off."}
          </p>
        </div>
        <FilterDropdown
          options={h}
          value={l}
          onChange={u}
          leadingIcon={Vendor_Users}
          size="sm"
          searchable={!0}
          searchPlaceholder="Search teams…"
          ariaLabel="Filter by team"
        />
      </header>
      <div className="hidden md:block">
        <CoverageTimeline
          week={f}
          minRequestIso={minRequestIso}
          onBarClick={onBarClick}
          onStartRequest={onStartRequest}
          highlightId={highlightId}
        />
        <LeaveLegend />
      </div>
      <div className="md:hidden">
        <MobileCoverage
          week={f}
          minRequestIso={minRequestIso}
          onBarClick={onBarClick}
          onStartRequest={onStartRequest}
        />
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
