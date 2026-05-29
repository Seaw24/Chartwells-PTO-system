import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import EmptyState from '../ui/EmptyState';
import { Clock } from 'lucide-react';

// Average days from submission to decision, by week.
export default function ApprovalTurnaroundChart({ data }) {
  if (!data.length) {
    return <EmptyState icon={Clock} title="Not enough data" description="Turnaround appears once requests are decided." className="py-12" />;
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--c-line)" vertical={false} />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--c-ink-mute)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--c-ink-mute)' }} axisLine={false} tickLine={false} unit="d" />
        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--c-line)', fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="avgDays"
          name="Avg turnaround"
          stroke="var(--c-accent)"
          strokeWidth={2.5}
          dot={{ r: 3, fill: 'var(--c-accent)' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
