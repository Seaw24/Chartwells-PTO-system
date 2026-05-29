// Design notes: The dense alternative to cards — every balance as a sortable, tabular
//   column for managers who want to scan and compare numbers. Numeric columns are right-
//   aligned mono; clicking a header sorts, clicking a row opens the profile.
// References: Linear/Height data tables; tabular-figure alignment.
import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useDemoContext } from '../../hooks/useDemoContext';
import { DEFAULT_BALANCES, ROLES, teamById } from '../../utils/constants';
import { businessDays } from '../../utils/dateHelpers';
import Avatar from '../ui/Avatar';

const COLS = [
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role' },
  { key: 'team', label: 'Team' },
  { key: 'vacation', label: 'Vacation', num: true },
  { key: 'sick', label: 'Sick', num: true },
  { key: 'wellness', label: 'Wellness', num: true },
  { key: 'floating', label: 'Floating', num: true },
  { key: 'ytd', label: 'Days Out YTD', num: true },
];

export default function TeamTableView({ members, onSelect }) {
  const { balanceFor, requestsForUser } = useDemoContext();
  const [sort, setSort] = useState({ key: 'name', dir: 1 });

  const ytd = (id) =>
    requestsForUser(id)
      .filter((r) => r.status === 'approved')
      .reduce((s, r) => s + businessDays(r.start, r.end), 0);

  const rows = members.map((m) => ({
    member: m,
    name: m.name,
    role: ROLES[m.role]?.label,
    team: teamById(m.team)?.name || '—',
    vacation: balanceFor(m.id, 'vacation'),
    sick: balanceFor(m.id, 'sick'),
    wellness: balanceFor(m.id, 'wellness'),
    floating: balanceFor(m.id, 'floating'),
    ytd: ytd(m.id),
  }));

  rows.sort((a, b) => {
    const va = a[sort.key];
    const vb = b[sort.key];
    if (typeof va === 'number') return (va - vb) * sort.dir;
    return String(va).localeCompare(String(vb)) * sort.dir;
  });

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: 1 }));

  return (
    <div className="overflow-x-auto rounded-card border border-line bg-card shadow-card scrollbar-slim">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-line bg-surface/60">
            {COLS.map((c) => (
              <th
                key={c.key}
                onClick={() => toggleSort(c.key)}
                className={`cursor-pointer select-none px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-ink-mute hover:text-ink ${
                  c.num ? 'text-right' : 'text-left'
                }`}
              >
                <span className={`inline-flex items-center gap-1 ${c.num ? 'flex-row-reverse' : ''}`}>
                  {c.label}
                  {sort.key === c.key && (sort.dir === 1 ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line-soft">
          {rows.map((r) => (
            <tr
              key={r.member.id}
              onClick={() => onSelect(r.member)}
              className="cursor-pointer transition-colors hover:bg-panel"
            >
              <td className="px-4 py-2.5">
                <span className="flex items-center gap-2">
                  <Avatar name={r.member.name} id={r.member.id} size="xs" />
                  <span className="font-medium text-ink">{r.name}</span>
                </span>
              </td>
              <td className="px-4 py-2.5 text-ink-soft">{r.role}</td>
              <td className="px-4 py-2.5 text-ink-soft">{r.team}</td>
              {['vacation', 'sick', 'wellness', 'floating', 'ytd'].map((k) => (
                <td key={k} className="px-4 py-2.5 text-right font-mono text-ink-soft tabular">{r[k]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
