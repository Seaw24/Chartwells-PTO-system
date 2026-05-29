import { useState } from 'react';
import { Plus, CalendarRange } from 'lucide-react';
import { PTO_TYPES, VACATION_WINDOWS } from '../../utils/constants';
import { fmtShort } from '../../utils/dateHelpers';
import PtoTypeIcon from '../ui/PtoTypeIcon';

// In-session editor for PTO types. Persisting to policy is backend work (T1).
export default function PtoTypesSettings() {
  const [types, setTypes] = useState(() => PTO_TYPES.map((t) => ({ ...t, active: true })));

  const update = (id, patch) => setTypes((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  return (
    <div className="space-y-4">
      <SectionIntro
        title="PTO types"
        desc="Allowances, advance notice, and whether dates are restricted to set windows."
      />
      <div className="overflow-x-auto rounded-card border border-line bg-card scrollbar-slim">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line bg-surface/60 text-left text-xs font-bold uppercase tracking-wide text-ink-mute">
              <th className="px-4 py-2.5">Type</th>
              <th className="px-4 py-2.5 text-center">Days / year</th>
              <th className="px-4 py-2.5 text-center">Notice (days)</th>
              <th className="px-4 py-2.5">Restricted windows</th>
              <th className="px-4 py-2.5 text-center">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {types.map((t) => (
              <tr key={t.id} className={t.active ? '' : 'opacity-50'}>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2 font-medium text-ink">
                    <PtoTypeIcon typeId={t.id} size={15} style={{ color: t.color }} /> {t.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <NumInput value={t.defaultDays} onChange={(v) => update(t.id, { defaultDays: v })} />
                </td>
                <td className="px-4 py-3 text-center">
                  <NumInput value={t.advanceNotice} onChange={(v) => update(t.id, { advanceNotice: v })} />
                </td>
                <td className="px-4 py-3">
                  {t.restrictedDates ? (
                    <span className="flex flex-wrap items-center gap-1 text-xs text-ink-soft">
                      <CalendarRange size={13} className="text-warning-ink" />
                      {VACATION_WINDOWS.map((w) => (
                        <span key={w.start} className="rounded bg-panel px-1.5 py-0.5">{fmtShort(w.start)}–{fmtShort(w.end)}</span>
                      ))}
                    </span>
                  ) : (
                    <span className="text-xs text-ink-mute">Any date</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <Toggle on={t.active} onChange={(v) => update(t.id, { active: v })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AddButton label="Add PTO type" />
    </div>
  );
}

export function SectionIntro({ title, desc }) {
  return (
    <div>
      <h3 className="text-base font-bold text-ink">{title}</h3>
      <p className="text-sm text-ink-mute">{desc}</p>
    </div>
  );
}

export function NumInput({ value, onChange }) {
  return (
    <input
      type="number"
      min={0}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-16 rounded-btn border border-line bg-card px-2 py-1 text-center font-mono text-sm text-ink focus:border-accent focus:outline-none"
    />
  );
}

export function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      className={`relative h-5 w-9 rounded-full transition-colors ${on ? 'bg-success' : 'bg-line'}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-card shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

export function AddButton({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-btn border border-dashed border-line px-3.5 py-2 text-sm font-semibold text-ink-soft transition-colors duration-[120ms] hover:border-accent hover:text-accent-ink"
    >
      <Plus size={15} /> {label}
    </button>
  );
}
