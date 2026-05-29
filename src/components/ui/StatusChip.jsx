import { Clock, Check, X, Ban } from 'lucide-react';

// Design notes: Status always pairs an icon with color (kitchen-floor glance + a11y).
//   Foreground uses the -ink tokens, not the vivid base, so the label/icon clear
//   AA on the -soft fill — v1's warning-on-soft "Pending" was ~1.6:1, unreadable.
// References: StatusChip in DESIGN.md; AA contrast pass across the semantic set.
const CONFIG = {
  pending: { label: 'Pending', icon: Clock, fg: 'var(--c-warning-ink)', bg: 'var(--c-warning-soft)' },
  approved: { label: 'Approved', icon: Check, fg: 'var(--c-success-ink)', bg: 'var(--c-success-soft)' },
  denied: { label: 'Denied', icon: X, fg: 'var(--c-danger-ink)', bg: 'var(--c-danger-soft)' },
  cancelled: { label: 'Cancelled', icon: Ban, fg: 'var(--c-ink-mute)', bg: 'var(--c-panel)' },
};

export default function StatusChip({ status, size = 'sm', className = '' }) {
  const c = CONFIG[status] || CONFIG.pending;
  const Icon = c.icon;
  const pad = size === 'xs' ? 'px-1.5 py-0.5 text-[11px] gap-1' : 'px-2.5 py-1 text-xs gap-1.5';
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${pad} ${className}`}
      style={{ color: c.fg, background: c.bg }}
    >
      <Icon size={size === 'xs' ? 11 : 13} strokeWidth={2.5} aria-hidden="true" />
      {c.label}
    </span>
  );
}
