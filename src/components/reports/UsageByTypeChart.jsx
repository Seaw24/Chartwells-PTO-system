import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { PTO_TYPES } from '../../utils/constants';

// Stacked monthly usage across PTO types (business days).
export default function UsageByTypeChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--c-line)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--c-ink-mute)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--c-ink-mute)' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: '1px solid var(--c-line)', fontSize: 12, boxShadow: 'var(--c-shadow)' }}
          cursor={{ fill: 'var(--c-panel)' }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
        {PTO_TYPES.map((t) => (
          <Bar key={t.id} dataKey={t.name} stackId="u" fill={t.color} radius={[2, 2, 0, 0]} maxBarSize={32} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
