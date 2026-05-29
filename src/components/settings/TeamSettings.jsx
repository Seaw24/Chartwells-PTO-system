import { useState } from 'react';
import { Trash2, Pencil } from 'lucide-react';
import { TEAMS, USERS, ROLES } from '../../utils/constants';
import Avatar from '../ui/Avatar';
import { SectionIntro, AddButton } from './PtoTypesSettings';

export default function TeamSettings() {
  const [teams, setTeams] = useState(TEAMS);

  const remove = (id) => setTeams((t) => t.filter((x) => x.id !== id));
  const add = () => setTeams((t) => [...t, { id: `team-${Date.now()}`, name: 'New team' }]);
  const rename = (id, name) => setTeams((t) => t.map((x) => (x.id === id ? { ...x, name } : x)));

  return (
    <div className="space-y-4">
      <SectionIntro title="Teams" desc="Groups that admins manage. Each request routes to its team's admins." />

      <div className="grid gap-3 sm:grid-cols-2">
        {teams.map((t) => {
          const members = USERS.filter((u) => u.team === t.id);
          const admins = members.filter((u) => u.role === 'admin');
          return (
            <div key={t.id} className="rounded-card border border-line bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <input
                  value={t.name}
                  onChange={(e) => rename(t.id, e.target.value)}
                  className="flex-1 rounded-btn border border-transparent px-1.5 py-0.5 text-base font-bold text-ink hover:border-line focus:border-accent focus:outline-none"
                />
                <button onClick={() => remove(t.id)} className="text-ink-mute hover:text-danger" aria-label="Delete team">
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="mt-1 text-xs text-ink-mute">
                {members.length} members · {admins.length} admin{admins.length === 1 ? '' : 's'}
              </p>
              <div className="mt-3">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-mute">Admins</p>
                <div className="flex flex-wrap gap-1.5">
                  {admins.length === 0 && <span className="text-xs text-ink-mute">No admin assigned</span>}
                  {admins.map((a) => (
                    <span key={a.id} className="flex items-center gap-1.5 rounded-full bg-panel py-0.5 pl-0.5 pr-2 text-xs font-medium text-ink">
                      <Avatar name={a.name} id={a.id} size="xs" /> {a.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <AddButton label="Create team" onClick={add} />
    </div>
  );
}
