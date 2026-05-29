import { useState } from 'react';
import { Search, Upload, UserPlus, Power } from 'lucide-react';
import { USERS, TEAMS, ROLES } from '../../utils/constants';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import { SectionIntro } from './PtoTypesSettings';

export default function PeopleSettings() {
  const [people, setPeople] = useState(() => USERS.map((u) => ({ ...u, active: true })));
  const [query, setQuery] = useState('');

  const update = (id, patch) => setPeople((p) => p.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  const filtered = people.filter(
    (u) => u.name.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionIntro title="People" desc="Everyone in the directory. Change roles or teams, or deactivate to preserve history." />
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Upload size={15} /> Import CSV</Button>
          <Button variant="primary" size="sm"><UserPlus size={15} /> Add employee</Button>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full rounded-btn border border-line bg-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-mute focus:border-accent focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-card border border-line bg-card scrollbar-slim">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line bg-surface/60 text-left text-xs font-bold uppercase tracking-wide text-ink-mute">
              <th className="px-4 py-2.5">Person</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Team</th>
              <th className="px-4 py-2.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {filtered.map((u) => (
              <tr key={u.id} className={u.active ? '' : 'opacity-50'}>
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2.5">
                    <Avatar name={u.name} id={u.id} size="sm" />
                    <span>
                      <span className="block font-medium text-ink">{u.name}</span>
                      <span className="block text-xs text-ink-mute">{u.email}</span>
                    </span>
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <select
                    value={u.role}
                    onChange={(e) => update(u.id, { role: e.target.value })}
                    className="rounded-btn border border-line bg-card px-2 py-1 text-xs font-medium text-ink focus:border-accent focus:outline-none"
                  >
                    {Object.entries(ROLES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2.5">
                  <select
                    value={u.team || ''}
                    onChange={(e) => update(u.id, { team: e.target.value || null })}
                    className="rounded-btn border border-line bg-card px-2 py-1 text-xs font-medium text-ink focus:border-accent focus:outline-none"
                  >
                    <option value="">All teams</option>
                    {TEAMS.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => update(u.id, { active: !u.active })}
                    className={`inline-flex items-center gap-1 rounded-btn px-2 py-1 text-xs font-semibold ${
                      u.active ? 'text-ink-soft hover:bg-panel' : 'text-danger-ink hover:bg-danger-soft'
                    }`}
                  >
                    <Power size={13} /> {u.active ? 'Active' : 'Deactivated'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
