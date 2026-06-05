import { useEffect, useMemo, useState } from 'react';
import { format, differenceInCalendarDays, startOfWeek } from 'date-fns';
import { Download } from 'lucide-react';
import { useDataSource } from '../data/dataSource';
import {
  PTO_TYPES,
  TEAMS,
  userById,
  teamById,
  ptoTypeById,
} from '../utils/constants';
import { toDate } from '../utils/dateHelpers';
import { lineDays, lineEntriesForRequest, requestLines } from '../utils/requestHelpers';
import Button from '../components/ui/Button';
import UsageByTypeChart from '../components/reports/UsageByTypeChart';
import TeamComparisonChart from '../components/reports/TeamComparisonChart';
import AbsenceHeatmap from '../components/reports/AbsenceHeatmap';
import BalanceLiabilityChart from '../components/reports/BalanceLiabilityChart';
import ApprovalTurnaroundChart from '../components/reports/ApprovalTurnaroundChart';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Reports() {
  const { getRequests, getUsers, usedFor, grantFor, normalDaysOffFor } = useDataSource();
  const [data, setData] = useState(null);
  const [teamFilter, setTeamFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    let alive = true;
    async function load() {
      const [requests, users] = await Promise.all([getRequests(), getUsers()]);
      const [usedList, grantList, daysOffList] = await Promise.all([
        Promise.all(users.flatMap((u) => PTO_TYPES.map((t) => usedFor(u.id, t.id)))),
        Promise.all(users.flatMap((u) => PTO_TYPES.map((t) => grantFor(u.id, t.id)))),
        Promise.all(users.map((u) => normalDaysOffFor(u.id))),
      ]);
      if (!alive) return;
      const usedByUserType = {};
      const grantByUserType = {};
      let i = 0;
      users.forEach((u) => {
        usedByUserType[u.id] = {};
        grantByUserType[u.id] = {};
        PTO_TYPES.forEach((t) => {
          usedByUserType[u.id][t.id] = usedList[i++];
        });
      });
      i = 0;
      users.forEach((u) => {
        PTO_TYPES.forEach((t) => {
          grantByUserType[u.id][t.id] = grantList[i++];
        });
      });
      const normalDaysOffByUser = {};
      users.forEach((u, index) => { normalDaysOffByUser[u.id] = daysOffList[index]; });
      setData({ requests, users, usedByUserType, grantByUserType, normalDaysOffByUser });
    }
    load();
    return () => { alive = false; };
  }, []);

  const requests = data?.requests ?? [];
  const users = data?.users ?? [];

  const filtered = useMemo(
    () =>
      requests.filter((r) => {
        if (teamFilter !== 'all' && userById(r.userId)?.team !== teamFilter) return false;
        if (typeFilter !== 'all' && !requestLines(r).some((line) => line.type === typeFilter)) return false;
        return true;
      }),
    [requests, teamFilter, typeFilter]
  );
  const filteredEntries = useMemo(
    () =>
      filtered
        .flatMap(lineEntriesForRequest)
        .filter((entry) => typeFilter === 'all' || entry.type === typeFilter),
    [filtered, typeFilter]
  );
  const approved = filteredEntries.filter((r) => r.status === 'approved');

  // Monthly usage stacked by type.
  const monthlyUsage = useMemo(() => {
    const rows = MONTHS.map((m) => ({ month: m, ...Object.fromEntries(PTO_TYPES.map((t) => [t.name, 0])) }));
    approved.forEach((r) => {
      const mi = toDate(r.start).getMonth();
      rows[mi][ptoTypeById(r.type).name] += lineDays(r, data.normalDaysOffByUser[r.userId]);
    });
    return rows;
  }, [approved, data]);

  // Avg days taken per team member.
  const teamComparison = useMemo(
    () =>
      TEAMS.map((t) => {
        const members = users.filter((u) => u.team === t.id);
        const total = approved
          .filter((r) => userById(r.userId)?.team === t.id)
          .reduce((s, r) => s + lineDays(r, data.normalDaysOffByUser[r.userId]), 0);
        return { team: t.name, avgDays: members.length ? +(total / members.length).toFixed(1) : 0 };
      }),
    [approved, data, users]
  );

  // Unused balance liability by type (whole company, ignores filters by design).
  const { liability, liabilityTotal } = useMemo(() => {
    if (!data) return { liability: [], liabilityTotal: 0 };
    const rows = PTO_TYPES.map((t) => {
      const remaining = users.reduce((s, u) => s + (data.grantByUserType[u.id][t.id] - data.usedByUserType[u.id][t.id]), 0);
      return { name: t.name, value: remaining, color: t.color };
    });
    return { liability: rows, liabilityTotal: rows.reduce((s, d) => s + d.value, 0) };
  }, [data, users]);

  // Approval turnaround by week (chronological).
  const turnaround = useMemo(() => {
    const buckets = new Map();
    filtered
      .filter((r) => r.decidedAt)
      .forEach((r) => {
        const wkStart = startOfWeek(toDate(r.submittedAt));
        const key = format(wkStart, 'yyyy-MM-dd');
        const dd = Math.abs(differenceInCalendarDays(toDate(r.decidedAt), toDate(r.submittedAt)));
        if (!buckets.has(key)) buckets.set(key, { week: format(wkStart, 'MMM d'), sort: wkStart.getTime(), vals: [] });
        buckets.get(key).vals.push(dd);
      });
    return Array.from(buckets.values())
      .sort((a, b) => a.sort - b.sort)
      .map(({ week, vals }) => ({ week, avgDays: +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) }))
      .slice(-8);
  }, [filtered]);

  function exportCSV() {
    const header = ['Employee', 'Team', 'Type', 'Start', 'End', 'Business Days', 'Status', 'Decided By'];
    const rows = filteredEntries.map((r) => [
      userById(r.userId)?.name,
      teamById(userById(r.userId)?.team)?.name || '',
      ptoTypeById(r.type)?.name,
      r.start,
      r.end,
      lineDays(r, data.normalDaysOffByUser[r.userId]),
      r.status,
      userById(r.decidedBy)?.name || '',
    ]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c ?? '')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chartwells-pto-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (data === null) return <div className="p-6 text-sm text-ink-mute">Loading…</div>;

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={teamFilter} onChange={setTeamFilter} label="All teams" options={TEAMS.map((t) => ({ value: t.id, label: t.name }))} />
        <Select value={typeFilter} onChange={setTypeFilter} label="All types" options={PTO_TYPES.map((t) => ({ value: t.id, label: t.name }))} />
        <Button variant="outline" size="sm" className="ml-auto" onClick={exportCSV}>
          <Download size={15} /> Export CSV
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="PTO usage by type" subtitle="Business days, monthly">
          <UsageByTypeChart data={monthlyUsage} />
        </Card>
        <Card title="Team comparison" subtitle="Average days taken per person">
          <TeamComparisonChart data={teamComparison} />
        </Card>
        <Card title="Balance liability" subtitle="Unused days remaining company-wide">
          <BalanceLiabilityChart data={liability} total={liabilityTotal} />
        </Card>
        <Card title="Approval turnaround" subtitle="Days from request to decision, by week">
          <ApprovalTurnaroundChart data={turnaround} />
        </Card>
        <Card title="Absence density" subtitle="People out per day across 2026" className="lg:col-span-2">
          <AbsenceHeatmap requests={approved} />
        </Card>
      </div>
    </div>
  );
}

function Card({ title, subtitle, className = '', children }) {
  return (
    <section className={`rounded-card border border-line bg-card p-5 shadow-card ${className}`}>
      <header className="mb-4">
        <h3 className="text-sm font-bold text-ink">{title}</h3>
        {subtitle && <p className="text-xs text-ink-mute">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function Select({ value, onChange, label, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-btn border border-line bg-card px-3 py-2 text-sm font-medium text-ink focus:border-accent focus:outline-none"
    >
      <option value="all">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
