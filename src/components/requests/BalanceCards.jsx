import { useResource } from "../../hooks/useResource.jsx";
import { useCatalog } from "../../context/CatalogContext.jsx";
import { useDataSource } from "../../data/dataSource.jsx";
import React from "react";
import { PtoTypeIcon } from "../ui/PtoTypeIcon.jsx";
export function BalanceCards({ userId: userId }) {
  const { balanceTypes: balanceTypes } = useCatalog(),
    { usedFor: usedFor, grantFor: grantFor } = useDataSource();
  const { data: s = null } = useResource(
    ["balances", userId, balanceTypes.map((type) => type.id)],
    async () => {
      const values = await Promise.all(
        balanceTypes.map(async (type) => ({
          id: type.id,
          used: await usedFor(userId, type.id),
          grant: await grantFor(userId, type.id),
        })),
      );
      return {
        usedByType: Object.fromEntries(values.map((v) => [v.id, v.used])),
        grantsByType: Object.fromEntries(values.map((v) => [v.id, v.grant])),
      };
    },
    true,
  );
  if ((void 0, s === null)) return null;
  const { usedByType: usedByType, grantsByType: grantsByType } = s;
  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-5">
      {balanceTypes.map((l) => {
        const u = grantsByType[l.id],
          h = usedByType[l.id],
          d = u - h,
          f = u > 0 ? Math.min(100, Math.round((h / u) * 100)) : 0,
          p = h === 0 ? "None used yet" : `${h} used`;
        return (
          <div
            className="flex min-w-[158px] flex-col gap-3.5 rounded-card border border-line bg-card p-4 shadow-card transition-shadow duration-200 hover:shadow-raised sm:min-w-0"
            key={l.id}
          >
            <span
              className="grid h-9 w-9 place-items-center rounded-[10px]"
              style={{
                background: `color-mix(in oklch, ${l.color} 15%, var(--c-card))`,
                color: l.color,
              }}
            >
              <PtoTypeIcon typeId={l.id} size={16} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-semibold text-ink-soft">
                {l.name}
              </p>
              <p className="mt-1 flex items-baseline gap-1.5">
                <span className="text-[27px] font-bold leading-none tabular text-ink">
                  {d}
                </span>
                <span className="text-[13px] font-medium text-ink-mute">
                  {"of "}
                  {u}
                </span>
              </p>
            </div>
            <div className="mt-auto">
              <div
                className="h-1.5 w-full overflow-hidden rounded-full"
                style={{
                  background: `color-mix(in oklch, ${l.color} 13%, var(--c-panel))`,
                }}
                role="progressbar"
                aria-valuenow={h}
                aria-valuemin={0}
                aria-valuemax={u}
                aria-label={`${l.name}: ${h} of ${u} days used`}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-out"
                  style={{
                    width: `${f}%`,
                    background: l.color,
                  }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-ink-mute">{p}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
