import { avatarColors } from "../../utils/constants.jsx";
import { initials } from "../../utils/constants.jsx";
export const AVATAR_SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-[84px] w-[84px] text-[28px]",
};
export function Avatar({
  name: name,
  id: id,
  size = "md",
  className = "",
  ring = !1,
  onDark = !1,
}) {
  const { bg: bg, fg: fg } = avatarColors(id || name);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${AVATAR_SIZES[size]} ${ring ? (onDark ? "ring-2 ring-navy-600" : "ring-2 ring-card") : ""} ${className}`}
      style={{
        background: bg,
        color: fg,
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
