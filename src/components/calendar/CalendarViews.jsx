import { useCatalog } from "../../context/CatalogContext.jsx";
import { firstName } from "../../utils/constants.jsx";
import { isSameMonth as Vendor_isSameMonth } from "date-fns";
import { toISO } from "../../utils/dateHelpers.jsx";
import { requestIncludesDay } from "../../utils/requestHelpers.jsx";
import { format as Vendor_format } from "date-fns";
import { Plus as Vendor_Plus } from "lucide-react";
import React from "react";
import { monthGrid } from "../../utils/dateHelpers.jsx";
import { isBlackoutDay } from "../../utils/policyEngine.jsx";
import { dateTypeMarks } from "../../utils/policyEngine.jsx";
import { rangesOverlap } from "../../utils/dateHelpers.jsx";
import { WEEKDAY_LABELS } from "../../utils/dateHelpers.jsx";
import { weekGrid } from "../../utils/dateHelpers.jsx";
import { startOfWeek as Vendor_startOfWeek } from "date-fns";
import { addDays as Vendor_addDays } from "date-fns";
import { placeBands } from "../../utils/policyEngine.jsx";
import { calendarBands } from "../../utils/policyEngine.jsx";
import { differenceInCalendarDays as Vendor_differenceInCalendarDays } from "date-fns";
import { toDateLocal } from "../../utils/dateHelpers.jsx";
import { EmptyState } from "../ui/EmptyState.jsx";
import { Users as Vendor_Users } from "lucide-react";
import { isSameDay as Vendor_isSameDay } from "date-fns";
import { Avatar } from "../ui/Avatar.jsx";
import { PtoTypeIcon } from "../ui/PtoTypeIcon.jsx";
import { windowedTypes } from "../../utils/policyEngine.jsx";
import { blackoutTypes } from "../../utils/policyEngine.jsx";
export function CalendarChip({
  request: request,
  onClick: onClick,
  dense = !1,
  highlighted = !1,
}) {
  const { ptoTypeById: ptoTypeById, userById: userById } = useCatalog(),
    o = ptoTypeById(request.type),
    c = userById(request.userId),
    l = request.status === "pending",
    // A Holiday Day Off reads as its holiday.
    typeName = request.line?.holidayName || o.name;
  return (
    <button
      onClick={(u) => {
        (u.stopPropagation(), onClick == null || onClick(request));
      }}
      className={`press flex w-full items-center gap-1.5 truncate rounded-chip px-1.5 text-left text-[11px] font-medium leading-tight hover:shadow-card ${dense ? "py-0.5" : "py-1"} ${highlighted ? "shadow-lift ring-2 ring-accent-strong ring-offset-1" : ""}`}
      style={{
        background: `color-mix(in oklch, ${o.color} ${l ? 9 : 16}%, var(--c-card))`,
        border: l
          ? `1px dashed color-mix(in oklch, ${o.color} 55%, transparent)`
          : `1px solid color-mix(in oklch, ${o.color} 30%, transparent)`,
      }}
      title={`${c == null ? void 0 : c.name} · ${typeName} · ${request.status}`}
      aria-label={`${c == null ? void 0 : c.name}, ${typeName}, ${request.status}`}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{
          background: o.color,
        }}
      />
      <span className="truncate text-ink">
        {firstName(c == null ? void 0 : c.name)}
      </span>
    </button>
  );
}
export const Dp = (e) =>
  `${e.name} ${e.kind === "blackout" ? "blackout" : "window"}`;
export const Lp = 2;
export function DayCell({
  date: date,
  monthDate: monthDate,
  todayIso: todayIso,
  holiday: holiday,
  blackout: blackout,
  blackoutStart: blackoutStart,
  typeMarks = [],
  typeMarkStarts = [],
  entries: entries,
  highlight: highlight,
  onChipClick: onChipClick,
  onEmptyClick: onEmptyClick,
  coverage: coverage,
}) {
  const { ptoTypeById: ptoTypeById } = useCatalog(),
    y = Vendor_isSameMonth(date, monthDate),
    g = toISO(date),
    k = g === todayIso,
    v = g < todayIso,
    m = date.getDay(),
    x = m === 0 || m === 6,
    b = highlight && requestIncludesDay(highlight, g),
    N = entries.slice(0, Lp),
    _ = entries.slice(Lp),
    j = _.length,
    S = typeMarkStarts.map(Dp).join(", "),
    R = b
      ? "bg-accent-soft/70"
      : y
        ? (coverage == null ? void 0 : coverage.outCount) > 0
          ? "bg-warning-soft/45"
          : x
            ? "bg-panel/40"
            : "bg-card"
        : "bg-surface/60";
  return (
    <div
      onClick={() => {
        v || onEmptyClick == null || onEmptyClick(date);
      }}
      className={`group relative flex h-full min-h-0 flex-col gap-1 border-b border-r border-line-soft p-1.5 transition-colors duration-[120ms] ${R} ${v ? "cursor-default" : "cursor-pointer hover:bg-panel/60"} ${blackout ? "hatch-danger" : ""} ${b ? "ring-1 ring-inset ring-accent/40" : ""}`}
      style={
        typeMarks.length > 0 && !blackout
          ? {
              paddingBottom: `${8 + typeMarks.length * 4}px`,
            }
          : void 0
      }
      title={S || void 0}
    >
      <div className="flex shrink-0 items-center justify-between">
        <span
          className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${k ? "bg-accent-strong text-white" : y ? "text-ink" : "text-ink-mute/50"}`}
        >
          {Vendor_format(date, "d")}
        </span>
        <span className="flex min-w-0 items-center justify-end gap-1">
          {(coverage == null ? void 0 : coverage.outCount) > 0 && (
            <span
              className="truncate text-[9px] font-semibold text-warning-ink tabular"
              title={`${coverage.outCount} out, ${coverage.onShiftCount} on shift`}
            >
              {coverage.outCount}
              {" out"}
            </span>
          )}
          {blackoutStart ? (
            <span className="rounded-chip bg-danger-strong px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-navy-fg">
              {"Blackout"}
            </span>
          ) : !blackout && !v ? (
            <span
              className="press grid h-5 w-5 scale-90 place-items-center rounded-chip text-ink-mute opacity-0 group-hover:scale-100 group-hover:opacity-100 group-focus-within:scale-100 group-focus-within:opacity-100"
              aria-hidden="true"
              title="Request time off"
            >
              <Vendor_Plus size={14} />
            </span>
          ) : null}
        </span>
      </div>
      {holiday && (
        <div
          className="shrink-0 truncate rounded-chip bg-warning-soft px-1.5 py-0.5 text-[10px] font-semibold text-warning-ink"
          title={holiday.name}
        >
          {holiday.name}
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col gap-0.5">
        <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
          {N.map((E) => (
            <CalendarChip
              request={E}
              onClick={onChipClick}
              highlighted={
                (E.requestId || E.id) ===
                (highlight == null ? void 0 : highlight.id)
              }
              key={E.lineKey || E.id}
            />
          ))}
        </div>
        {j > 0 && (
          <button
            onClick={(E) => {
              (E.stopPropagation(),
                onChipClick == null || onChipClick(entries[0], entries));
            }}
            className="flex shrink-0 items-center gap-1 rounded-chip px-1.5 py-0.5 text-left hover:bg-panel"
            title={`${j} more off, view all`}
            aria-label={`${j} more ${j === 1 ? "person" : "people"} off, view all`}
          >
            <span className="flex items-center gap-0.5">
              {_.slice(0, 5).map((E) => {
                var T;
                return (
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background:
                        ((T = ptoTypeById(E.type)) == null
                          ? void 0
                          : T.color) || "var(--c-ink-mute)",
                    }}
                    key={E.lineKey || E.id}
                  />
                );
              })}
            </span>
            <span className="text-[10px] font-semibold text-ink-mute">
              {"more"}
            </span>
          </button>
        )}
      </div>
      {typeMarks.length > 0 && !blackout && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col">
          {typeMarks.map((E) => (
            <span
              className={
                E.kind === "blackout"
                  ? "hatch-type h-[4px] w-full"
                  : "h-[3px] w-full"
              }
              style={
                E.kind === "blackout"
                  ? {
                      "--hatch-ink": E.color,
                    }
                  : {
                      background: E.color,
                    }
              }
              title={Dp(E)}
              key={`${E.kind}:${E.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
export function MonthView({
  monthDate: monthDate,
  requests: requests,
  holidays: holidays,
  todayIso: todayIso,
  highlight: highlight,
  onChipClick: onChipClick,
  onEmptyClick: onEmptyClick,
  coverageByDay = {},
}) {
  const {
      ptoTypes: ptoTypes,
      dateRules: dateRules,
      blackouts: blackouts,
    } = useCatalog(),
    d = React.useMemo(() => monthGrid(monthDate), [monthDate]),
    f = d.length / 7,
    p = React.useMemo(() => {
      const g = {
          ptoTypes: ptoTypes,
          dateRules: dateRules,
          blackouts: blackouts,
        },
        k = d.map((x) => isBlackoutDay(x, blackouts)),
        v = d.map((x) => dateTypeMarks(x, g)),
        m = (x, b) => x.id === b.id && x.kind === b.kind;
      return d.map((x, b) => ({
        blackout: k[b],
        blackoutStart: k[b] && !k[b - 1],
        typeMarks: v[b],
        typeMarkStarts: v[b].filter(
          (N) => !(v[b - 1] || []).some((_) => m(_, N)),
        ),
      }));
    }, [d, ptoTypes, dateRules, blackouts]),
    y = (g) =>
      requests
        .filter((k) => rangesOverlap(g, g, k.start, k.end))
        .sort((k, v) =>
          k.status === v.status ? 0 : k.status === "approved" ? -1 : 1,
        );
  return (
    <div
      className="flex flex-none flex-col overflow-clip rounded-card border border-line bg-card shadow-raised"
      style={{
        height: `${38 + f * 132}px`,
      }}
    >
      <div className="sticky top-0 z-20 grid shrink-0 grid-cols-7 border-b border-line bg-panel">
        {WEEKDAY_LABELS.map((g, k) => (
          <div
            className={`px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.07em] ${k === 0 || k === 6 ? "text-ink-mute/60" : "text-ink-mute"}`}
            key={g}
          >
            <span className="hidden sm:inline">{g}</span>
            <span className="sm:hidden">{g[0]}</span>
          </div>
        ))}
      </div>
      <div
        className="grid flex-1 grid-cols-7 [&>*:nth-child(7n)]:border-r-0"
        style={{
          gridTemplateRows: `repeat(${f}, minmax(132px, 1fr))`,
          minHeight: `${f * 132}px`,
        }}
      >
        {d.map((g, k) => {
          const v = toISO(g);
          return (
            <DayCell
              date={g}
              monthDate={monthDate}
              todayIso={todayIso}
              holiday={holidays.find((m) => m.date === v)}
              blackout={p[k].blackout}
              blackoutStart={p[k].blackoutStart}
              typeMarks={p[k].typeMarks}
              typeMarkStarts={p[k].typeMarkStarts}
              entries={y(v)}
              highlight={highlight}
              onChipClick={onChipClick}
              onEmptyClick={onEmptyClick}
              coverage={coverageByDay[v]}
              key={v}
            />
          );
        })}
      </div>
    </div>
  );
}
export const fE = (e) => `color-mix(in oklch, ${e} 15%, var(--c-card))`;
export const pE = (e) => `color-mix(in oklch, ${e} 72%, var(--c-ink))`;
export const zp = (e) =>
  `${e.name} ${e.kind === "blackout" ? "blackout" : "window"}`;
export function buildDayMarks(e, t) {
  const n = e.map((i) => isBlackoutDay(i, t.blackouts)),
    r = e.map((i) => dateTypeMarks(i, t)),
    s = (i, o) => i.id === o.id && i.kind === o.kind;
  return e.map((i, o) => ({
    blackout: n[o],
    blackoutStart: n[o] && !n[o - 1],
    typeMarks: r[o],
    typeMarkStarts: r[o].filter((c) => !(r[o - 1] || []).some((l) => s(l, c))),
  }));
}
export function WeekView({
  anchorDate: anchorDate,
  requests: requests,
  holidays: holidays,
  todayIso: todayIso,
  highlight: highlight,
  onChipClick: onChipClick,
  onEmptyClick: onEmptyClick,
  coverageByDay = {},
}) {
  const {
      ptoTypes: ptoTypes,
      dateRules: dateRules,
      blackouts: blackouts,
      ptoTypeById: ptoTypeById,
      userById: userById,
    } = useCatalog(),
    p = React.useMemo(() => weekGrid(anchorDate), [anchorDate]),
    y = React.useMemo(
      () =>
        buildDayMarks(p, {
          ptoTypes: ptoTypes,
          dateRules: dateRules,
          blackouts: blackouts,
        }),
      [p, ptoTypes, dateRules, blackouts],
    );
  return (
    <div className="overflow-hidden rounded-card border border-line bg-card shadow-raised">
      <div className="grid grid-cols-7">
        {p.map((g, k) => {
          const v = toISO(g),
            m = y[k],
            x = v === todayIso,
            b = v < todayIso,
            N = g.getDay() === 0 || g.getDay() === 6,
            _ = holidays.find((T) => T.date === v),
            j = m.blackout,
            S = highlight && requestIncludesDay(highlight, v),
            R = requests
              .filter((T) => rangesOverlap(v, v, T.start, T.end))
              .sort((T, C) => (T.status === "approved" ? -1 : 1)),
            E = coverageByDay[v];
          return (
            <div
              onClick={() => {
                b || onEmptyClick == null || onEmptyClick(g);
              }}
              className={`group flex min-h-[60vh] flex-col border-r border-line-soft last:border-r-0 ${b ? "cursor-default" : "cursor-pointer"} ${j ? "hatch-danger" : S ? "bg-accent-soft/50" : (E == null ? void 0 : E.outCount) > 0 ? "bg-warning-soft/35" : N ? "bg-panel/30" : ""}`}
              key={v}
            >
              <div
                className={`border-b border-line px-2 py-2 text-center ${x ? "bg-accent-soft" : "bg-surface/60"}`}
              >
                <p className="text-[11px] font-semibold uppercase text-ink-mute">
                  {Vendor_format(g, "EEE")}
                </p>
                <p
                  className={`text-lg font-bold ${x ? "text-accent-ink" : "text-ink"}`}
                >
                  {Vendor_format(g, "d")}
                </p>
              </div>
              {m.typeMarks.length > 0 && (
                <div className="flex flex-col">
                  {m.typeMarks.map((T) => (
                    <span
                      className={
                        T.kind === "blackout"
                          ? "hatch-type h-[4px] w-full"
                          : "h-[3px] w-full"
                      }
                      style={
                        T.kind === "blackout"
                          ? {
                              "--hatch-ink": T.color,
                            }
                          : {
                              background: T.color,
                            }
                      }
                      title={zp(T)}
                      key={`${T.kind}:${T.id}`}
                    />
                  ))}
                </div>
              )}
              <div className="flex flex-1 flex-col gap-1.5 p-2">
                {_ && (
                  <div className="rounded-chip bg-warning-soft px-2 py-1 text-[11px] font-semibold text-warning-ink">
                    {_.name}
                  </div>
                )}
                {(E == null ? void 0 : E.outCount) > 0 && (
                  <div className="rounded-chip bg-warning-soft px-2 py-1 text-[10px] font-semibold text-warning-ink tabular">
                    {E.outCount}
                    {" out · "}
                    {E.onShiftCount}
                    {" in"}
                  </div>
                )}
                {m.blackoutStart && (
                  <div className="rounded-chip bg-danger-strong px-2 py-1 text-[11px] font-bold text-white">
                    {"Blackout"}
                  </div>
                )}
                {m.typeMarkStarts.map((T) => (
                  <div
                    className="rounded-chip px-2 py-1 text-[11px] font-semibold"
                    style={{
                      background: fE(T.color),
                      color: pE(T.color),
                    }}
                    key={`${T.kind}:${T.id}`}
                  >
                    {zp(T)}
                  </div>
                ))}
                {R.map((T) => {
                  var I, D;
                  const C = ptoTypeById(T.type),
                    H = T.status === "pending";
                  return (
                    <button
                      onClick={(q) => {
                        (q.stopPropagation(),
                          onChipClick == null || onChipClick(T));
                      }}
                      className={`rounded-chip px-2 py-1.5 text-left text-xs transition-[background,border-color,box-shadow] duration-[180ms] ease-out hover:shadow-card ${(T.requestId || T.id) === (highlight == null ? void 0 : highlight.id) ? "shadow-lift ring-2 ring-accent-strong ring-offset-1" : ""}`}
                      style={{
                        background: `color-mix(in oklch, ${C.color} ${H ? 9 : 16}%, var(--c-card))`,
                        border: H
                          ? `1px dashed color-mix(in oklch, ${C.color} 55%, transparent)`
                          : `1px solid color-mix(in oklch, ${C.color} 30%, transparent)`,
                      }}
                      aria-label={`${(I = userById(T.userId)) == null ? void 0 : I.name}, ${T.line?.holidayName || C.name}, ${T.status}`}
                      key={T.lineKey || T.id}
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            background: C.color,
                          }}
                        />
                        <span className="font-semibold text-ink">
                          {firstName(
                            (D = userById(T.userId)) == null ? void 0 : D.name,
                          )}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[10px] text-ink-mute">
                        {T.line?.holidayName || C.name}
                      </span>
                    </button>
                  );
                })}
                {R.length === 0 && !_ && !j && !b && (
                  <span className="mt-1 flex items-center justify-center gap-1 text-[11px] font-medium text-ink-mute opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100">
                    <Vendor_Plus size={12} />
                    {" Request"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export const yE = (e) => `color-mix(in oklch, ${e} 15%, var(--c-card))`;
export const xE = (e) => `color-mix(in oklch, ${e} 72%, var(--c-ink))`;
export const is = 14;
export function TeamTimeline({
  anchorDate: anchorDate,
  members: members,
  requests: requests,
  holidays: holidays,
  todayIso: todayIso,
  highlight: highlight,
  onChipClick: onChipClick,
}) {
  const {
      ptoTypes: ptoTypes,
      dateRules: dateRules,
      blackouts: blackouts,
      ptoTypeById: ptoTypeById,
    } = useCatalog(),
    d = React.useMemo(
      () =>
        Vendor_startOfWeek(anchorDate, {
          weekStartsOn: 0,
        }),
      [anchorDate],
    ),
    f = React.useMemo(
      () =>
        Array.from(
          {
            length: is,
          },
          (_, j) => Vendor_addDays(d, j),
        ),
      [d],
    ),
    p = React.useMemo(
      () => f.map((_) => isBlackoutDay(_, blackouts)),
      [f, blackouts],
    ),
    { placed: placed, rowCount: rowCount } = React.useMemo(
      () =>
        placeBands(
          calendarBands(f, {
            ptoTypes: ptoTypes,
            dateRules: dateRules,
            blackouts: blackouts,
          }),
        ),
      [f, ptoTypes, dateRules, blackouts],
    ),
    k = toISO(d),
    v = toISO(Vendor_addDays(d, is - 1)),
    m = (_) => `${(_ / is) * 100}%`,
    x = (_) => Vendor_differenceInCalendarDays(toDateLocal(_), d),
    b = x(todayIso),
    N = f.map((_) => {
      const j = toISO(_),
        S = members.filter((T) =>
          requests.some(
            (C) =>
              C.userId === T.id &&
              C.status === "approved" &&
              rangesOverlap(j, j, C.start, C.end),
          ),
        ).length,
        R = members.length ? S / members.length : 0,
        E = R === 0 || R < 0.34 ? "success" : R < 0.5 ? "warning" : "danger";
      return {
        iso: j,
        out: S,
        ratio: R,
        tone: E,
      };
    });
  return members.length === 0 ? (
    <div className="rounded-card border border-line bg-card shadow-card">
      <EmptyState
        icon={Vendor_Users}
        title="No one to show"
        description="Pick a team or person to see their coverage on the wallchart."
      />
    </div>
  ) : (
    <div className="overflow-hidden rounded-card border border-line bg-card shadow-raised">
      <div className="overflow-x-auto scrollbar-slim">
        <div className="min-w-[760px]">
          <div className="flex border-b border-line bg-surface/60">
            <div className="w-40 shrink-0 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-ink-mute">
              {"Member"}
            </div>
            <div className="relative flex flex-1">
              {f.map((_, j) => {
                const S = toISO(_),
                  R = Vendor_isSameDay(_, toDateLocal(todayIso)),
                  E = holidays.some((T) => T.date === S);
                return (
                  <div
                    className={`flex-1 border-l border-line py-1.5 text-center ${R ? "bg-accent-soft" : p[j] ? "hatch-danger" : ""}`}
                    title={p[j] ? "Blackout day" : void 0}
                    key={S}
                  >
                    <p className="text-[10px] font-semibold text-ink-mute">
                      {Vendor_format(_, "EEEEE")}
                    </p>
                    <p
                      className={`text-xs font-bold ${E ? "text-warning-ink" : "text-ink"}`}
                    >
                      {Vendor_format(_, "d")}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          {placed.length > 0 && (
            <div className="flex border-b border-line bg-card">
              <div
                className="w-40 shrink-0 border-r border-line"
                aria-hidden="true"
              />
              <div
                className="relative flex-1"
                style={{
                  minHeight: rowCount * 26 + 8,
                }}
              >
                {placed.map((_) => {
                  const j = (_.startIdx / is) * 100,
                    S = ((_.endIdx - _.startIdx + 1) / is) * 100,
                    R = _.kind === "blackout" && !_.typeId,
                    E = _.kind === "blackout" && !!_.typeId;
                  return (
                    <div
                      className={`absolute flex h-[22px] items-center truncate rounded-chip px-2 text-[11px] font-semibold ${E ? "hatch-type" : ""}`}
                      style={{
                        top: 4 + _.row * 26,
                        left: `${j}%`,
                        width: `calc(${S}% - 4px)`,
                        marginLeft: 2,
                        ...(R
                          ? {
                              background: "var(--c-danger-soft)",
                              color: "var(--c-danger-ink)",
                              border:
                                "1px solid color-mix(in oklch, var(--c-danger) 40%, transparent)",
                            }
                          : {
                              background: yE(_.color),
                              color: xE(_.color),
                              border: `1px solid color-mix(in oklch, ${_.color} 35%, transparent)`,
                            }),
                        ...(E
                          ? {
                              "--hatch-ink": `color-mix(in oklch, ${_.color} 30%, transparent)`,
                            }
                          : {}),
                      }}
                      title={_.label}
                      key={`${_.kind}-${_.typeId || "blackout"}-${_.startIdx}`}
                    >
                      {_.label}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex border-b border-line bg-card">
            <div className="flex w-40 shrink-0 items-center px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-mute">
              {"Out / day"}
            </div>
            <div className="flex flex-1">
              {N.map((_, j) => (
                <div
                  className={`flex flex-1 flex-col items-center gap-1 border-l border-line px-1 py-1.5 ${j === b ? "bg-accent-soft/50" : p[j] ? "hatch-danger" : ""}`}
                  title={`${_.out} of ${members.length} out`}
                  key={_.iso}
                >
                  <div
                    className="h-1.5 w-full rounded-full transition-colors duration-[180ms]"
                    style={{
                      background: _.out
                        ? `var(--c-${_.tone})`
                        : "var(--c-line)",
                    }}
                  />
                  <span
                    className="text-[10px] font-bold tabular"
                    style={{
                      color: _.out
                        ? `var(--c-${_.tone}-ink)`
                        : "var(--c-ink-mute)",
                    }}
                  >
                    {_.out || "·"}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {members.map((_) => {
            const j = requests
              .filter(
                (S) =>
                  S.userId === _.id &&
                  ["approved", "pending"].includes(S.status) &&
                  rangesOverlap(S.start, S.end, k, v),
              )
              .map((S) => {
                const R = Math.max(0, x(S.start)),
                  E = Math.min(is - 1, x(S.end));
                return {
                  ...S,
                  s: R,
                  span: E - R + 1,
                };
              });
            return (
              <div
                className="flex border-b border-line-soft last:border-b-0"
                key={_.id}
              >
                <div className="flex w-40 shrink-0 items-center gap-2 px-3 py-2.5">
                  <Avatar name={_.name} id={_.id} size="xs" />
                  <span className="truncate text-sm font-medium text-ink">
                    {firstName(_.name)}
                  </span>
                </div>
                <div className="relative flex-1">
                  <div className="absolute inset-0 flex">
                    {f.map((S, R) => (
                      <div
                        className={`flex-1 border-l border-line-soft ${R === b ? "bg-accent-soft/50" : p[R] ? "hatch-danger" : ""}`}
                        key={toISO(S)}
                      />
                    ))}
                  </div>
                  <div
                    className="relative py-2"
                    style={{
                      minHeight: `${Math.max(j.length, 1) * 28 + 8}px`,
                    }}
                  >
                    {j.map((S, R) => {
                      const E = ptoTypeById(S.type),
                        T = S.status === "pending";
                      return (
                        <button
                          onClick={() =>
                            onChipClick == null ? void 0 : onChipClick(S)
                          }
                          className={`absolute flex h-6 items-center gap-1 truncate rounded-chip px-2 text-[11px] font-semibold transition-[background,border-color,box-shadow] duration-[180ms] ease-out hover:shadow-card ${(S.requestId || S.id) === (highlight == null ? void 0 : highlight.id) ? "shadow-lift ring-2 ring-accent-strong ring-offset-1" : ""}`}
                          style={{
                            top: `${8 + R * 28}px`,
                            left: m(S.s),
                            width: `calc(${m(S.span)} - 4px)`,
                            marginLeft: "2px",
                            color: `color-mix(in oklch, ${E.color} 72%, var(--c-ink))`,
                            background: `color-mix(in oklch, ${E.color} ${T ? 12 : 22}%, var(--c-card))`,
                            border: T
                              ? `1px dashed color-mix(in oklch, ${E.color} 55%, transparent)`
                              : `1px solid color-mix(in oklch, ${E.color} 32%, transparent)`,
                          }}
                          title={`${_.name} · ${S.line?.holidayName || E.name} · ${S.status}`}
                          key={S.lineKey || S.id}
                        >
                          <PtoTypeIcon typeId={E.id} size={6} />
                          <span className="truncate">
                            {S.line?.holidayName || E.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
export const wE = (e) => `color-mix(in oklch, ${e} 20%, var(--c-card))`;
export function CalendarLegend() {
  const {
      ptoTypes: ptoTypes,
      dateRules: dateRules,
      blackouts: blackouts,
    } = useCatalog(),
    r = windowedTypes(ptoTypes, dateRules),
    s = blackoutTypes(ptoTypes, blackouts);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-xs">
      <span className="eyebrow">{"Leave type"}</span>
      {ptoTypes.map((i) => (
        <span className="flex items-center gap-1.5 text-ink-soft" key={i.id}>
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: i.color,
            }}
          />
          {i.name}
        </span>
      ))}
      <span className="ml-auto flex flex-wrap items-center gap-3 text-ink-mute">
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-5 rounded-chip border border-ink-mute/40 bg-panel" />
          {" Approved"}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-5 rounded-chip border border-dashed border-ink-mute/55" />
          {" Pending"}
        </span>
        {r.map((i) => (
          <span className="flex items-center gap-1.5" key={i.id}>
            <span
              className="h-3.5 w-5 rounded-chip"
              style={{
                background: wE(i.color),
              }}
            />{" "}
            {i.name}
            {" window"}
          </span>
        ))}
        {s.map((i) => (
          <span className="flex items-center gap-1.5" key={i.id}>
            <span
              className="hatch-type h-3.5 w-5 rounded-chip"
              style={{
                "--hatch-ink": i.color,
              }}
            />{" "}
            {i.name}
            {" blackout"}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-5 rounded-chip hatch-danger" />
          {" Blackout"}
        </span>
      </span>
    </div>
  );
}
