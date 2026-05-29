import { useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { Plus } from 'lucide-react';
import { weekGrid, toISO, rangesOverlap, toDate } from '../../utils/dateHelpers';
import { isBlackoutDay } from '../../utils/policyEngine';
import { ptoTypeById, userById, firstName } from '../../utils/constants';

// Design notes: Seven tall columns for a closer look at one week. Chips share the
//   month-view language (type dot + tint, dashed = pending, solid = approved) but get
//   a second line for the type name since there's vertical room. Weekend columns are
//   washed; an empty column reveals a "Request" hint on hover (the affordance v1
//   intended but never rendered). Holiday/blackout banners sit above the chips.
// References: Notion Calendar week column; Float confirmed-vs-tentative fills.
export default function WeekView({ anchorDate, requests, holidays, todayIso, highlight, onChipClick, onEmptyClick }) {
  const days = useMemo(() => weekGrid(anchorDate), [anchorDate]);

  return (
    <div className="overflow-hidden rounded-card border border-line bg-card shadow-card">
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const iso = toISO(d);
          const isToday = isSameDay(d, toDate(todayIso));
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          const holiday = holidays.find((h) => h.date === iso);
          const blackout = isBlackoutDay(iso);
          const inHighlight = highlight && rangesOverlap(iso, iso, highlight.start, highlight.end);
          const entries = requests
            .filter((r) => rangesOverlap(iso, iso, r.start, r.end))
            .sort((a, b) => (a.status === 'approved' ? -1 : 1));

          return (
            <div
              key={iso}
              onClick={() => onEmptyClick?.(d)}
              className={`group flex min-h-[60vh] cursor-pointer flex-col border-r border-line last:border-r-0 ${
                blackout ? 'hatch-danger' : inHighlight ? 'bg-accent-soft/50' : isWeekend ? 'bg-panel/30' : ''
              }`}
            >
              <div className={`border-b border-line px-2 py-2 text-center ${isToday ? 'bg-accent-soft' : 'bg-surface/60'}`}>
                <p className="text-[11px] font-semibold uppercase text-ink-mute">{format(d, 'EEE')}</p>
                <p className={`text-lg font-bold ${isToday ? 'text-accent-ink' : 'text-ink'}`}>{format(d, 'd')}</p>
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-2">
                {holiday && (
                  <div className="rounded-chip bg-warning-soft px-2 py-1 text-[11px] font-semibold text-warning-ink">
                    {holiday.name}
                  </div>
                )}
                {blackout && (
                  <div className="rounded-chip bg-danger-strong px-2 py-1 text-[11px] font-bold text-white">Blackout</div>
                )}
                {entries.map((r) => {
                  const type = ptoTypeById(r.type);
                  const pending = r.status === 'pending';
                  return (
                    <button
                      key={r.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onChipClick?.(r);
                      }}
                      className={`rounded-chip px-2 py-1.5 text-left text-xs transition-[background,border-color,box-shadow] duration-[180ms] ease-out hover:shadow-card ${
                        r.id === highlight?.id ? 'shadow-lift ring-2 ring-accent-strong ring-offset-1' : ''
                      }`}
                      style={{
                        background: `color-mix(in oklch, ${type.color} ${pending ? 9 : 16}%, var(--c-card))`,
                        border: pending
                          ? `1px dashed color-mix(in oklch, ${type.color} 55%, transparent)`
                          : `1px solid color-mix(in oklch, ${type.color} 30%, transparent)`,
                      }}
                      aria-label={`${userById(r.userId)?.name}, ${type.name}, ${r.status}`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: type.color }} />
                        <span className="font-semibold text-ink">{firstName(userById(r.userId)?.name)}</span>
                      </span>
                      <span className="mt-0.5 block text-[10px] text-ink-mute">{type.name}</span>
                    </button>
                  );
                })}
                {entries.length === 0 && !holiday && !blackout && (
                  <span className="mt-1 flex items-center justify-center gap-1 text-[11px] font-medium text-ink-mute opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100">
                    <Plus size={12} /> Request
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
