import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import type { CategoryMetrics } from '../useInsightsData';
import styles from '../InsightsDashboard.module.css';

interface Props {
  categories: CategoryMetrics[];
}

export function PeriodComparisonChart({ categories }: Props) {
  if (categories.length === 0) return null;

  const data = categories.map(cat => ({
    name: cat.label,
    current: Math.round(cat.score * 100),
    prior: Math.round(cat.priorScore * 100),
    color: cat.color,
    delta: Math.round(cat.delta * 100),
  }));

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <span className={styles.chartTitle}>This Period vs. Prior</span>
        <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#555' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(255,255,255,0.25)', display: 'inline-block' }} />
            Prior
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'currentColor', display: 'inline-block' }} />
            Current
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 16, right: 12, left: -20, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
          <Tooltip
            contentStyle={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }}
            itemStyle={{ color: '#ccc' }}
            formatter={(v: number) => [`${v}%`]}
          />
          {/* Prior period — dim */}
          <Bar dataKey="prior" name="Prior" radius={[3, 3, 0, 0]} maxBarSize={14}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} fillOpacity={0.2} />
            ))}
          </Bar>
          {/* Current period — vivid */}
          <Bar dataKey="current" name="Current" radius={[3, 3, 0, 0]} maxBarSize={14}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
            <LabelList
              dataKey="delta"
              position="top"
              style={{ fontSize: 10, fill: '#666' }}
              formatter={(v: number) => (v === 0 ? '' : `${v > 0 ? '+' : ''}${v}%`)}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
