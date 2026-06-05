import { useEffect, useState } from 'react';
import { Search, Upload, UserPlus, Power } from 'lucide-react';
import { useCurrentUser } from '../../data/session';
import { useDataSource } from '../../data/dataSource';
import { PTO_TYPES, TEAMS, ROLES, isGodAdmin } from '../../utils/constants';
import { WEEKDAYS } from '../../utils/dateHelpers';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import { SectionIntro } from './PtoTypesSettings';

export default function PeopleSettings() {
  const activeUser = useCurrentUser();
  const { getUsers, grantFor, setGrant, normalDaysOffFor, setNormalDaysOff } = useDataSource();
  const [data, setData] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    async function load() {
      const people = await getUsers();
      const [grantRows, daysRows] = await Promise.all([
        Promise.all(people.flatMap((u) => PTO_TYPES.map((t) => grantFor(u.id, t.id)))),
        Promise.all(people.map((u) => normalDaysOffFor(u.id))),
      ]);
      if (!alive) return;
      const grants = {};
      let i = 0;
      people.forEach((u) => {
        grants[u.id] = {};
        PTO_TYPES.forEach((t) => { grants[u.id][t.id] = grantRows[i++]; });
      });
      const normalDaysOff = {};
      people.forEach((u, index) => { normalDaysOff[u.id] = daysRows[index]; });
      setData({ people: people.map((u) => ({ ...u, active: true })), grants, normalDaysOff });
    }
    load();
    return () => { alive = false; };
  }, []);

  const canManage = (person) => isGodAdmin(activeUser.role) || (activeUser.role === 'admin' && person.team === activeUser.team);

  const updatePerson = (id, patch) =>
    setData((current) => ({
      ...current,
      people: current.people.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    }));

  const updateGrant = (userId, typeId, value) => {
    const amount = Math.max(0, Number(value) || 0);
    setData((current) => ({
      ...current,
      grants: {
        ...current.grants,
        [userId]: { ...current.grants[userId], [typeId]: amount },
      },
    }));
    setGrant(userId, typeId, amount);
  };

  const toggleDay = (userId, day) => {
    const current = data.normalDaysOff[userId] || [];
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort((a, b) => a - b);
    setData((state) => ({
      ...state,
      normalDaysOff: { ...state.normalDaysOff, [userId]: next },
    }));
    setNormalDaysOff(userId, next);
  };

  if (data === null) return <div className="p-6 text-sm text-ink-mute">Loading...</div>;

  const visible = data.people.filter(canManage);
  const filtered = visible.filter(
    (u) => u.name.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionIntro
          title="People"
          desc={isGodAdmin(activeUser.role)
            ? 'Manage days off and PTO grants for everyone in the directory.'
            : 'Manage normal days off and PTO grants for your team.'}
        />
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
          placeholder="Search by name or email..."
          className="w-full rounded-btn border border-line bg-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-mute focus:border-accent focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-card border border-line bg-card scrollbar-slim">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-line bg-surface/60 text-left text-xs font-bold uppercase tracking-wide text-ink-mute">
              <th className="px-4 py-2.5">Person</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Team</th>
              <th className="px-4 py-2.5">Normal days off</th>
              <th className="px-4 py-2.5">PTO grants</th>
              <th className="px-4 py-2.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {filtered.map((u) => (
              <tr key={u.id} className={u.active ? '' : 'opacity-50'}>
                <td className="px-4 py-3 align-top">
                  <span className="flex items-center gap-2.5">
                    <Avatar name={u.name} id={u.id} size="sm" />
                    <span>
                      <span className="block font-medium text-ink">{u.name}</span>
                      <span className="block text-xs text-ink-mute">{u.email}</span>
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <select
                    value={u.role}
                    onChange={(e) => updatePerson(u.id, { role: e.target.value })}
                    disabled={!isGodAdmin(activeUser.role)}
                    className="rounded-btn border border-line bg-card px-2 py-1 text-xs font-medium text-ink disabled:opacity-60 focus:border-accent focus:outline-none"
                  >
                    {Object.entries(ROLES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 align-top">
                  <select
                    value={u.team || ''}
                    onChange={(e) => updatePerson(u.id, { team: e.target.value || null })}
                    disabled={!isGodAdmin(activeUser.role)}
                    className="rounded-btn border border-line bg-card px-2 py-1 text-xs font-medium text-ink disabled:opacity-60 focus:border-accent focus:outline-none"
                  >
                    <option value="">All teams</option>
                    {TEAMS.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-wrap gap-1">
                    {WEEKDAYS.map((day, index) => {
                      const active = (data.normalDaysOff[u.id] || []).includes(index);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(u.id, index)}
                          className={`h-7 min-w-8 rounded-chip border px-2 text-[11px] font-semibold transition-colors ${
                            active
                              ? 'border-accent-line bg-accent-soft text-accent-ink'
                              : 'border-line bg-card text-ink-mute hover:bg-panel hover:text-ink'
                          }`}
                          aria-pressed={active}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="grid grid-cols-2 gap-2">
                    {PTO_TYPES.map((t) => (
                      <label key={t.id} className="flex items-center gap-1.5 rounded-btn border border-line bg-surface/60 px-2 py-1">
                        <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />
                        <span className="w-16 truncate text-[11px] font-medium text-ink-soft">{t.name}</span>
                        <input
                          type="number"
                          min="0"
                          value={data.grants[u.id]?.[t.id] ?? 0}
                          onChange={(e) => updateGrant(u.id, t.id, e.target.value)}
                          className="w-14 rounded-chip border border-line bg-card px-1.5 py-0.5 text-right text-xs font-semibold tabular text-ink focus:border-accent focus:outline-none"
                          aria-label={`${u.name} ${t.name} grant`}
                        />
                      </label>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right align-top">
                  <button
                    onClick={() => updatePerson(u.id, { active: !u.active })}
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
