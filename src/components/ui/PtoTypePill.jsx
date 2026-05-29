import { ptoTypeById } from '../../utils/constants';
import PtoTypeIcon from './PtoTypeIcon';

// Design notes: Type identity = leading swatch + tinted fill + full hairline border
//   (never a left-stripe — that's an AI-slop tell). Label text is the type hue mixed
//   72% toward ink so the bright orange/green types clear AA on their own tint while
//   keeping their colour identity.
// References: PtoTypePill in DESIGN.md; Timetastic colour-coded leave-type icons.
export default function PtoTypePill({ typeId, size = 'sm', showIcon = true, className = '' }) {
  const type = ptoTypeById(typeId);
  if (!type) return null;
  const pad = size === 'xs' ? 'px-1.5 py-0.5 text-[11px] gap-1' : 'px-2.5 py-1 text-xs gap-1.5';
  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${pad} ${className}`}
      style={{
        color: `color-mix(in oklch, ${type.color} 72%, var(--c-ink))`,
        background: `color-mix(in oklch, ${type.color} 12%, var(--c-card))`,
        borderColor: `color-mix(in oklch, ${type.color} 30%, transparent)`,
      }}
    >
      {showIcon ? (
        <PtoTypeIcon typeId={type.id} size={size === 'xs' ? 12 : 13} strokeWidth={2.25} />
      ) : (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: type.color }}
          aria-hidden="true"
        />
      )}
      {type.name}
    </span>
  );
}
