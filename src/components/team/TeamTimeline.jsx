import { toDateLocal } from "../../utils/dateHelpers.jsx";
import { startOfMonth as Vendor_startOfMonth } from "date-fns";
import { differenceInCalendarDays as Vendor_differenceInCalendarDays } from "date-fns";
import { endOfMonth as Vendor_endOfMonth } from "date-fns";
import { startOfWeek as Vendor_startOfWeek } from "date-fns";
import { addDays as Vendor_addDays } from "date-fns";
import { toISO } from "../../utils/dateHelpers.jsx";
import { belongsToTeam } from "../../utils/constants.jsx";
import { isGodAdmin } from "../../utils/constants.jsx";
import { lineEntriesForRequest } from "../../utils/requestHelpers.jsx";
import { rangesOverlap } from "../../utils/dateHelpers.jsx";
import { format as Vendor_format } from "date-fns";
import React from "react";
import { ChevronRight as Vendor_ChevronRight } from "lucide-react";
import { Plus as Vendor_Plus } from "lucide-react";
import { Check as Vendor_Check } from "lucide-react";
import { Avatar } from "../ui/Avatar.jsx";
import { firstName } from "../../utils/constants.jsx";
import { useCatalog } from "../../context/CatalogContext.jsx";
import { ChevronLeft as Vendor_ChevronLeft } from "lucide-react";
export const ME = ["S", "M", "T", "W", "T", "F", "S"];
export const DE = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function buildTeamTimeline({
  todayIso: todayIso,
  anchorIso: anchorIso,
  unit = "week",
  users: users,
  requests: requests,
  teams = [],
  holidays = [],
}) {
  const l = toDateLocal(anchorIso);
  let u, h;
  unit === "month"
    ? ((u = Vendor_startOfMonth(l)),
      (h = Vendor_differenceInCalendarDays(Vendor_endOfMonth(l), u) + 1))
    : ((u = Vendor_startOfWeek(l, {
        weekStartsOn: 0,
      })),
      (h = 7));
  const d = (m) =>
      Math.max(
        0,
        Math.min(h - 1, Vendor_differenceInCalendarDays(toDateLocal(m), u)),
      ),
    f = Array.from(
      {
        length: h,
      },
      (m, x) => {
        const b = Vendor_addDays(u, x),
          N = toISO(b),
          _ = b.getDay();
        return {
          iso: N,
          dow: _,
          dowLetter: ME[_],
          dowShort: DE[_],
          dateNum: b.getDate(),
          isToday: N === todayIso,
          isWeekend: _ === 0 || _ === 6,
          isMonthStart: b.getDate() === 1,
          holiday: holidays.find((j) => j.date === N) || null,
        };
      },
    ),
    p = f[0].iso,
    y = f[h - 1].iso,
    g = teams.map((m) => {
      const x = users.filter((E) => belongsToTeam(E, m.id)),
        N = x.length,
        _ = x
          .map((E) => {
            const T = requests
              .filter((C) => C.userId === E.id)
              .flatMap(lineEntriesForRequest)
              .filter(
                (C) =>
                  ["approved", "pending"].includes(C.status) &&
                  rangesOverlap(C.start, C.end, p, y),
              )
              .map((C) => {
                const H = d(C.start),
                  I = d(C.end);
                return {
                  key: C.lineKey,
                  type: C.type,
                  status: C.status,
                  startIdx: H,
                  endIdx: I,
                  span: I - H + 1,
                  clipsLeft:
                    Vendor_differenceInCalendarDays(toDateLocal(C.start), u) <
                    0,
                  clipsRight:
                    Vendor_differenceInCalendarDays(toDateLocal(C.end), u) >
                    h - 1,
                  start: C.start,
                  end: C.end,
                  requestId: C.requestId,
                  note: C.note,
                  decidedBy: C.decidedBy,
                  denialReason: C.denialReason,
                  viewOnly: !!C.viewOnly,
                };
              })
              .sort((C, H) => C.startIdx - H.startIdx || C.endIdx - H.endIdx);
            return {
              user: E,
              bars: T,
              lanes: placeTeamLanes(T),
            };
          })
          // Deactivated people sit below active teammates.
          .sort(
            (E, T) =>
              Number(E.user.isActive === !1) - Number(T.user.isActive === !1) ||
              E.user.name.localeCompare(T.user.name),
          ),
        R = _.filter((E) => E.bars.length > 0).length;
      return {
        id: m.id,
        name: m.name,
        size: N,
        rows: _,
        offCount: R,
        anyoneOff: R > 0,
      };
    }),
    k = g.reduce((m, x) => m + x.offCount, 0),
    v = unit === "month" ? Vendor_format(l, "MMMM yyyy") : teamRangeLabel(p, y);
  return {
    unit: unit,
    days: f,
    rangeStart: p,
    rangeEnd: y,
    teams: g,
    totalOff: k,
    rangeLabel: v,
  };
}
export function placeTeamLanes(e) {
  const t = [],
    n = e.map((r) => {
      let s = t.findIndex((i) => i < r.startIdx);
      return (
        s === -1 ? ((s = t.length), t.push(r.endIdx)) : (t[s] = r.endIdx),
        {
          ...r,
          lane: s,
        }
      );
    });
  return {
    count: Math.max(1, t.length),
    bars: n,
  };
}
export function teamRangeLabel(e, t) {
  const n = toDateLocal(e),
    r = toDateLocal(t);
  return n.getMonth() === r.getMonth()
    ? `${Vendor_format(n, "MMM d")} – ${Vendor_format(r, "d")}`
    : `${Vendor_format(n, "MMM d")} – ${Vendor_format(r, "MMM d")}`;
}
// HR sees every team open. Everyone else gets the teams they belong to first and open, with the
// rest after them, collapsed.
export function initialTeamLayout(viewer, teams = []) {
  if (isGodAdmin(viewer?.role)) return { teams, collapsed: {} };
  const ids = new Set((viewer?.memberships ?? []).map((m) => m.teamId));
  viewer?.team && ids.add(viewer.team);
  const mine = teams.filter((t) => ids.has(t.id));
  if (mine.length === 0) return { teams, collapsed: {} };
  const rest = teams.filter((t) => !ids.has(t.id));
  return {
    teams: [...mine, ...rest],
    collapsed: Object.fromEntries(rest.map((t) => [t.id, true])),
  };
}

export const Zs = 180;
export const Bx = 30;
export const FE = 96;
export const BE = 34;
export function DesktopTeamTimeline({
  data: data,
  collapsed: collapsed,
  onToggleTeam: onToggleTeam,
  activeUserId: activeUserId,
  onSelectPerson: onSelectPerson,
  onBarClick: onBarClick,
  highlightId: highlightId,
  canOpenPerson: canOpenPerson,
  minRequestIso: minRequestIso,
  onStartRequest: onStartRequest,
}) {
  const { days: days, teams: teams, unit: unit } = data,
    h = unit === "month",
    d = days.length,
    f = days.findIndex((k) => k.isToday),
    p = h ? 2 : 7,
    y = h ? BE : FE,
    g = Zs + y * d;
  return (
    <div className="overflow-hidden rounded-card border border-line bg-card shadow-raised">
      <div className="scrollbar-slim overflow-x-auto">
        <div
          style={{
            minWidth: g,
            width: h ? g : void 0,
          }}
        >
          <TeamHeader
            days={days}
            dense={h}
            dayW={y}
            minRequestIso={minRequestIso}
            onStartRequest={onStartRequest}
          />
          <div className="relative">
            <TeamGrid days={days} todayIdx={f} dense={h} dayW={y} />
            <div className="relative z-10">
              {teams.map((k, v) => (
                <TeamSection
                  team={k}
                  days={days}
                  stagger={teams
                    .slice(0, v)
                    .reduce((m, x) => m + x.rows.length + 1, 0)}
                  count={d}
                  dense={h}
                  dayW={y}
                  gutter={p}
                  collapsed={!!collapsed[k.id]}
                  onToggle={() => onToggleTeam(k.id)}
                  activeUserId={activeUserId}
                  canOpenPerson={canOpenPerson}
                  onSelectPerson={onSelectPerson}
                  onBarClick={onBarClick}
                  highlightId={highlightId}
                  key={k.id}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export function ol(e) {
  return e ? "shrink-0" : "flex-1";
}
export function ll(e, t) {
  return e
    ? {
        width: t,
      }
    : {
        flex: "1 1 0%",
        minWidth: t,
      };
}
export function TeamGrid({
  days: days,
  todayIdx: todayIdx,
  dense: dense,
  dayW: dayW,
}) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 flex"
      aria-hidden="true"
    >
      <div
        className="shrink-0"
        style={{
          width: Zs,
        }}
      />
      <div className={`flex ${dense ? "shrink-0" : "flex-1"}`}>
        {days.map((s, i) => {
          const o = i === todayIdx || i === todayIdx + 1;
          return (
            <div
              style={ll(dense, dayW)}
              className={`${ol(dense)} border-l first:border-l-0 ${o ? "border-accent-line" : "border-line-soft"} ${s.isToday ? "bg-accent-soft/80" : s.isWeekend ? "bg-panel/55" : ""}`}
              key={s.iso}
            />
          );
        })}
      </div>
    </div>
  );
}
// With onStartRequest, each day cell starts a request on that day; days before minRequestIso
// stay inert.
export function TeamHeader({
  days: days,
  dense: dense,
  dayW: dayW,
  minRequestIso: minRequestIso,
  onStartRequest: onStartRequest,
}) {
  return (
    <div className="sticky top-0 z-30 flex border-b border-line bg-card/95 backdrop-blur-sm">
      <div
        className="sticky left-0 z-40 flex shrink-0 items-end border-r border-line bg-card/95 px-4 pb-2 pt-3"
        style={{
          width: Zs,
        }}
      >
        <span className="eyebrow">{"Roster"}</span>
      </div>
      <div className={`flex ${dense ? "shrink-0" : "flex-1"}`}>
        {days.map((r) => {
          const i =
            !!onStartRequest && !(minRequestIso && r.iso < minRequestIso);
          return (
            <button
              type="button"
              disabled={!i}
              onClick={i ? () => onStartRequest(r.iso) : void 0}
              title={i ? "Request time off" : void 0}
              aria-label={i ? `Request time off starting ${r.iso}` : void 0}
              style={ll(dense, dayW)}
              className={`${ol(dense)} group relative flex flex-col items-center gap-0.5 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset ${dense ? "py-1.5" : "py-2"} ${i ? `press ${r.isToday ? "hover:bg-accent-soft" : "hover:bg-accent-soft/55"}` : "cursor-default"} ${r.isToday ? "bg-accent-soft/80" : r.isWeekend ? "bg-panel/55" : ""}`}
              key={r.iso}
            >
              {i && !dense && (
                <span className="pointer-events-none absolute right-1 top-1 grid h-4 w-4 origin-top-right scale-75 place-items-center rounded-full bg-accent-strong text-white opacity-0 shadow-btn transition-[opacity,transform] duration-150 ease-out group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100">
                  <Vendor_Plus size={11} strokeWidth={3} />
                </span>
              )}
              <span
                className={`font-semibold uppercase tracking-[0.08em] ${dense ? "text-[8px]" : "text-[10px]"} ${r.isToday ? "text-accent-ink" : r.isWeekend ? "text-ink-mute/70" : "text-ink-mute"}`}
              >
                {dense ? r.dowLetter : r.dowShort}
              </span>
              {r.isToday ? (
                <span
                  className={`grid place-items-center rounded-full bg-accent-strong font-bold tabular text-white shadow-btn ${dense ? "h-[19px] w-[19px] text-[10px]" : "h-[22px] w-[22px] text-[12px]"}`}
                >
                  {r.dateNum}
                </span>
              ) : (
                <span
                  className={`grid place-items-center font-bold tabular ${dense ? "h-[19px] text-[11px]" : "h-[22px] text-[13px]"} ${r.holiday ? "text-warning-ink" : r.isWeekend ? "text-ink-mute" : "text-ink"}`}
                >
                  {r.dateNum}
                </span>
              )}
              {!dense &&
                (r.holiday ? (
                  <span
                    className="h-1 w-1 rounded-full bg-warning"
                    title={r.holiday.name}
                  />
                ) : (
                  <span className="h-1 w-1" />
                ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
export function TeamSection({
  team: team,
  days: days,
  stagger = 0,
  count: count,
  dense: dense,
  dayW: dayW,
  gutter: gutter,
  collapsed: collapsed,
  onToggle: onToggle,
  activeUserId: activeUserId,
  canOpenPerson: canOpenPerson,
  onSelectPerson: onSelectPerson,
  onBarClick: onBarClick,
  highlightId: highlightId,
}) {
  return (
    <div className="border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="group flex w-full items-stretch text-left outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
      >
        <div
          className="sticky left-0 z-20 flex shrink-0 flex-col justify-center gap-0.5 border-r border-line bg-panel/70 py-2 pl-3 pr-2"
          style={{
            width: Zs,
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
              <span className="font-medium text-ink-mute">
                {team.offCount}
                {" off"}
              </span>
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
        <div
          className={dense ? "shrink-0" : "flex-1"}
          style={
            dense
              ? {
                  width: dayW * count,
                }
              : void 0
          }
          aria-hidden="true"
        />
      </button>
      {!collapsed &&
        team.rows.map((y, g) => (
            <TeamPersonRow
              row={y}
              index={stagger + g}
              count={count}
              dense={dense}
              dayW={dayW}
              gutter={gutter}
              isSelf={y.user.id === activeUserId}
              canOpen={canOpenPerson ? canOpenPerson(y.user) : !0}
              onSelectPerson={onSelectPerson}
              onBarClick={onBarClick}
              highlightId={highlightId}
              key={y.user.id}
            />
        ))}
    </div>
  );
}
export function TeamPersonRow({
  row: row,
  index = 0,
  count: count,
  dense: dense,
  dayW: dayW,
  gutter: gutter,
  isSelf: isSelf,
  canOpen = !0,
  onSelectPerson: onSelectPerson,
  onBarClick: onBarClick,
  highlightId: highlightId,
}) {
  const d = row.lanes.count * Bx + 14,
    f = (
      <>
        <Avatar name={row.user.name} id={row.user.id} size="xs" />
        {isSelf ? (
          <span className="flex min-w-0 items-baseline gap-1">
            <span className="truncate text-[13px] font-medium text-ink">
              {firstName(row.user.name)}
            </span>
            <span className="shrink-0 text-[10px] font-semibold text-ink-mute/70">
              {"· You"}
            </span>
          </span>
        ) : (
          <span className="truncate text-[13px] font-medium text-ink">
            {dense ? firstName(row.user.name) : row.user.name}
          </span>
        )}
      </>
    );
  return (
    <div
      style={{
        "--i": index,
      }}
      className="stagger-in group/row flex border-t border-line-soft first:border-t-0"
    >
      {canOpen ? (
        <button
          type="button"
          onClick={() =>
            onSelectPerson == null ? void 0 : onSelectPerson(row.user)
          }
          className="press-card sticky left-0 z-20 flex shrink-0 items-center gap-2.5 border-r border-line bg-card px-4 text-left outline-none group-hover/row:bg-panel/60 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
          style={{
            width: Zs,
          }}
          aria-label={`Open ${row.user.name}`}
        >
          {f}
        </button>
      ) : (
        <div
          className="sticky left-0 z-20 flex shrink-0 items-center gap-2.5 border-r border-line bg-card px-4"
          style={{
            width: Zs,
          }}
        >
          {f}
        </div>
      )}
      <div
        className={`relative transition-colors group-hover/row:bg-panel/30 ${dense ? "shrink-0" : "flex-1"}`}
        style={{
          height: d,
          ...(dense
            ? {
                width: dayW * count,
              }
            : {}),
        }}
      >
        {canOpen && (
          <button
            type="button"
            onClick={() =>
              onSelectPerson == null ? void 0 : onSelectPerson(row.user)
            }
            className="absolute inset-0 z-0 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
            aria-label={`Open ${row.user.name}`}
            title={`Open ${firstName(row.user.name)}`}
          />
        )}
        {row.lanes.bars.map((f) => (
          <TeamRequestBar
            bar={f}
            index={index}
            count={count}
            dense={dense}
            gutter={gutter}
            onBarClick={() =>
              onBarClick == null ? void 0 : onBarClick(f, row.user)
            }
            highlightId={highlightId}
            key={f.key}
          />
        ))}
      </div>
    </div>
  );
}
export function TeamRequestBar({
  bar: bar,
  index = 0,
  count: count,
  dense: dense,
  gutter: gutter,
  onBarClick: onBarClick,
  highlightId: highlightId,
}) {
  const { ptoTypeById: ptoTypeById } = useCatalog(),
    l = ptoTypeById(bar.type),
    u = (l == null ? void 0 : l.color) || "var(--c-ink-mute)",
    h = bar.status === "pending",
    d = !dense || bar.span >= 5,
    f = bar.requestId === highlightId,
    p = (bar.startIdx / count) * 100,
    y = (bar.span / count) * 100;
  return (
    <button
      type="button"
      onClick={(g) => {
        (g.stopPropagation(), bar.viewOnly || onBarClick());
      }}
      aria-disabled={bar.viewOnly || void 0}
      title={`${l == null ? void 0 : l.name} · ${bar.status}`}
      className={`group absolute z-10 flex animate-bar-wipe items-center gap-1.5 overflow-hidden font-semibold outline-none ${bar.viewOnly ? "cursor-default" : "press hover:z-20 hover:-translate-y-px hover:shadow-card"} focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${dense ? "justify-center text-[10px]" : "text-[11.5px]"} ${f ? "ring-2 ring-accent ring-offset-1" : ""}`}
      style={{
        animationDelay: `${Math.min(index, 10) * 26 + 40}ms`,
        top: `${10 + bar.lane * Bx}px`,
        height: dense ? "20px" : "24px",
        left: `calc(${p}% + ${bar.clipsLeft ? 0 : gutter}px)`,
        width: `calc(${y}% - ${(bar.clipsLeft ? 0 : gutter) + (bar.clipsRight ? 0 : gutter)}px)`,
        paddingLeft: dense ? "3px" : "6px",
        paddingRight: dense ? "3px" : "8px",
        borderRadius:
          bar.clipsLeft || bar.clipsRight ? "4px" : dense ? "5px" : "7px",
        color: `color-mix(in oklch, ${u} 64%, var(--c-ink))`,
        background: h
          ? `color-mix(in oklch, ${u} 12%, var(--c-card))`
          : `linear-gradient(180deg, color-mix(in oklch, ${u} 21%, var(--c-card)), color-mix(in oklch, ${u} 29%, var(--c-card)))`,
        border: h
          ? `1px dashed color-mix(in oklch, ${u} 60%, transparent)`
          : `1px solid color-mix(in oklch, ${u} 52%, transparent)`,
      }}
    >
      {bar.clipsLeft && !dense && (
        <Vendor_ChevronLeft
          size={11}
          strokeWidth={2.75}
          className="-ml-0.5 shrink-0 opacity-60"
        />
      )}
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full shadow-[inset_0_1px_0_rgb(255_255_255/0.28)]"
        style={{
          background: u,
        }}
      />
      {d && (
        <span className="truncate">
          {l == null ? void 0 : l.name}
          {!dense && bar.span >= 2 && h ? " · pending" : ""}
        </span>
      )}
      {bar.clipsRight && !dense && (
        <Vendor_ChevronRight
          size={11}
          strokeWidth={2.75}
          className="-mr-0.5 ml-auto shrink-0 opacity-60"
        />
      )}
    </button>
  );
}
export function MobileTeamTimeline({
  data: data,
  collapsed: collapsed,
  onToggleTeam: onToggleTeam,
  activeUserId: activeUserId,
  onSelectPerson: onSelectPerson,
  onBarClick: onBarClick,
  canOpenPerson: canOpenPerson,
  minRequestIso: minRequestIso,
  onStartRequest: onStartRequest,
}) {
  const { days: days, teams: teams, unit: unit } = data;
  return (
    <div className="space-y-4">
      {unit === "week" && (
        <MobileTeamSummary
          days={days}
          minRequestIso={minRequestIso}
          onStartRequest={onStartRequest}
        />
      )}
      {teams.map((u) => {
        const h = !!collapsed[u.id];
        return (
          <div key={u.id}>
            <button
              type="button"
              onClick={() => onToggleTeam(u.id)}
              aria-expanded={!h}
              className="mb-1.5 flex w-full items-center justify-between gap-2 px-0.5 outline-none"
            >
              <span className="flex items-center gap-1.5">
                <Vendor_ChevronRight
                  size={15}
                  strokeWidth={2.5}
                  className={`text-ink-mute transition-transform ${h ? "" : "rotate-90"}`}
                />
                <span className="text-[14px] font-bold tracking-tight text-ink">
                  {u.name}
                </span>
                <span className="tabular text-[11px] font-medium text-ink-mute">
                  {u.size}
                </span>
              </span>
              {u.anyoneOff ? (
                <span className="text-[11px] font-medium text-ink-mute">
                  {u.offCount}
                  {" off"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-mute">
                  <Vendor_Check
                    size={11}
                    strokeWidth={2.5}
                    className="text-success-ink"
                  />
                  {" All in"}
                </span>
              )}
            </button>
            {!h &&
              (u.rows.length > 0 ? (
                <ul className="overflow-hidden rounded-card border border-line bg-card shadow-card">
                  {u.rows.map((d) => {
                    const p = canOpenPerson ? canOpenPerson(d.user) : !0,
                      f = (
                        <>
                          <Avatar name={d.user.name} id={d.user.id} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                              {firstName(d.user.name)}
                              {d.user.id === activeUserId && (
                                <span className="text-[10px] font-semibold text-ink-mute/70">
                                  {"You"}
                                </span>
                              )}
                            </p>
                            {d.bars.length > 0 ? (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {d.bars.map((y) => (
                                  <MobileTeamBar
                                    bar={y}
                                    onClick={(g) => {
                                      (g.stopPropagation(),
                                        y.viewOnly ||
                                          onBarClick == null ||
                                          onBarClick(y, d.user));
                                    }}
                                    key={y.key}
                                  />
                                ))}
                              </div>
                            ) : (
                              <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-ink-mute">
                                <Vendor_Check
                                  size={11}
                                  strokeWidth={2.5}
                                  className="text-success-ink"
                                />
                                {" In this "}
                                {unit}
                              </p>
                            )}
                          </div>
                        </>
                      );
                    return (
                      <li
                        className="border-t border-line-soft first:border-t-0"
                        key={d.user.id}
                      >
                        {p ? (
                          <button
                            type="button"
                            onClick={() =>
                              onSelectPerson == null
                                ? void 0
                                : onSelectPerson(d.user)
                            }
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left outline-none active:bg-panel/50"
                          >
                            {f}
                            <Vendor_ChevronRight
                              size={16}
                              className="shrink-0 text-ink-mute/50"
                            />
                          </button>
                        ) : (
                          <div className="flex w-full items-center gap-3 px-3 py-2.5">
                            {f}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="rounded-card border border-line bg-card px-3 py-3 text-[12px] text-ink-mute shadow-card">
                  {"No one on this team."}
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );
}
// The week's days; with onStartRequest, tapping one starts a request on that day.
export function MobileTeamSummary({
  days: days,
  minRequestIso: minRequestIso,
  onStartRequest: onStartRequest,
}) {
  return (
    <div className="rounded-card border border-line bg-card p-2 shadow-card">
      <div className="flex">
        {days.map((r) => {
          const s = minRequestIso && r.iso < minRequestIso,
            i = !!onStartRequest && !s;
          return (
            <button
              type="button"
              disabled={!i}
              onClick={i ? () => onStartRequest(r.iso) : void 0}
              aria-label={i ? `Request time off starting ${r.iso}` : void 0}
              className={`flex flex-1 flex-col items-center gap-1 rounded-[9px] py-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${s ? "opacity-45" : i ? "active:bg-accent-soft/70" : ""} ${r.isToday ? "bg-accent-soft/60" : ""}`}
              key={r.iso}
            >
              <span className="text-[9px] font-semibold uppercase tracking-wide text-ink-mute">
                {r.dowLetter}
              </span>
              {r.isToday ? (
                <span className="grid h-[20px] w-[20px] place-items-center rounded-full bg-accent-strong text-[11px] font-bold tabular text-white">
                  {r.dateNum}
                </span>
              ) : (
                <span
                  className={`text-[13px] font-bold tabular ${r.isWeekend ? "text-ink-mute" : "text-ink"}`}
                >
                  {r.dateNum}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
export function MobileTeamBar({ bar: bar, onClick: onClick }) {
  const { ptoTypeById: ptoTypeById } = useCatalog(),
    r = ptoTypeById(bar.type),
    s = (r == null ? void 0 : r.color) || "var(--c-ink-mute)",
    i = bar.status === "pending";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-disabled={bar.viewOnly || void 0}
      className={`inline-flex items-center gap-1.5 rounded-chip px-2 py-0.5 text-[11px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent ${bar.viewOnly ? "cursor-default" : ""}`}
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
