import { format, isSameMonth, isSameDay } from 'date-fns';
import { Plus } from 'lucide-react';
import { toDate, toISO, rangesOverlap } from '../../utils/dateHelpers';
import CalendarChip from './CalendarChip';

// Design notes: A month-grid day. Weekends get a faint panel wash so the work week
//   reads as a block at a glance. Hovering an empty area reveals a "+" hint, because
//   v1 made the whole cell click-to-request but signalled it nowhere (the old hover
//   hint was dead code). Today is a filled accent disc; blackout keeps the hatch.
// References: Google Calendar month cell; Notion Calendar's quiet weekend treatment.
const MAX_VISIBLE = 3;

export default function DayCell({ date, monthDate, todayIso, holiday, blackout, entries, highlight, onChipClick, onEmptyClick }) {
  const inMonth = isSameMonth(date, monthDate);
  const isToday = isSameDay(date, toDate(todayIso));
  const day = date.getDay();
  const isWeekend = day === 0 || day === 6;
  const iso = toISO(date);
  const inHighlight = highlight && rangesOverlap(iso, iso, highlight.start, highlight.end);
  const visible = entries.slice(0, MAX_VISIBLE);
  const overflow = entries.length - visible.length;

  const bg = inHighlight ? 'bg-accent-soft/70' : !inMonth ? 'bg-surface/60' : isWeekend ? 'bg-panel/40' : 'bg-card';

  return (
    <div
      onClick={() => onEmptyClick?.(date)}
      className={`group relative flex min-h-[108px] cursor-pointer flex-col gap-1 border-b border-r border-line p-1.5 transition-colors duration-[120ms] hover:bg-panel/60 ${bg} ${
        blackout ? 'hatch-danger' : ''
      } ${inHighlight ? 'ring-1 ring-inset ring-accent/40' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${
            isToday ? 'bg-accent-strong text-white' : inMonth ? 'text-ink' : 'text-ink-mute/50'
          }`}
        >
          {format(date, 'd')}
        </span>
        {blackout ? (
          <span className="rounded-chip bg-danger-strong px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
            Blackout
          </span>
        ) : (
          <span
            className="grid h-5 w-5 place-items-center rounded-chip text-ink-mute opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100"
            aria-hidden="true"
            title="Request time off"
          >
            <Plus size={14} />
          </span>
        )}
      </div>

      {holiday && (
        <div className="truncate rounded-chip bg-warning-soft px-1.5 py-0.5 text-[10px] font-semibold text-warning-ink" title={holiday.name}>
          {holiday.name}
        </div>
      )}

      <div className="flex flex-col gap-0.5">
        {visible.map((r) => (
          <CalendarChip key={r.id} request={r} onClick={onChipClick} highlighted={r.id === highlight?.id} />
        ))}
        {overflow > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChipClick?.(entries[0], entries);
            }}
            className="rounded-chip px-1.5 py-0.5 text-left text-[10px] font-semibold text-ink-mute hover:bg-panel hover:text-ink"
          >
            +{overflow} more
          </button>
        )}
      </div>
    </div>
  );
}
