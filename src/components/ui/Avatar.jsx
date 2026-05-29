import { initials, avatarColor } from '../../utils/constants';

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
};

export default function Avatar({ name, id, size = 'md', className = '', ring = false, onDark = false }) {
  const { bg, fg } = avatarColor(id || name);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${SIZES[size]} ${
        ring ? (onDark ? 'ring-2 ring-navy-600' : 'ring-2 ring-card') : ''
      } ${className}`}
      style={{ background: bg, color: fg }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
