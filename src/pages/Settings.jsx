// Design notes: A left tab rail (collapses to a scrollable row on mobile) with one panel
//   in focus at a time, so policy config never becomes a wall. Each panel fades in on
//   switch. The persistent demo-note footer sets expectations honestly (edits are in-session).
// References: Vercel project-settings layout; Stripe settings rail.
import { useState } from 'react';
import { Tag, CalendarHeart, CalendarOff, Users, UserCog, ShieldCheck } from 'lucide-react';
import PtoTypesSettings from '../components/settings/PtoTypesSettings';
import HolidaySettings from '../components/settings/HolidaySettings';
import BlackoutSettings from '../components/settings/BlackoutSettings';
import TeamSettings from '../components/settings/TeamSettings';
import PeopleSettings from '../components/settings/PeopleSettings';
import ApprovalRulesSettings from '../components/settings/ApprovalRulesSettings';

const TABS = [
  { id: 'types', label: 'PTO Types', icon: Tag, Comp: PtoTypesSettings },
  { id: 'holidays', label: 'Holidays', icon: CalendarHeart, Comp: HolidaySettings },
  { id: 'blackout', label: 'Blackout Dates', icon: CalendarOff, Comp: BlackoutSettings },
  { id: 'teams', label: 'Teams', icon: Users, Comp: TeamSettings },
  { id: 'people', label: 'People', icon: UserCog, Comp: PeopleSettings },
  { id: 'rules', label: 'Approval Rules', icon: ShieldCheck, Comp: ApprovalRulesSettings },
];

export default function Settings() {
  const [tab, setTab] = useState('types');
  const Active = TABS.find((t) => t.id === tab).Comp;

  return (
    <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
      {/* Tab rail */}
      <nav className="flex gap-1.5 overflow-x-auto no-scrollbar lg:flex-col lg:overflow-visible">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2.5 rounded-btn px-3 py-2.5 text-sm font-semibold transition-colors ${
                active ? 'bg-navy text-navy-fg' : 'text-ink-soft hover:bg-panel'
              }`}
            >
              <t.icon size={17} className="shrink-0" />
              <span className="whitespace-nowrap">{t.label}</span>
            </button>
          );
        })}
      </nav>

      <div key={tab} className="min-w-0 animate-fade-in">
        <Active />
        <p className="mt-6 rounded-btn bg-panel px-3 py-2 text-xs text-ink-mute">
          Demo note: edits here are in-session only. Wiring policy changes to the backend is the next phase.
        </p>
      </div>
    </div>
  );
}
