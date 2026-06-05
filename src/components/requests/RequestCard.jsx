import { useEffect, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { ptoTypeById, userById, firstName } from '../../utils/constants';
import { fmtRange, relativeTime } from '../../utils/dateHelpers';
import { useDataSource } from '../../data/dataSource';
import { lineDays, requestDays, requestLines, requestRangeLabel, requestTypeLabel } from '../../utils/requestHelpers';
import StatusChip from '../ui/StatusChip';
import PtoTypeIcon from '../ui/PtoTypeIcon';
import Button from '../ui/Button';

// Design notes: An employee's own request. Type identity is a tinted icon tile (never
//   a left-stripe). Status chip top-right, key facts on one meta line, denial reason and
//   notes tucked behind progressive reveal so the resting card stays scannable.
// References: DESIGN.md card spec; Linear list-item density.
export default function RequestCard({ request, onCancel }) {
  const [expanded, setExpanded] = useState(false);
  const { normalDaysOffFor } = useDataSource();
  const [normalDaysOff, setNormalDaysOff] = useState([0, 6]);
  const lines = requestLines(request);
  const primaryType = ptoTypeById(lines[0]?.type);
  const primaryColor = primaryType?.color || 'var(--c-ink-mute)';
  const days = requestDays(request, normalDaysOff);
  const decider = userById(request.decidedBy);

  useEffect(() => {
    let alive = true;
    normalDaysOffFor(request.userId).then((daysOff) => { if (alive) setNormalDaysOff(daysOff); });
    return () => { alive = false; };
  }, [request.userId]);

  return (
    <div className="rounded-card border border-line bg-card p-4 shadow-card transition-shadow hover:shadow-lift">
      <div className="flex items-start gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-btn"
          style={{ background: `color-mix(in oklch, ${primaryColor} 12%, var(--c-card))`, color: primaryColor }}
        >
          <PtoTypeIcon typeId={primaryType?.id} size={18} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-ink">{requestTypeLabel(request)}</p>
              <p className="text-sm text-ink-soft">{requestRangeLabel(request)}</p>
            </div>
            <StatusChip status={request.status} size="xs" />
          </div>

          {lines.length > 1 && (
            <div className="mt-2 space-y-1 rounded-btn bg-panel px-3 py-2">
              {lines.map((line, index) => {
                const type = ptoTypeById(line.type);
                return (
                  <div key={`${line.type}-${line.start}-${index}`} className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 truncate text-ink-soft">
                      <span className="font-semibold text-ink">{type?.name}</span> · {fmtRange(line.start, line.end)}
                    </span>
                    <span className="shrink-0 tabular text-ink-mute">{lineDays(line, normalDaysOff)}d</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-mute">
            <span className="font-medium text-ink-soft tabular">{days} day{days === 1 ? '' : 's'}</span>
            <span>Submitted {relativeTime(request.submittedAt)}</span>
            {decider && request.decidedAt && (
              <span>
                {request.status === 'approved' ? 'Approved' : 'Denied'} by {firstName(decider.name)}
              </span>
            )}
          </div>

          {request.status === 'denied' && request.denialReason && (
            <p className="mt-2 rounded-btn bg-danger-soft px-3 py-2 text-xs text-danger-ink">
              <b>Reason:</b> {request.denialReason}
            </p>
          )}

          {(request.note || onCancel) && (
            <div className="mt-3 flex items-center justify-between gap-2">
              {request.note ? (
                <button
                  onClick={() => setExpanded((e) => !e)}
                  className="flex items-center gap-1 text-xs font-semibold text-ink-mute hover:text-ink"
                >
                  Notes <ChevronDown size={13} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
              ) : (
                <span />
              )}
              {request.status === 'pending' && onCancel && (
                <Button variant="outline" size="sm" onClick={() => onCancel(request)}>
                  <X size={14} /> Cancel
                </Button>
              )}
            </div>
          )}

          {expanded && request.note && (
            <p className="mt-2 rounded-btn bg-panel px-3 py-2 text-xs text-ink-soft animate-fade-up">{request.note}</p>
          )}
        </div>
      </div>
    </div>
  );
}
