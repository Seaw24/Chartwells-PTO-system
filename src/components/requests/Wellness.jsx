import { Leaf as Vendor_Leaf } from "lucide-react";
import { useCatalog } from "../../context/CatalogContext.jsx";
// Wellness grant requests read green wherever they appear: tinted fill + full hairline border.
export const wellnessCardStyle = {
  background: "color-mix(in oklab, var(--c-success) 7%, var(--c-card))",
  borderColor: "color-mix(in oklab, var(--c-success) 36%, transparent)",
};
export const wellnessDividerStyle = {
  borderColor: "color-mix(in oklab, var(--c-success) 22%, transparent)",
};
export const dayCount = (e) => `${e} day${e === 1 ? "" : "s"}`;
export function useWellnessType() {
  const { ptoTypes: ptoTypes } = useCatalog();
  return ptoTypes.find((t) => t.isWellness) ?? null;
}
export function WellnessPill({ size = "sm", className = "" }) {
  const n =
    size === "xs"
      ? "px-1.5 py-0.5 text-[11px] gap-1"
      : "px-2.5 py-1 text-xs gap-1.5";
  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${n} ${className}`}
      style={{
        color: "var(--c-success-ink)",
        background: "var(--c-success-soft)",
        borderColor: "color-mix(in oklab, var(--c-success) 34%, transparent)",
      }}
    >
      <Vendor_Leaf
        size={size === "xs" ? 11 : 12}
        strokeWidth={2.5}
        aria-hidden="true"
      />
      {"Wellness day request"}
    </span>
  );
}
