import { useEffect, useState } from 'react';
import { PTO_TYPES } from '../../utils/constants';
import PtoTypeIcon from '../ui/PtoTypeIcon';
import { fmtShort } from '../../utils/dateHelpers';
import { useDataSource } from '../../data/dataSource';
import { lineEntriesForRequest } from '../../utils/requestHelpers';

// Design notes: The dashboard's signature row. Each card carries its PTO type's colour as a real
//   identity (tinted icon chip + usage bar), leads with the number that matters, days REMAINING,
//   big and tabular, and shows what's used as a slim bar + caption. Varying fill levels and hues
//   give the row visual rhythm so five cards never read as an identical metric grid. No empty rings.
export default function BalanceCards({ userId }) {
  const { usedFor, grantFor, requestsForUser } = useDataSource();
  const [data, setData] = useState(null); // { requests, usedByType } or null while loading

  useEffect(() => {
    let alive = true;
    // Two reads in parallel: the user's requests (for the floating caption) and the days
    // used per PTO type. usedFor is one call per type, so batch them with Promise.all.
    Promise.all([
      requestsForUser(userId),
      Promise.all(PTO_TYPES.map((t) => usedFor(userId, t.id))),
      Promise.all(PTO_TYPES.map((t) => grantFor(userId, t.id))),
    ]).then(([requests, usedList, grantList]) => {
      if (!alive) return;
      const usedByType = {};
      const grantsByType = {};
      PTO_TYPES.forEach((t, i) => {
        usedByType[t.id] = usedList[i];
        grantsByType[t.id] = grantList[i];
      });
      setData({ requests, usedByType, grantsByType });
    });
    return () => { alive = false; };
  }, [userId]);

  // Leaf component rendered inside pages: while loading, render nothing. The mock resolves
  // instantly; over Supabase this is a brief blank row, not a full-screen spinner.
  if (data === null) return null;
  const { requests, usedByType, grantsByType } = data;

  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-5">
      {PTO_TYPES.map((t) => {
        const total = grantsByType[t.id];
        const used = usedByType[t.id];
        const remaining = total - used;
        const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

        let caption;
        if (t.id === 'floating') {
          const taken = requests.flatMap(lineEntriesForRequest).find((r) => r.type === 'floating' && r.status === 'approved');
          caption = taken ? `Used ${fmtShort(taken.start)}` : 'Not yet used';
        } else {
          caption = used === 0 ? 'None used yet' : `${used} used`;
        }

        return (
          <div
            key={t.id}
            className="flex min-w-[158px] flex-col gap-3.5 rounded-card border border-line bg-card p-4 shadow-card transition-shadow duration-200 hover:shadow-raised sm:min-w-0"
          >
            <span
              className="grid h-9 w-9 place-items-center rounded-[10px]"
              style={{ background: `color-mix(in oklch, ${t.color} 15%, var(--c-card))`, color: t.color }}
            >
              <PtoTypeIcon typeId={t.id} size={17} />
            </span>

            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-semibold text-ink-soft">{t.name}</p>
              <p className="mt-1 flex items-baseline gap-1.5">
                <span className="text-[27px] font-bold leading-none tabular text-ink">{remaining}</span>
                <span className="text-[13px] font-medium text-ink-mute">of {total}</span>
              </p>
            </div>

            <div className="mt-auto">
              <div
                className="h-1.5 w-full overflow-hidden rounded-full"
                style={{ background: `color-mix(in oklch, ${t.color} 13%, var(--c-panel))` }}
                role="progressbar"
                aria-valuenow={used}
                aria-valuemin={0}
                aria-valuemax={total}
                aria-label={`${t.name}: ${used} of ${total} days used`}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-out"
                  style={{ width: `${pct}%`, background: t.color }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-ink-mute">{caption}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
