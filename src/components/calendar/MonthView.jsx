import { useMemo } from 'react';
import { monthGrid, toISO, WEEKDAYS, rangesOverlap } from '../../utils/dateHelpers';
import { isBlackoutDay } from '../../utils/policyEngine';
import DayCell from './DayCell';

// Design notes: Month grid answers "who is off, when" first. Weekend columns (header
//   + cells) carry a faint wash so the work week reads as a block. Coverage counting
//   is intentionally left to the Timeline view to keep this surface calm and scannable.
// References: Google Calendar / Notion Calendar month density.
export default function MonthView({ monthDate, requests, holidays, todayIso, highlight, onChipClick, onEmptyClick }) {
  const days = useMemo(() => monthGrid(monthDate), [monthDate]);

  const entriesByDay = (iso) =>
    requests
      .filter((r) => rangesOverlap(iso, iso, r.start, r.end))
      .sort((a, b) => (a.status === b.status ? 0 : a.status === 'approved' ? -1 : 1));

  return (
    <div className="overflow-hidden rounded-card border border-line bg-card shadow-card">
      <div className="grid grid-cols-7 border-b border-line bg-panel/40">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.07em] ${
              i === 0 || i === 6 ? 'text-ink-mute/60' : 'text-ink-mute'
            }`}
          >
            <span className="hidden sm:inline">{w}</span>
            <span className="sm:hidden">{w[0]}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 [&>*:nth-child(7n)]:border-r-0">
        {days.map((d) => {
          const iso = toISO(d);
          return (
            <DayCell
              key={iso}
              date={d}
              monthDate={monthDate}
              todayIso={todayIso}
              holiday={holidays.find((h) => h.date === iso)}
              blackout={isBlackoutDay(iso)}
              entries={entriesByDay(iso)}
              highlight={highlight}
              onChipClick={onChipClick}
              onEmptyClick={onEmptyClick}
            />
          );
        })}
      </div>
    </div>
  );
}
