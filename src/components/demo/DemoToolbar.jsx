import { useState } from 'react';
import { FlaskConical, X, RotateCcw, CalendarClock, ChevronDown } from 'lucide-react';
import { useDemoContext } from '../../hooks/useDemoContext';
import { USERS, teamById } from '../../utils/constants';
import RolePill from '../ui/RolePill';
import Avatar from '../ui/Avatar';
import { fmtLong } from '../../utils/dateHelpers';

export default function DemoToolbar() {
  const { activeUser, activeUserId, setActiveUser, todayIso, setToday, resetDemo } = useDemoContext();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-[55] print:hidden">
      {open ? (
        <div className="w-[min(90vw,19rem)] overflow-hidden rounded-card border border-line bg-card shadow-pop animate-scale-in">
          <header className="flex items-center justify-between bg-navy px-4 py-3 text-navy-fg">
            <span className="flex items-center gap-2 text-sm font-bold">
              <FlaskConical size={16} className="text-accent" /> Demo Controls
            </span>
            <button onClick={() => setOpen(false)} className="text-navy-fg/70 hover:text-navy-fg" aria-label="Close demo controls">
              <X size={16} />
            </button>
          </header>

          <div className="space-y-4 p-4">
            {/* Role / user switcher */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">View the app as</label>
              <div className="space-y-1">
                {USERS.map((u) => {
                  const active = u.id === activeUserId;
                  return (
                    <button
                      key={u.id}
                      onClick={() => setActiveUser(u.id)}
                      className={`flex w-full items-center gap-2.5 rounded-btn border px-2.5 py-2 text-left transition-colors ${
                        active ? 'border-accent bg-accent-soft/50' : 'border-transparent hover:bg-panel'
                      }`}
                    >
                      <Avatar name={u.name} id={u.id} size="xs" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{u.name}</span>
                        <span className="text-[11px] text-ink-mute">{teamById(u.team)?.name || 'All teams'}</span>
                      </span>
                      <RolePill role={u.role} size="xs" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time travel */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                <CalendarClock size={13} /> Time travel
              </label>
              <input
                type="date"
                value={todayIso}
                onChange={(e) => e.target.value && setToday(e.target.value)}
                className="w-full rounded-btn border border-line bg-card px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-ink-mute">Demo "today" is {fmtLong(todayIso)}.</p>
            </div>

            <button
              onClick={resetDemo}
              className="flex w-full items-center justify-center gap-2 rounded-btn border border-line py-2 text-xs font-semibold text-ink-soft hover:bg-panel"
            >
              <RotateCcw size={14} /> Reset demo data
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full bg-navy py-2 pl-2 pr-3.5 text-navy-fg shadow-lift transition-transform hover:scale-[1.02]"
        >
          <Avatar name={activeUser?.name} id={activeUser?.id} size="xs" ring />
          <span className="text-sm font-semibold">{activeUser?.name?.split(' ')[0]}</span>
          <RolePill role={activeUser?.role} size="xs" />
          <ChevronDown size={15} className="text-navy-fg/60" />
        </button>
      )}
    </div>
  );
}
