// Design notes: Status tabs with live counts up top, a two-column card grid below.
//   Cancel routes through a confirm dialog (reversible, never a surprise). Empty states
//   are status-aware and the "All" empty state offers the first request as its CTA.
// References: Gusto/Charlie HR request lists; status-filtered tab pattern.
import { useMemo, useState } from 'react';
import { Mail, ArrowDownUp } from 'lucide-react';
import { useDemoContext } from '../hooks/useDemoContext';
import { useRequestModal } from '../components/requests/RequestModalProvider';
import { useToast } from '../components/ui/Toast';
import RequestCard from '../components/requests/RequestCard';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { toDate } from '../utils/dateHelpers';

const TABS = ['All', 'Pending', 'Approved', 'Denied', 'Cancelled'];

export default function MyRequests() {
  const { activeUser, requestsForUser, cancelRequest } = useDemoContext();
  const { openRequest } = useRequestModal();
  const toast = useToast();
  const [tab, setTab] = useState('All');
  const [sort, setSort] = useState('recent');
  const [toCancel, setToCancel] = useState(null);

  const all = requestsForUser(activeUser.id);

  const counts = useMemo(() => {
    const c = { All: all.length };
    all.forEach((r) => {
      const k = r.status[0].toUpperCase() + r.status.slice(1);
      c[k] = (c[k] || 0) + 1;
    });
    return c;
  }, [all]);

  const filtered = useMemo(() => {
    let list = tab === 'All' ? all : all.filter((r) => r.status === tab.toLowerCase());
    list = [...list].sort((a, b) =>
      sort === 'recent'
        ? a.submittedAt < b.submittedAt
          ? 1
          : -1
        : toDate(a.start) - toDate(b.start)
    );
    return list;
  }, [all, tab, sort]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 rounded-btn px-3 py-1.5 text-sm font-semibold transition-colors ${
                tab === t ? 'bg-navy text-navy-fg' : 'text-ink-soft hover:bg-panel'
              }`}
            >
              {t}
              {counts[t] != null && (
                <span className={`rounded-full px-1.5 text-[11px] ${tab === t ? 'bg-navy-fg/20' : 'bg-panel'}`}>
                  {counts[t]}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSort((s) => (s === 'recent' ? 'date' : 'recent'))}
          className="flex items-center gap-1.5 rounded-btn border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-panel"
        >
          <ArrowDownUp size={14} />
          {sort === 'recent' ? 'Newest first' : 'By start date'}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-line bg-card shadow-card">
          <EmptyState
            icon={Mail}
            title={tab === 'All' ? 'No requests yet' : `No ${tab.toLowerCase()} requests`}
            description={tab === 'All' ? 'Ready for some time off? Submit your first request.' : 'Nothing here right now.'}
            className="py-16"
            action={
              tab === 'All' && (
                <Button variant="primary" onClick={() => openRequest()}>
                  Request time off
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((r) => (
            <RequestCard key={r.id} request={r} onCancel={setToCancel} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toCancel}
        onClose={() => setToCancel(null)}
        onConfirm={() => {
          cancelRequest(toCancel.id);
          toast('Request cancelled.', { kind: 'info' });
        }}
        title="Cancel this request?"
        message="This will withdraw your pending request. You can always submit a new one."
        confirmLabel="Cancel request"
      />
    </div>
  );
}
