import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// Donut of total unused PTO days remaining across the company, by type (a payroll liability).
export default function BalanceLiabilityChart({ data, total }) {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={70} outerRadius={104} paddingAngle={2} stroke="none">
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--c-line)', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 top-[104px] -translate-y-1/2 text-center">
        <p className="font-mono text-3xl font-medium text-ink tabular">{total}</p>
        <p className="text-xs text-ink-mute">days unused</p>
      </div>
    </div>
  );
}
