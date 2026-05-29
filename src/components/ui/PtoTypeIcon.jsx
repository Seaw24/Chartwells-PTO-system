import { Palmtree, Thermometer, Flower2, Leaf, Star, CalendarDays } from 'lucide-react';

// Design notes: Monochrome line icons for PTO types, replacing the emoji (🌴🤒💐🧘🎈) that
//   read childish/AI. One coherent icon family (lucide), color supplied by the caller via
//   className/style so it inherits the type hue — never the icon's own color.
// References: Linear/Stripe iconography discipline (single line-icon set, no emoji).
const ICONS = {
  vacation: Palmtree,
  sick: Thermometer,
  bereavement: Flower2,
  wellness: Leaf,
  floating: Star,
};

export default function PtoTypeIcon({ typeId, size = 16, className = '', style, strokeWidth = 2 }) {
  const Icon = ICONS[typeId] || CalendarDays;
  return <Icon size={size} strokeWidth={strokeWidth} className={className} style={style} aria-hidden="true" />;
}
