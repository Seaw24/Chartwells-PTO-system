import { useEffect, useRef, useState } from 'react';
import { Search, ChevronDown, Users, Check } from 'lucide-react';
import Avatar from './Avatar';
import { firstName, teamById } from '../../utils/constants';

// Design notes: A searchable single-person filter — type to narrow ~30 people fast, pick
//   one to focus, "All people" to clear. Trigger shows the current focus (avatar + name)
//   so the active scope is always legible. Popover follows the app's overlay pattern
//   (Esc / outside-click close); Enter in the search selects the top match.
// References: Linear/Notion person pickers; Timetastic department/person filtering.
export default function PersonPicker({ people, value, onChange, allLabel = 'All people', className = '' }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = value && value !== 'all' ? people.find((p) => p.id === value) : null;
  const filtered = people.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  const choose = (id) => { onChange(id); setOpen(false); setQ(''); };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex h-8 items-center gap-2 rounded-btn border bg-card px-2.5 text-xs font-semibold transition-colors hover:bg-panel ${
          selected ? 'border-accent/50 text-ink' : 'border-line text-ink-soft'
        }`}
      >
        {selected ? (
          <>
            <Avatar name={selected.name} id={selected.id} size="xs" />
            <span className="max-w-[8rem] truncate">{firstName(selected.name)}</span>
          </>
        ) : (
          <>
            <Users size={14} className="text-ink-mute" />
            {allLabel}
          </>
        )}
        <ChevronDown size={14} className="text-ink-mute" />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-64 origin-top-right rounded-card border border-line bg-card p-2 shadow-pop animate-scale-in">
          <div className="relative mb-1.5">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-mute" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && filtered[0]) choose(filtered[0].id); }}
              placeholder="Search people…"
              className="w-full rounded-btn border border-line bg-surface py-1.5 pl-8 pr-2 text-sm text-ink placeholder:text-ink-mute focus:border-accent focus:outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto scrollbar-slim">
            <li>
              <button
                type="button"
                role="option"
                aria-selected={value === 'all'}
                onClick={() => choose('all')}
                className="flex w-full items-center gap-2.5 rounded-btn px-2 py-1.5 text-left text-sm hover:bg-panel"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-panel text-ink-mute"><Users size={13} /></span>
                <span className="flex-1 font-medium text-ink">{allLabel}</span>
                {value === 'all' && <Check size={14} className="text-accent-ink" />}
              </button>
            </li>
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={p.id === value}
                  onClick={() => choose(p.id)}
                  className="flex w-full items-center gap-2.5 rounded-btn px-2 py-1.5 text-left hover:bg-panel"
                >
                  <Avatar name={p.name} id={p.id} size="xs" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{p.name}</span>
                    <span className="block text-[11px] text-ink-mute">{teamById(p.team)?.name || 'All teams'}</span>
                  </span>
                  {p.id === value && <Check size={14} className="shrink-0 text-accent-ink" />}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-2 py-3 text-center text-xs text-ink-mute">No people match “{q}”.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
