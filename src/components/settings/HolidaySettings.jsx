import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { HOLIDAYS_2026 } from '../../utils/constants';
import { toDate } from '../../utils/dateHelpers';
import { format } from 'date-fns';
import { SectionIntro, NumInput, Toggle, AddButton } from './PtoTypesSettings';

export default function HolidaySettings() {
  const [holidays, setHolidays] = useState(HOLIDAYS_2026);
  const [floatingEnabled, setFloatingEnabled] = useState(true);
  const [floatingCount, setFloatingCount] = useState(1);

  const update = (i, patch) => setHolidays((h) => h.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const remove = (i) => setHolidays((h) => h.filter((_, idx) => idx !== i));
  const add = () => setHolidays((h) => [...h, { date: '2026-12-31', name: 'New holiday' }]);

  const months = Array.from({ length: 12 }, (_, m) =>
    holidays.some((h) => toDate(h.date).getMonth() === m)
  );

  return (
    <div className="space-y-4">
      <SectionIntro title="Holidays" desc="The fixed company holidays for 2026, plus floating holiday policy." />

      {/* Year strip */}
      <div className="flex gap-1 rounded-card border border-line bg-card p-3">
        {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((m, i) => (
          <div key={i} className="flex-1 text-center">
            <div className={`h-7 rounded ${months[i] ? 'bg-warning-soft' : 'bg-panel'}`} />
            <span className="text-[10px] text-ink-mute">{m}</span>
          </div>
        ))}
      </div>

      <div className="rounded-card border border-line bg-card divide-y divide-line-soft">
        {holidays.map((h, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5">
            <input
              type="date"
              value={h.date}
              onChange={(e) => update(i, { date: e.target.value })}
              className="rounded-btn border border-line bg-card px-2 py-1 text-xs text-ink focus:border-accent focus:outline-none"
            />
            <input
              value={h.name}
              onChange={(e) => update(i, { name: e.target.value })}
              className="flex-1 rounded-btn border border-transparent px-2 py-1 text-sm font-medium text-ink hover:border-line focus:border-accent focus:outline-none"
            />
            <span className="hidden text-xs text-ink-mute sm:inline">{format(toDate(h.date), 'EEE')}</span>
            <button onClick={() => remove(i)} className="text-ink-mute hover:text-danger" aria-label="Remove holiday">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      <AddButton label="Add holiday" onClick={add} />

      <div className="rounded-card border border-line bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">Floating holiday</p>
            <p className="text-xs text-ink-mute">Let employees pick their own day off.</p>
          </div>
          <Toggle on={floatingEnabled} onChange={setFloatingEnabled} />
        </div>
        {floatingEnabled && (
          <div className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
            Days allowed per year:
            <NumInput value={floatingCount} onChange={setFloatingCount} />
          </div>
        )}
      </div>
    </div>
  );
}
