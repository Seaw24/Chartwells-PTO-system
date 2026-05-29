// Design notes: Two reads of the same roster — Cards (people-first glance) and Table
//   (numbers-first compare) via the segmented control. God-admin filters by team;
//   admins see only their own. Selecting anyone opens their profile in a modal.
// References: Float people/schedule toggle; Timetastic department filter.
import { useMemo, useState } from 'react';
import { LayoutGrid, Table2 } from 'lucide-react';
import { useDemoContext } from '../hooks/useDemoContext';
import { isGodAdmin, TEAMS } from '../utils/constants';
import SegmentedControl from '../components/ui/SegmentedControl';
import Modal from '../components/ui/Modal';
import TeamCardView from '../components/team/TeamCardView';
import TeamTableView from '../components/team/TeamTableView';
import EmployeeProfile from '../components/team/EmployeeProfile';

export default function TeamPage() {
  const { activeUser, teamMembers } = useDemoContext();
  const god = isGodAdmin(activeUser.role);
  const [view, setView] = useState('cards');
  const [teamFilter, setTeamFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const members = useMemo(() => {
    if (god) return teamMembers(teamFilter === 'all' ? null : teamFilter);
    return teamMembers(activeUser.team);
  }, [god, teamFilter, activeUser, teamMembers]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {god ? (
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="rounded-btn border border-line bg-card px-3 py-2 text-sm font-medium text-ink focus:border-accent focus:outline-none"
          >
            <option value="all">All teams</option>
            {TEAMS.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-ink-mute">
            {members.length} people on your team
          </p>
        )}
        <SegmentedControl
          options={[
            { value: 'cards', label: 'Cards', icon: LayoutGrid },
            { value: 'table', label: 'Table', icon: Table2 },
          ]}
          value={view}
          onChange={setView}
          size="sm"
        />
      </div>

      {view === 'cards' ? (
        <TeamCardView members={members} onSelect={setSelected} />
      ) : (
        <TeamTableView members={members} onSelect={setSelected} />
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Team member" size="md">
        {selected && <EmployeeProfile member={selected} />}
      </Modal>
    </div>
  );
}
