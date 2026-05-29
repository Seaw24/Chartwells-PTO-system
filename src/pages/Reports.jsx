import { useMemo, useState } from 'react';
import { format, differenceInCalendarDays, startOfWeek } from 'date-fns';
import { Download } from 'lucide-react';
import { useDemoContext } from '../hooks/useDemoContext';
import {
  PTO_TYPES,
  TEAMS,
  DEFAULT_BALANCES,
  USERS,
  userById,
  teamById,
  ptoTypeById,
} from '../utils/constants';
import { businessDays, toDate } from '../utils/dateHelpers';
import Button from '../components/ui/Button';
import UsageByTypeChart from '../components/reports/UsageByTypeChart';
import TeamComparisonChart from '../components/reports/TeamComparisonChart';
import AbsenceHeatmap from '../components/reports/AbsenceHeatmap';
import BalanceLiabilityChart from '../components/reports/BalanceLiabilityChart';
import ApprovalTurnaroundChart from '../components/reports/ApprovalTurnaroundChart';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Reports() {
  const { requests, usedFor } = useDemoContext();
  const [teamFilter, setTeamFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = useMemo(
    () =>
      requests.filter((r) => {
        if (teamFilter !== 'all' && userById(r.userId)?.team !== teamFilter) return false;
        if (typeFilter !== 'all' && r.type !== typeFilter) return false;
        return true;
      }),
    [requests, teamFilter, typeFilter]
  );
  const approved = filtered.filter((r) => r.status === 'approved');

  // Monthly usage stacked by type.
  const monthlyUsage = useMemo(() => {
    const rows = MONTHS.map((m) => ({ month: m, ...Object.fromEntries(PTO_TYPES.map((t) => [t.name, 0])) }));
    approved.forEach((r) => {
      const mi = toDate(r.start).getMonth();
      rows[mi][ptoTypeById(r.type).name] += businessDays(r.start, r.end);
    });
    return rows;
  }, [approved]);

  // Avg days taken per team member.
  const teamComparison = useMemo(
    () =>
      TEAMS.map((t) => {
        const members = USERS.filter((u) => u.team === t.id);
        const total = approved
          .filter((r) => userById(r.userId)?.team === t.id)
          .reduce((s, r) => s + businessDays(r.start, r.end), 0);
        return { team: t.name, avgDays: members.length ? +(total / members.length).toFixed(1) : 0 };
      }),
    [approved]
  );

  // Unused balance liability by type (whole company, ignores filters by design).
  const { liability, liabilityTotal } = useMemo(() => {
    const data = PTO_TYPES.map((t) => {
      const remaining = USERS.reduce((s, u) => s + (DEFAULT_BALANCES[t.id] - usedFor(u.id, t.id)), 0);
      return { name: t.name, value: remaining, color: t.color };
    });
    return { liability: data, liabilityTotal: data.reduce((s, d) => s + d.value, 0) };
  }, [usedFor]);

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
    const rows = filtered.map((r) => [
      userById(r.userId)?.name,
      teamById(userById(r.userId)?.team)?.name || '',
      ptoTypeById(r.type)?.name,
      r.start,
      r.end,
      businessDays(r.start, r.end),
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
