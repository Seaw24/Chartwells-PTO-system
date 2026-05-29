import { ROLES } from '../../utils/constants';

// Design notes: Accent tone uses --c-accent-ink on the soft tint (the vivid base
//   failed AA as 10px uppercase text). On the navy chrome, onDark renders a single
//   translucent light chip so role labels stay legible against the dark rail/top bar.
const TONE = {
  navy: { fg: 'var(--c-navy-fg)', bg: 'var(--c-navy)' },
  accent: { fg: 'var(--c-accent-ink)', bg: 'var(--c-accent-soft)' },
  neutral: { fg: 'var(--c-ink-soft)', bg: 'var(--c-panel)' },
};
const TONE_DARK = {
  fg: 'var(--c-navy-fg)',
  bg: 'color-mix(in oklch, var(--c-navy-fg) 15%, transparent)',
};

export default function RolePill({ role, size = 'sm', className = '', onDark = false }) {
  const meta = ROLES[role];
  if (!meta) return null;
  const tone = onDark ? TONE_DARK : TONE[meta.tone];
  const pad = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]';
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold uppercase tracking-wide ${pad} ${className}`}
      style={{ color: tone.fg, background: tone.bg }}
    >
      {meta.label}
    </span>
  );
}
