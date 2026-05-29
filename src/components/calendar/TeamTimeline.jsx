import { useMemo } from 'react';
import { addDays, isSameDay, format, differenceInCalendarDays } from 'date-fns';
import { startOfWeek } from 'date-fns';
import { toDate, toISO, rangesOverlap } from '../../utils/dateHelpers';
import { ptoTypeById, firstName } from '../../utils/constants';
import Avatar from '../ui/Avatar';
import PtoTypeIcon from '../ui/PtoTypeIcon';

const DAYS = 14;

// Design notes: This is the coverage view — the product's #1 question, "are we
//   covered?", answered directly. Members down the side, two weeks across, PTO as
//   positioned bars (solid = approved, dashed = pending, like Float). The coverage
//   row shows the out-count per day with a tone that escalates green -> amber -> red
//   as more of the team is off, and today's column is washed across every row so the
//   eye lands on "now" instantly.
// References: Float schedule + utilization row; Timetastic wallchart at-a-glance counts.
export default function TeamTimeline({ anchorDate, members, requests, holidays, todayIso, highlight, onChipClick }) {
  const start = useMemo(() => startOfWeek(anchorDate, { weekStartsOn: 0 }), [anchorDate]);
  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDays(start, i)), [start]);
  const windowStart = toISO(start);
  const windowEnd = toISO(addDays(start, DAYS - 1));

  const pct = (n) => `${(n / DAYS) * 100}%`;
  const dayIndex = (iso) => differenceInCalendarDays(toDate(iso), start);
  const todayIdx = dayIndex(todayIso);

  // Coverage per day across the visible members.
  const coverage = days.map((d) => {
    const iso = toISO(d);
    const out = members.filter((m) =>
      requests.some((r) => r.userId === m.id && r.status === 'approved' && rangesOverlap(iso, iso, r.start, r.end))
    ).length;
    const ratio = members.length ? out / members.length : 0;
    const tone = ratio === 0 || ratio < 0.34 ? 'success' : ratio < 0.5 ? 'warning' : 'danger';
    return { iso, out, ratio, tone };
  });

  return (
    <div className="overflow-hidden rounded-card border border-line bg-card shadow-card">
      <div className="overflow-x-auto scrollbar-slim">
        <div className="min-w-[760px]">
          {/* Header: dates */}
          <div className="flex border-b border-line bg-surface/60">
            <div className="w-40 shrink-0 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-ink-mute">Member</div>
            <div className="relative flex flex-1">
              {days.map((d) => {
                const iso = toISO(d);
                const isToday = isSameDay(d, toDate(todayIso));
                const isHoliday = holidays.some((h) => h.date === iso);
                return (
                  <div key={iso} className={`flex-1 border-l border-line py-1.5 text-center ${isToday ? 'bg-accent-soft' : ''}`}>
                    <p className="text-[10px] font-semibold text-ink-mute">{format(d, 'EEEEE')}</p>
                    <p className={`text-xs font-bold ${isHoliday ? 'text-warning-ink' : 'text-ink'}`}>{format(d, 'd')}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coverage bar */}
          <div className="flex border-b border-line bg-card">
            <div className="flex w-40 shrink-0 items-center px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-mute">Out / day</div>
            <div className="flex flex-1">
              {coverage.map((c, i) => (
                <div
                  key={c.iso}
                  className={`flex flex-1 flex-col items-center gap-1 border-l border-line px-1 py-1.5 ${i === todayIdx ? 'bg-accent-soft/50' : ''}`}
                  title={`${c.out} of ${members.length} out`}
                >
                  <div
                    className="h-1.5 w-full rounded-full transition-colors duration-[180ms]"
                    style={{ background: c.out ? `var(--c-${c.tone})` : 'var(--c-line)' }}
                  />
                  <span
                    className="text-[10px] font-bold tabular"
                    style={{ color: c.out ? `var(--c-${c.tone}-ink)` : 'var(--c-ink-mute)' }}
                  >
                    {c.out || '·'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Member rows */}
          {members.map((m) => {
            const bars = requests
              .filter((r) => r.userId === m.id && ['approved', 'pending'].includes(r.status) && rangesOverlap(r.start, r.end, windowStart, windowEnd))
              .map((r) => {
                const s = Math.max(0, dayIndex(r.start));
                const e = Math.min(DAYS - 1, dayIndex(r.end));
                return { ...r, s, span: e - s + 1 };
              });
            return (
              <div key={m.id} className="flex border-b border-line-soft last:border-b-0">
                <div className="flex w-40 shrink-0 items-center gap-2 px-3 py-2.5">
                  <Avatar name={m.name} id={m.id} size="xs" />
                  <span className="truncate text-sm font-medium text-ink">{firstName(m.name)}</span>
                </div>
                <div className="relative flex-1">
                  {/* day gridlines (today column washed for instant orientation) */}
                  <div className="absolute inset-0 flex">
                    {days.map((d, i) => (
                      <div
                        key={toISO(d)}
                        className={`flex-1 border-l border-line-soft ${i === todayIdx ? 'bg-accent-soft/50' : ''}`}
                      />
                    ))}
                  </div>
                  <div className="relative py-2" style={{ minHeight: `${Math.max(bars.length, 1) * 28 + 8}px` }}>
                    {bars.map((b, bi) => {
                      const type = ptoTypeById(b.type);
                      const pending = b.status === 'pending';
                      return (
                        <button
                          key={b.id}
                          onClick={() => onChipClick?.(b)}
                          className={`absolute flex h-6 items-center gap-1 truncate rounded-chip px-2 text-[11px] font-semibold transition-[background,border-color,box-shadow] duration-[180ms] ease-out hover:shadow-card ${
                            b.id === highlight?.id ? 'shadow-lift ring-2 ring-accent-strong ring-offset-1' : ''
                          }`}
                          style={{
                            top: `${8 + bi * 28}px`,
                            left: pct(b.s),
                            width: `calc(${pct(b.span)} - 4px)`,
                            marginLeft: '2px',
                            color: `color-mix(in oklch, ${type.color} 72%, var(--c-ink))`,
                            background: `color-mix(in oklch, ${type.color} ${pending ? 12 : 22}%, var(--c-card))`,
                            border: pending
                              ? `1px dashed color-mix(in oklch, ${type.color} 55%, transparent)`
                              : `1px solid color-mix(in oklch, ${type.color} 32%, transparent)`,
                          }}
                          title={`${m.name} · ${type.name} · ${b.status}`}
                        >
                          <PtoTypeIcon typeId={type.id} size={11} strokeWidth={2.25} />
                          <span className="truncate">{type.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
