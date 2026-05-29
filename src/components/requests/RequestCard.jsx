import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { ptoTypeById, userById, firstName } from '../../utils/constants';
import { fmtRange, businessDays, fmtShort, relativeTime } from '../../utils/dateHelpers';
import StatusChip from '../ui/StatusChip';
import PtoTypeIcon from '../ui/PtoTypeIcon';
import Button from '../ui/Button';

// Design notes: An employee's own request. Type identity is a tinted icon tile (never
//   a left-stripe). Status chip top-right, key facts on one meta line, denial reason and
//   notes tucked behind progressive reveal so the resting card stays scannable.
// References: DESIGN.md card spec; Linear list-item density.
export default function RequestCard({ request, onCancel }) {
  const [expanded, setExpanded] = useState(false);
  const type = ptoTypeById(request.type);
  const days = businessDays(request.start, request.end);
  const decider = userById(request.decidedBy);

  return (
    <div className="rounded-card border border-line bg-card p-4 shadow-card transition-shadow hover:shadow-lift">
      <div className="flex items-start gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-btn"
          style={{ background: `color-mix(in oklch, ${type.color} 12%, var(--c-card))`, color: type.color }}
        >
          <PtoTypeIcon typeId={type.id} size={18} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-ink">{type.name}</p>
              <p className="text-sm text-ink-soft">{fmtRange(request.start, request.end)}</p>
            </div>
            <StatusChip status={request.status} size="xs" />
          </div>

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
