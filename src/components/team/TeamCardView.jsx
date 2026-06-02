// Design notes: One card per person, each a button into their profile. The live status
//   line (in office / on PTO / holiday) sits up top, then three balance bars give an
//   instant read on who has time banked. Hover lifts the card to signal it's clickable.
// References: Timetastic people view (balance beside the person); Float people column.
import { useEffect, useState } from 'react';
import { useDataSource } from '../../data/dataSource';
import { useToday } from '../../data/today';
import { PTO_TYPES, DEFAULT_BALANCES } from '../../utils/constants';
import { memberStatus } from './EmployeeProfile';
import Avatar from '../ui/Avatar';
import RolePill from '../ui/RolePill';

export default function TeamCardView({ members, onSelect }) {
  const { usedFor, getRequests, getHolidays } = useDataSource();
  const todayIso = useToday();
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    Promise.all([
      getRequests(),
      getHolidays(),
      Promise.all(members.flatMap((m) => PTO_TYPES.slice(0, 3).map((t) => usedFor(m.id, t.id)))),
    ]).then(([requests, holidays, usedList]) => {
      if (!alive) return;
      const usedByMemberType = {};
      let i = 0;
      members.forEach((m) => {
        usedByMemberType[m.id] = {};
        PTO_TYPES.slice(0, 3).forEach((t) => {
          usedByMemberType[m.id][t.id] = usedList[i++];
        });
      });
      setData({ requests, holidays, usedByMemberType });
    });
    return () => { alive = false; };
  }, [members]);

  if (data === null) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {members.map((m) => {
        const status = memberStatus(m, data.requests, data.holidays, todayIso);
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m)}
            className="rounded-card border border-line bg-card p-5 text-left shadow-card transition-shadow duration-[180ms] hover:shadow-lift"
          >
            <div className="flex items-center gap-3">
              <Avatar name={m.name} id={m.id} size="md" />
              <div className="min-w-0">
                <p className="truncate font-bold text-ink">{m.name}</p>
                <RolePill role={m.role} size="xs" />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-xs font-medium" style={{ color: status.tone }}>
              <span className="h-2 w-2 rounded-full" style={{ background: status.dot }} />
              {status.label}
            </div>

            <div className="mt-3 space-y-2">
              {PTO_TYPES.slice(0, 3).map((t) => {
                const total = DEFAULT_BALANCES[t.id];
                const used = data.usedByMemberType[m.id][t.id];
                return (
                  <div key={t.id} className="flex items-center gap-2">
                    <span className="w-16 truncate text-[11px] text-ink-mute">{t.name}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel">
                      <div className="h-full rounded-full" style={{ width: `${(used / total) * 100}%`, background: t.color }} />
                    </div>
                    <span className="font-mono text-[11px] text-ink-soft tabular">{total - used}/{total}</span>
                  </div>
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}
