import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { BLACKOUT_DATES, PTO_TYPES } from '../../utils/constants';
import { fmtShort, toDate } from '../../utils/dateHelpers';
import { SectionIntro, AddButton } from './PtoTypesSettings';

export default function BlackoutSettings() {
  const [blackouts, setBlackouts] = useState(BLACKOUT_DATES);

  const update = (i, patch) => setBlackouts((b) => b.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const remove = (i) => setBlackouts((b) => b.filter((_, idx) => idx !== i));
  const add = () => setBlackouts((b) => [...b, { start: '2026-07-01', end: '2026-07-07', reason: 'New blackout', types: 'all' }]);

  return (
    <div className="space-y-4">
      <SectionIntro title="Blackout dates" desc="Periods when time off cannot be requested. Shown with hatching on the calendar." />

      <div className="space-y-3">
        {blackouts.map((b, i) => (
          <div key={i} className="rounded-card border border-line bg-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="date"
                value={b.start}
                onChange={(e) => update(i, { start: e.target.value })}
                className="rounded-btn border border-line bg-card px-2 py-1 text-xs text-ink focus:border-accent focus:outline-none"
              />
              <span className="text-ink-mute">→</span>
              <input
                type="date"
                value={b.end}
                onChange={(e) => update(i, { end: e.target.value })}
                className="rounded-btn border border-line bg-card px-2 py-1 text-xs text-ink focus:border-accent focus:outline-none"
              />
              <input
                value={b.reason}
                onChange={(e) => update(i, { reason: e.target.value })}
                className="min-w-[10rem] flex-1 rounded-btn border border-line bg-card px-2.5 py-1 text-sm text-ink focus:border-accent focus:outline-none"
              />
              <button onClick={() => remove(i)} className="text-ink-mute hover:text-danger" aria-label="Remove blackout">
                <Trash2 size={16} />
              </button>
            </div>
            {/* hatched preview strip */}
            <div className="mt-2.5 flex items-center gap-2">
              <div className="hatch-danger h-4 flex-1 rounded border border-danger/30" />
              <span className="text-[11px] font-medium text-ink-mute">
                {fmtShort(b.start)}–{fmtShort(b.end)} · affects {b.types === 'all' ? 'all types' : 'selected types'}
              </span>
            </div>
          </div>
        ))}
      </div>
      <AddButton label="Add blackout period" onClick={add} />
    </div>
  );
}
