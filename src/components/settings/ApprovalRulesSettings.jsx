import { useState } from 'react';
import { PTO_TYPES } from '../../utils/constants';
import { SectionIntro, Toggle } from './PtoTypesSettings';
import PtoTypeIcon from '../ui/PtoTypeIcon';

export default function ApprovalRulesSettings() {
  const [coverage, setCoverage] = useState(40);
  const [sla, setSla] = useState(48);
  const [autoApprove, setAutoApprove] = useState({ sick: true });

  return (
    <div className="space-y-4">
      <SectionIntro title="Approval rules" desc="Guardrails that keep coverage healthy and approvals timely." />

      <div className="rounded-card border border-line bg-card p-5">
        <label className="text-sm font-semibold text-ink">Coverage alert threshold</label>
        <p className="text-xs text-ink-mute">Warn admins when more than this share of a team is off the same day.</p>
        <div className="mt-3 flex items-center gap-4">
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={coverage}
            onChange={(e) => setCoverage(Number(e.target.value))}
            className="flex-1 accent-accent"
          />
          <span className="w-14 rounded-btn bg-panel py-1 text-center font-mono text-sm font-semibold text-ink tabular">{coverage}%</span>
        </div>
      </div>

      <div className="rounded-card border border-line bg-card p-5">
        <p className="text-sm font-semibold text-ink">Auto-approve</p>
        <p className="text-xs text-ink-mute">Skip manual review for low-risk requests (1 day or less).</p>
        <div className="mt-3 space-y-2">
          {PTO_TYPES.map((t) => (
            <div key={t.id} className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-ink-soft">
                <PtoTypeIcon typeId={t.id} size={14} style={{ color: t.color }} /> {t.name} <span className="text-xs text-ink-mute">(≤ 1 day)</span>
              </span>
              <Toggle on={!!autoApprove[t.id]} onChange={(v) => setAutoApprove((a) => ({ ...a, [t.id]: v }))} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-card border border-line bg-card p-5">
        <label className="text-sm font-semibold text-ink">Approval SLA reminder</label>
        <p className="text-xs text-ink-mute">Nudge the approver if no decision is made within this window.</p>
        <div className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
          Remind after
          <input
            type="number"
            min={1}
            value={sla}
            onChange={(e) => setSla(Number(e.target.value))}
            className="w-20 rounded-btn border border-line bg-card px-2 py-1 text-center font-mono text-sm text-ink focus:border-accent focus:outline-none"
          />
          hours
        </div>
      </div>
    </div>
  );
}
