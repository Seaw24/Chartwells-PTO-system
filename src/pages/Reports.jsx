import { toCsv } from "../utils/csv.js";
import { useResource } from "../hooks/useResource.jsx";
import { ResponsiveContainer as Vendor_ResponsiveContainer } from "recharts";
import { BarChart as Vendor_BarChart } from "recharts";
import { CartesianGrid as Vendor_CartesianGrid } from "recharts";
import { XAxis as Vendor_XAxis } from "recharts";
import { YAxis as Vendor_YAxis } from "recharts";
import { Tooltip as Vendor_Tooltip } from "recharts";
import { Legend as Vendor_Legend } from "recharts";
import { Bar as Vendor_Bar } from "recharts";
import { getDaysInMonth as Vendor_getDaysInMonth } from "date-fns";
import { rangesOverlap } from "../utils/dateHelpers.jsx";
import { PieChart as Vendor_PieChart } from "recharts";
import { Pie as Vendor_Pie } from "recharts";
import { Cell as Vendor_Cell } from "recharts";
import { LineChart as Vendor_LineChart } from "recharts";
import { Line as Vendor_Line } from "recharts";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { Clock as Vendor_Clock } from "lucide-react";
import { useVersion } from "../context/DataVersionContext.jsx";
import { useDataSource } from "../data/dataSource.jsx";
import { useCatalog } from "../context/CatalogContext.jsx";
import React from "react";
import { requestLines } from "../utils/requestHelpers.jsx";
import { lineEntriesForRequest } from "../utils/requestHelpers.jsx";
import { toDateLocal } from "../utils/dateHelpers.jsx";
import { lineDays } from "../utils/requestHelpers.jsx";
import { startOfWeek as Vendor_startOfWeek } from "date-fns";
import { format as Vendor_format } from "date-fns";
import { differenceInCalendarDays as Vendor_differenceInCalendarDays } from "date-fns";
import { Button } from "../components/ui/Button.jsx";
import { Download as Vendor_Download } from "lucide-react";
export function UsageByTypeChart({ data: data, ptoTypes: ptoTypes }) {
  return (
    <Vendor_ResponsiveContainer width="100%" height={280}>
      <Vendor_BarChart
        data={data}
        margin={{
          top: 8,
          right: 8,
          left: -16,
          bottom: 0,
        }}
      >
        <Vendor_CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--c-line)"
          vertical={!1}
        />
        <Vendor_XAxis
          dataKey="month"
          tick={{
            fontSize: 11,
            fill: "var(--c-ink-mute)",
          }}
          axisLine={!1}
          tickLine={!1}
        />
        <Vendor_YAxis
          tick={{
            fontSize: 11,
            fill: "var(--c-ink-mute)",
          }}
          axisLine={!1}
          tickLine={!1}
          allowDecimals={!1}
        />
        <Vendor_Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid var(--c-line)",
            fontSize: 12,
            boxShadow: "var(--c-shadow)",
          }}
          cursor={{
            fill: "var(--c-panel)",
          }}
        />
        <Vendor_Legend
          wrapperStyle={{
            fontSize: 11,
          }}
          iconType="circle"
        />
        {ptoTypes.map((r) => (
          <Vendor_Bar
            dataKey={r.name}
            stackId="u"
            fill={r.color}
            radius={[2, 2, 0, 0]}
            maxBarSize={32}
            key={r.id}
          />
        ))}
      </Vendor_BarChart>
    </Vendor_ResponsiveContainer>
  );
}
export function TeamComparisonChart({ data: data }) {
  return (
    <Vendor_ResponsiveContainer width="100%" height={280}>
      <Vendor_BarChart
        data={data}
        margin={{
          top: 8,
          right: 8,
          left: -16,
          bottom: 0,
        }}
      >
        <Vendor_CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--c-line)"
          vertical={!1}
        />
        <Vendor_XAxis
          dataKey="team"
          tick={{
            fontSize: 11,
            fill: "var(--c-ink-mute)",
          }}
          axisLine={!1}
          tickLine={!1}
        />
        <Vendor_YAxis
          tick={{
            fontSize: 11,
            fill: "var(--c-ink-mute)",
          }}
          axisLine={!1}
          tickLine={!1}
        />
        <Vendor_Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid var(--c-line)",
            fontSize: 12,
          }}
          cursor={{
            fill: "var(--c-panel)",
          }}
        />
        <Vendor_Bar
          dataKey="avgDays"
          name="Avg days / person"
          fill="var(--c-navy-600)"
          radius={[4, 4, 0, 0]}
          maxBarSize={64}
        />
      </Vendor_BarChart>
    </Vendor_ResponsiveContainer>
  );
}
export const reports_nd = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export function AbsenceHeatmap({ requests: requests, year = 2026 }) {
  const r = requests.filter((a) => a.status === "approved");
  let n = 1;
  const i = reports_nd.map((a, o) => {
    const u = Vendor_getDaysInMonth(new Date(year, o));
    return Array.from(
      {
        length: 31,
      },
      (c, s) => {
        if (s >= u) return null;
        const f = `${year}-${String(o + 1).padStart(2, "0")}-${String(s + 1).padStart(2, "0")}`,
          l = r.filter((p) => rangesOverlap(f, f, p.start, p.end)).length;
        return (
          l > n && (n = l),
          {
            iso: f,
            count: l,
          }
        );
      },
    );
  });
  return (
    <div className="overflow-x-auto scrollbar-slim">
      <div className="min-w-[640px]">
        <div className="mb-1 flex pl-9">
          {Array.from(
            {
              length: 31,
            },
            (a, o) => (
              <div
                className="flex-1 text-center text-[9px] text-ink-mute"
                key={o}
              >
                {o + 1}
              </div>
            ),
          )}
        </div>
        {i.map((a, o) => (
          <div className="flex items-center" key={o}>
            <div className="w-9 shrink-0 text-[10px] font-semibold text-ink-mute">
              {reports_nd[o]}
            </div>
            <div className="flex flex-1 gap-0.5">
              {a.map((u, c) =>
                u === null ? (
                  <div className="aspect-square flex-1" key={c} />
                ) : (
                  <div
                    title={u.count ? `${u.iso}: ${u.count} out` : u.iso}
                    className="aspect-square flex-1 rounded-[2px]"
                    style={{
                      background:
                        u.count === 0
                          ? "var(--c-panel)"
                          : `color-mix(in oklch, var(--c-accent) ${20 + (u.count / n) * 70}%, var(--c-card))`,
                    }}
                    key={c}
                  />
                ),
              )}
            </div>
          </div>
        ))}
        <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-ink-mute">
          {"Less"}
          {[0, 0.3, 0.6, 1].map((a) => (
            <span
              className="h-3 w-3 rounded-[2px]"
              style={{
                background:
                  a === 0
                    ? "var(--c-panel)"
                    : `color-mix(in oklch, var(--c-accent) ${20 + a * 70}%, var(--c-card))`,
              }}
              key={a}
            />
          ))}
          {"More"}
        </div>
      </div>
    </div>
  );
}
export function BalanceLiabilityChart({ data: data, total: total }) {
  return (
    <div className="relative">
      <Vendor_ResponsiveContainer width="100%" height={280}>
        <Vendor_PieChart>
          <Vendor_Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={70}
            outerRadius={104}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((r) => (
              <Vendor_Cell fill={r.color} key={r.name} />
            ))}
          </Vendor_Pie>
          <Vendor_Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--c-line)",
              fontSize: 12,
            }}
          />
          <Vendor_Legend
            wrapperStyle={{
              fontSize: 11,
            }}
            iconType="circle"
          />
        </Vendor_PieChart>
      </Vendor_ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 top-[104px] -translate-y-1/2 text-center">
        <p className="font-mono text-3xl font-medium text-ink tabular">
          {total}
        </p>
        <p className="text-xs text-ink-mute">{"days unused"}</p>
      </div>
    </div>
  );
}
export function ApprovalTurnaroundChart({ data: data }) {
  return data.length ? (
    <Vendor_ResponsiveContainer width="100%" height={280}>
      <Vendor_LineChart
        data={data}
        margin={{
          top: 8,
          right: 12,
          left: -16,
          bottom: 0,
        }}
      >
        <Vendor_CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--c-line)"
          vertical={!1}
        />
        <Vendor_XAxis
          dataKey="week"
          tick={{
            fontSize: 11,
            fill: "var(--c-ink-mute)",
          }}
          axisLine={!1}
          tickLine={!1}
        />
        <Vendor_YAxis
          tick={{
            fontSize: 11,
            fill: "var(--c-ink-mute)",
          }}
          axisLine={!1}
          tickLine={!1}
          unit="d"
        />
        <Vendor_Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid var(--c-line)",
            fontSize: 12,
          }}
        />
        <Vendor_Line
          type="monotone"
          dataKey="avgDays"
          name="Avg turnaround"
          stroke="var(--c-accent)"
          strokeWidth={2.5}
          dot={{
            r: 3,
            fill: "var(--c-accent)",
          }}
          activeDot={{
            r: 5,
          }}
        />
      </Vendor_LineChart>
    </Vendor_ResponsiveContainer>
  ) : (
    <EmptyState
      icon={Vendor_Clock}
      title="Not enough data"
      description="Turnaround appears once requests are decided."
      className="py-12"
    />
  );
}
export const reports_XU = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export function ReportsPage() {
  const e = useVersion(),
    {
      getRequests: getRequests,
      usedFor: usedFor,
      grantFor: grantFor,
      normalDaysOffFor: normalDaysOffFor,
    } = useDataSource(),
    {
      users: users,
      teams: teams,
      ptoTypes: ptoTypes,
      balanceTypes: balanceTypes,
      userById: userById,
      teamById: teamById,
      ptoTypeById: ptoTypeById,
    } = useCatalog(),
    [y, v] = React.useState("all"),
    [d, b] = React.useState("all");
  const { data: p = null } = useResource(
    ["reports", users.map((user) => user.id), ptoTypes.map((type) => type.id)],
    async () => {
      const requests = await getRequests();
      const rows = await Promise.all(
        users.map(async (user) => ({
          id: user.id,
          normalDaysOff: await normalDaysOffFor(user.id),
          balances: await Promise.all(
            balanceTypes.map(async (type) => ({
              id: type.id,
              used: await usedFor(user.id, type.id),
              grant: await grantFor(user.id, type.id),
            })),
          ),
        })),
      );
      return {
        requests,
        users,
        normalDaysOffByUser: Object.fromEntries(
          rows.map((row) => [row.id, row.normalDaysOff]),
        ),
        usedByUserType: Object.fromEntries(
          rows.map((row) => [
            row.id,
            Object.fromEntries(row.balances.map((b) => [b.id, b.used])),
          ]),
        ),
        grantByUserType: Object.fromEntries(
          rows.map((row) => [
            row.id,
            Object.fromEntries(row.balances.map((b) => [b.id, b.grant])),
          ]),
        ),
      };
    },
    true,
  );
  void 0;
  const x = (p == null ? void 0 : p.requests) ?? [],
    w = React.useMemo(
      () =>
        x.filter((_) => {
          var T;
          return !(
            (y !== "all" &&
              ((T = userById(_.userId)) == null ? void 0 : T.team) !== y) ||
            (d !== "all" && !requestLines(_).some((j) => j.type === d))
          );
        }),
      [x, y, d],
    ),
    O = React.useMemo(
      () =>
        w
          .flatMap(lineEntriesForRequest)
          .filter((_) => d === "all" || _.type === d),
      [w, d],
    ),
    m = O.filter((_) => _.status === "approved"),
    g = React.useMemo(() => {
      const _ = reports_XU.map((T) => ({
        month: T,
        ...Object.fromEntries(ptoTypes.map((j) => [j.name, 0])),
      }));
      return (
        m.forEach((T) => {
          const j = toDateLocal(T.start).getMonth();
          _[j][ptoTypeById(T.type)?.name ?? "Retired type"] += lineDays(
            T,
            p.normalDaysOffByUser[T.userId],
          );
        }),
        _
      );
    }, [m, p]),
    A = React.useMemo(
      () =>
        teams.map((_) => {
          const T = users.filter((E) => E.team === _.id),
            j = m
              .filter((E) => {
                var I;
                return (
                  ((I = userById(E.userId)) == null ? void 0 : I.team) === _.id
                );
              })
              .reduce(
                (E, I) =>
                  E + lineDays(I, p.normalDaysOffByUser[I.userId]),
                0,
              );
          return {
            team: _.name,
            avgDays: T.length ? +(j / T.length).toFixed(1) : 0,
          };
        }),
      [m, p, users],
    ),
    { liability: liability, liabilityTotal: liabilityTotal } =
      React.useMemo(() => {
        if (!p)
          return {
            liability: [],
            liabilityTotal: 0,
          };
        const _ = balanceTypes.map((T) => {
          const j = users.reduce(
            (E, I) =>
              E +
              (p.grantByUserType[I.id][T.id] - p.usedByUserType[I.id][T.id]),
            0,
          );
          return {
            name: T.name,
            value: j,
            color: T.color,
          };
        });
        return {
          liability: _,
          liabilityTotal: _.reduce((T, j) => T + j.value, 0),
        };
      }, [p, users]),
    C = React.useMemo(() => {
      const _ = new Map();
      return (
        w
          .filter((T) => T.decidedAt)
          .forEach((T) => {
            const j = Vendor_startOfWeek(toDateLocal(T.submittedAt)),
              E = Vendor_format(j, "yyyy-MM-dd"),
              I = Math.abs(
                Vendor_differenceInCalendarDays(
                  toDateLocal(T.decidedAt),
                  toDateLocal(T.submittedAt),
                ),
              );
            (_.has(E) ||
              _.set(E, {
                week: Vendor_format(j, "MMM d"),
                sort: j.getTime(),
                vals: [],
              }),
              _.get(E).vals.push(I));
          }),
        Array.from(_.values())
          .sort((T, j) => T.sort - j.sort)
          .map(({ week: week, vals: vals }) => ({
            week: week,
            avgDays: +(vals.reduce((E, I) => E + I, 0) / vals.length).toFixed(
              1,
            ),
          }))
          .slice(-8)
      );
    }, [w]);
  function M() {
    const _ = [
        "Employee",
        "Team",
        "Type",
        "Start",
        "End",
        "Business Days",
        "Status",
        "Decided By",
      ],
      T = O.map((D) => {
        var R, z, U, q, F;
        return [
          (R = userById(D.userId)) == null ? void 0 : R.name,
          ((U = teamById((z = userById(D.userId)) == null ? void 0 : z.team)) ==
          null
            ? void 0
            : U.name) || "",
          D.line.holidayName
            ? `${ptoTypeById(D.type)?.name} (${D.line.holidayName})`
            : (q = ptoTypeById(D.type)) == null
              ? void 0
              : q.name,
          D.start,
          D.end,
          lineDays(D, p.normalDaysOffByUser[D.userId]),
          D.status,
          ((F = userById(D.decidedBy)) == null ? void 0 : F.name) || "",
        ];
      }),
      j = toCsv([_, ...T]),
      E = URL.createObjectURL(
        new Blob([j], {
          type: "text/csv",
        }),
      ),
      I = document.createElement("a");
    ((I.href = E),
      (I.download = "chartwells-pto-report.csv"),
      I.click(),
      URL.revokeObjectURL(E));
  }
  return p === null ? (
    <div className="p-6 text-sm text-ink-mute">{"Loading…"}</div>
  ) : (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <ReportFilter
          value={y}
          onChange={v}
          label="All teams"
          options={teams.map((_) => ({
            value: _.id,
            label: _.name,
          }))}
        />
        <ReportFilter
          value={d}
          onChange={b}
          label="All types"
          options={ptoTypes.map((_) => ({
            value: _.id,
            label: _.name,
          }))}
        />
        <Button variant="outline" size="sm" className="ml-auto" onClick={M}>
          <Vendor_Download size={15} />
          {" Export CSV"}
        </Button>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="PTO usage by type" subtitle="Business days, monthly">
          <UsageByTypeChart data={g} ptoTypes={ptoTypes} />
        </ChartCard>
        <ChartCard
          title="Team comparison"
          subtitle="Average days taken per person"
        >
          <TeamComparisonChart data={A} />
        </ChartCard>
        <ChartCard
          title="Balance liability"
          subtitle="Unused days remaining company-wide"
        >
          <BalanceLiabilityChart data={liability} total={liabilityTotal} />
        </ChartCard>
        <ChartCard
          title="Approval turnaround"
          subtitle="Days from request to decision, by week"
        >
          <ApprovalTurnaroundChart data={C} />
        </ChartCard>
        <ChartCard
          title="Absence density"
          subtitle="People out per day across 2026"
          className="lg:col-span-2"
        >
          <AbsenceHeatmap requests={m} />
        </ChartCard>
      </div>
    </div>
  );
}
export function ChartCard({
  title: title,
  subtitle: subtitle,
  className = "",
  children: children,
}) {
  return (
    <section
      className={`rounded-card border border-line bg-card p-5 shadow-card ${className}`}
    >
      <header className="mb-4">
        <h3 className="text-sm font-bold text-ink">{title}</h3>
        {subtitle && <p className="text-xs text-ink-mute">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}
export function ReportFilter({
  value: value,
  onChange: onChange,
  label: label,
  options: options,
}) {
  return (
    <select
      value={value}
      onChange={(i) => onChange(i.target.value)}
      className="rounded-btn border border-line bg-card px-3 py-2 text-sm font-medium text-ink focus:border-accent focus:outline-none"
    >
      <option value="all">{label}</option>
      {options.map((i) => (
        <option value={i.value} key={i.value}>
          {i.label}
        </option>
      ))}
    </select>
  );
}
export default ReportsPage;
