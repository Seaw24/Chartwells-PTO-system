import { startOfWeek as Vendor_startOfWeek } from "date-fns";
import { toDateLocal } from "../../utils/dateHelpers.jsx";
import { differenceInCalendarDays as Vendor_differenceInCalendarDays } from "date-fns";
import { addDays as Vendor_addDays } from "date-fns";
import { toISO } from "../../utils/dateHelpers.jsx";
import { belongsToTeam } from "../../utils/constants.jsx";
import { lineEntriesForRequest } from "../../utils/requestHelpers.jsx";
import { rangesOverlap } from "../../utils/dateHelpers.jsx";
import { format as Vendor_format } from "date-fns";
export const qS = ["S", "M", "T", "W", "T", "F", "S"];
export const HS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const Ap = (e, t) => e > 0 && e * 3 > t;
export function buildCoverageWeek({
  todayIso: todayIso,
  users: users,
  requests: requests,
  teams = [],
  holidays = [],
  coverageRows = [],
}) {
  const o = Vendor_startOfWeek(toDateLocal(todayIso), {
      weekStartsOn: 0,
    }),
    c = (p) =>
      Math.max(
        0,
        Math.min(6, Vendor_differenceInCalendarDays(toDateLocal(p), o)),
      ),
    l = Array.from(
      {
        length: 7,
      },
      (p, y) => {
        const g = Vendor_addDays(o, y),
          k = toISO(g),
          v = g.getDay();
        return {
          iso: k,
          dow: v,
          dowLetter: qS[v],
          dowShort: HS[v],
          dateNum: g.getDate(),
          isToday: k === todayIso,
          isWeekend: v === 0 || v === 6,
          holiday: holidays.find((m) => m.date === k) || null,
        };
      },
    ),
    u = l[0].iso,
    h = l[6].iso,
    d = teams.map((p) => {
      const y = users.filter((N) => belongsToTeam(N, p.id)),
        g = coverageRows.filter((N) => N.teamId === p.id),
        k = Math.max(y.length, ...g.map((N) => N.outCount + N.onShiftCount), 0),
        v = y
          .map((N) => {
            const _ = requests
              .filter((j) => j.userId === N.id)
              .flatMap(lineEntriesForRequest)
              .filter(
                (j) =>
                  ["approved", "pending"].includes(j.status) &&
                  rangesOverlap(j.start, j.end, u, h),
              )
              .map((j) => {
                const S = c(j.start),
                  R = c(j.end);
                return {
                  key: j.lineKey,
                  type: j.type,
                  status: j.status,
                  startIdx: S,
                  endIdx: R,
                  span: R - S + 1,
                  clipsLeft:
                    Vendor_differenceInCalendarDays(toDateLocal(j.start), o) <
                    0,
                  clipsRight:
                    Vendor_differenceInCalendarDays(toDateLocal(j.end), o) > 6,
                  start: j.start,
                  end: j.end,
                  requestId: j.requestId,
                };
              })
              .sort((j, S) => j.startIdx - S.startIdx || j.endIdx - S.endIdx);
            return {
              user: N,
              bars: _,
              lanes: placeRequestLanes(_),
            };
          })
          .filter((N) => N.bars.length > 0)
          .sort(
            (N, _) =>
              N.bars[0].startIdx - _.bars[0].startIdx ||
              N.user.name.localeCompare(_.user.name),
          ),
        m = l.map((N) => {
          const _ = g.find((S) => S.day === N.iso);
          if (_) {
            const S = _.outCount + _.onShiftCount;
            return {
              iso: N.iso,
              closed: S === 0,
              out: _.outCount,
              present: _.onShiftCount,
              short: Ap(_.outCount, S),
            };
          }
          if (N.isWeekend)
            return {
              iso: N.iso,
              closed: !0,
              out: 0,
              present: k,
              short: !1,
            };
          const j = y.filter((S) =>
            requests.some(
              (R) =>
                R.userId === S.id &&
                lineEntriesForRequest(R).some(
                  (E) =>
                    E.status === "approved" &&
                    rangesOverlap(N.iso, N.iso, E.start, E.end),
                ),
            ),
          ).length;
          return {
            iso: N.iso,
            closed: !1,
            out: j,
            present: k - j,
            short: Ap(j, k),
          };
        }),
        x = m
          .filter((N) => N.short)
          .map((N) => l.find((_) => _.iso === N.iso).dowShort),
        b = Math.max(v.length, ...m.map((N) => N.out), 0);
      return {
        id: p.id,
        name: p.name,
        size: k,
        rows: v,
        coverage: m,
        shortDays: x,
        offCount: b,
        anyoneOff: b > 0,
      };
    }),
    f = d.reduce((p, y) => p + y.offCount, 0);
  return {
    days: l,
    weekStart: u,
    weekEnd: h,
    teams: d,
    totalOff: f,
    rangeLabel: shortRange(u, h),
  };
}
export function placeRequestLanes(e) {
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
export function shortRange(e, t) {
  const n = toDateLocal(e),
    r = toDateLocal(t);
  return n.getMonth() === r.getMonth()
    ? `${Vendor_format(n, "MMM d")}–${Vendor_format(r, "d")}`
    : `${Vendor_format(n, "MMM d")} – ${Vendor_format(r, "MMM d")}`;
}
