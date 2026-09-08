import { useCatalog } from "../../context/CatalogContext.jsx";
export function PtoTypeIcon({
  typeId: typeId,
  size = 10,
  color: color,
  className = "",
  style: style,
}) {
  var c;
  const { ptoTypeById: ptoTypeById } = useCatalog(),
    o =
      color ||
      ((c = ptoTypeById(typeId)) == null ? void 0 : c.color) ||
      "var(--c-ink-mute)";
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: o,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}
