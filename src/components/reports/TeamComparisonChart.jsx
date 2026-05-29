import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Average PTO days taken per team member, by team.
export default function TeamComparisonChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--c-line)" vertical={false} />
        <XAxis dataKey="team" tick={{ fontSize: 11, fill: 'var(--c-ink-mute)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--c-ink-mute)' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--c-line)', fontSize: 12 }} cursor={{ fill: 'var(--c-panel)' }} />
        <Bar dataKey="avgDays" name="Avg days / person" fill="var(--c-navy-600)" radius={[4, 4, 0, 0]} maxBarSize={64} />
      </BarChart>
    </ResponsiveContainer>
  );
}
