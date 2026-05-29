// Design notes: Bell + accent-strong count badge; the panel groups notifications by day
//   with sticky date headers, and unread rows carry a faint accent wash plus a kind-coloured
//   dot. Closes on Esc / outside click. "All caught up" is a designed empty state.
// References: Linear/GitHub notification panels; day-grouped inbox pattern.
import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { fmtTime } from '../../utils/dateHelpers';
import EmptyState from '../ui/EmptyState';

const KIND_DOT = {
  approved: 'var(--c-success)',
  denied: 'var(--c-danger)',
  submitted: 'var(--c-navy-600)',
  reminder: 'var(--c-warning)',
  blackout: 'var(--c-danger)',
  holiday: 'var(--c-accent)',
};

export default function NotificationBell({ onDark = false }) {
  const { groups, unreadCount, markNotificationRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`relative grid h-10 w-10 place-items-center rounded-btn transition-colors ${
          onDark
            ? 'text-navy-fg-mute hover:bg-navy-700 hover:text-navy-fg'
            : 'text-ink-soft hover:bg-panel hover:text-ink'
        }`}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span
            className={`absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent-strong px-1 text-[10px] font-bold text-white ring-2 ${
              onDark ? 'ring-navy' : 'ring-card'
            }`}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(92vw,22rem)] origin-top-right overflow-hidden rounded-card border border-line bg-card shadow-pop animate-scale-in">
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <h3 className="text-sm font-bold text-ink">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-semibold text-accent-ink hover:text-accent-hover"
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </header>

          <div className="scrollbar-slim max-h-[60vh] overflow-y-auto">
            {groups.length === 0 ? (
              <EmptyState icon={Bell} title="All caught up" description="No notifications right now." className="py-10" />
            ) : (
              groups.map((g) => (
                <div key={g.day}>
                  <p className="sticky top-0 bg-surface/90 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-mute backdrop-blur">
                    {g.label}
                  </p>
                  {g.items.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`flex w-full items-start gap-3 border-b border-line-soft px-4 py-3 text-left transition-colors hover:bg-panel ${
                        n.read ? '' : 'bg-accent-soft/40'
                      }`}
                    >
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                        style={{ background: n.read ? 'var(--c-line)' : KIND_DOT[n.kind] || 'var(--c-accent)' }}
                      />
                      <span className="flex-1">
                        <span className="block text-sm leading-snug text-ink">{n.text}</span>
                        <span className="mt-0.5 block text-[11px] text-ink-mute">{fmtTime(n.createdAt)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
