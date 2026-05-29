import { getDaysInMonth } from 'date-fns';
import { rangesOverlap } from '../../utils/dateHelpers';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Calendar-style density grid: months down, days across. Darker = more people out.
export default function AbsenceHeatmap({ requests, year = 2026 }) {
  const approved = requests.filter((r) => r.status === 'approved');
  let max = 1;
  const grid = MONTHS.map((m, mi) => {
    const days = getDaysInMonth(new Date(year, mi));
    return Array.from({ length: 31 }, (_, di) => {
      if (di >= days) return null;
      const iso = `${year}-${String(mi + 1).padStart(2, '0')}-${String(di + 1).padStart(2, '0')}`;
      const count = approved.filter((r) => rangesOverlap(iso, iso, r.start, r.end)).length;
      if (count > max) max = count;
      return { iso, count };
    });
  });

  return (
    <div className="overflow-x-auto scrollbar-slim">
      <div className="min-w-[640px]">
        <div className="mb-1 flex pl-9">
          {Array.from({ length: 31 }, (_, i) => (
            <div key={i} className="flex-1 text-center text-[9px] text-ink-mute">{i + 1}</div>
          ))}
        </div>
        {grid.map((row, mi) => (
          <div key={mi} className="flex items-center">
            <div className="w-9 shrink-0 text-[10px] font-semibold text-ink-mute">{MONTHS[mi]}</div>
            <div className="flex flex-1 gap-0.5">
              {row.map((cell, di) =>
                cell === null ? (
                  <div key={di} className="aspect-square flex-1" />
                ) : (
                  <div
                    key={di}
                    title={cell.count ? `${cell.iso}: ${cell.count} out` : cell.iso}
                    className="aspect-square flex-1 rounded-[2px]"
                    style={{
                      background:
                        cell.count === 0
                          ? 'var(--c-panel)'
                          : `color-mix(in oklch, var(--c-accent) ${20 + (cell.count / max) * 70}%, var(--c-card))`,
                    }}
                  />
                )
              )}
            </div>
          </div>
        ))}
        <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-ink-mute">
          Less
          {[0, 0.3, 0.6, 1].map((o) => (
            <span
              key={o}
              className="h-3 w-3 rounded-[2px]"
              style={{ background: o === 0 ? 'var(--c-panel)' : `color-mix(in oklch, var(--c-accent) ${20 + o * 70}%, var(--c-card))` }}
            />
          ))}
          More
        </div>
      </div>
    </div>
  );
}
