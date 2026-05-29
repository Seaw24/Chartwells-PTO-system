import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { isSameMonth, isSameDay, format } from 'date-fns';
import { useDemoContext } from '../../hooks/useDemoContext';
import { monthGrid, toDate, toISO, WEEKDAYS, rangesOverlap, fmtMonthYear } from '../../utils/dateHelpers';
import { ptoTypeById } from '../../utils/constants';

// Design notes: Dashboard glance — the user's own approved/pending PTO as colour dots
//   under each date, today as a filled accent-strong disc (white-on-accent AA). Whole
//   grid is a shortcut into the full calendar.
export default function MiniCalendar({ userId }) {
  const { todayIso, requestsForUser, holidays } = useDemoContext();
  const navigate = useNavigate();
  const cursor = toDate(todayIso);
  const days = useMemo(() => monthGrid(cursor), [todayIso]); // eslint-disable-line react-hooks/exhaustive-deps
  const requests = requestsForUser(userId).filter((r) => ['approved', 'pending'].includes(r.status));

  function dotsFor(iso) {
    return requests
      .filter((r) => rangesOverlap(iso, iso, r.start, r.end))
      .map((r) => ptoTypeById(r.type)?.color);
  }

  return (
    <div>
      <p className="mb-2 text-center text-sm font-bold text-ink">{fmtMonthYear(cursor)}</p>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-[10px] font-semibold text-ink-mute">{w[0]}</div>
        ))}
        {days.map((d) => {
          const iso = toISO(d);
          const dots = dotsFor(iso);
          const isHoliday = holidays.some((h) => h.date === iso);
          const today = isSameDay(d, cursor);
          return (
            <button
              key={iso}
              onClick={() => navigate('/calendar')}
              className={`relative mx-auto flex h-8 w-8 flex-col items-center justify-center rounded-full text-xs transition-colors hover:bg-panel ${
                isSameMonth(d, cursor) ? 'text-ink' : 'text-ink-mute/40'
              } ${today ? 'bg-accent-strong font-bold text-white hover:bg-accent-strong' : ''}`}
            >
              {format(d, 'd')}
              <span className="absolute bottom-0.5 flex gap-0.5">
                {dots.slice(0, 3).map((c, i) => (
                  <span key={i} className="h-1 w-1 rounded-full" style={{ background: today ? 'white' : c }} />
                ))}
                {isHoliday && dots.length === 0 && (
                  <span className="h-1 w-1 rounded-full" style={{ background: today ? 'white' : 'var(--c-warning)' }} />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
