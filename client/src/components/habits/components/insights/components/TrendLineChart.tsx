import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useState } from 'react';
import type { CategoryMetrics } from '../useInsightsData';
import styles from '../InsightsDashboard.module.css';

interface TrendSeries {
  weeks: string[];
  series: Record<string, { weekStart: string; rate: number }[]>;
}

interface Props {
  trendSeries: TrendSeries | null;
  categories: CategoryMetrics[];
}

function fmtWeek(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function TrendLineChart({ trendSeries, categories }: Props) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  if (!trendSeries || trendSeries.weeks.length === 0) {
    return <div className={styles.chartEmpty}>Not enough weekly data yet.</div>;
  }

  const toggle = (cat: string) =>
    setHidden(prev => { const s = new Set(prev); s.has(cat) ? s.delete(cat) : s.add(cat); return s; });

  const chartData = trendSeries.weeks.map(week => {
    const point: Record<string, number | string> = { week: fmtWeek(week) };
    for (const [cat, series] of Object.entries(trendSeries.series)) {
      const entry = series.find(s => s.weekStart === week);
      point[cat] = entry ? Math.round(entry.rate * 100) : 0;
    }
    return point;
  });

  const activeCats = categories.filter(c => trendSeries.series[c.category]);

  return (
    <>
      {/* Category toggle pills */}
      <div className={styles.chartLegend}>
        {activeCats.map(cat => {
          const isHidden = hidden.has(cat.category);
          return (
            <button
              key={cat.category}
              className={`${styles.legendPill} ${isHidden ? styles.legendPillHidden : ''}`}
              style={{ '--pill-color': cat.color } as React.CSSProperties}
              onClick={() => toggle(cat.category)}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="week" tick={{ fill: '#444', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: '#444', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
          <Tooltip
            contentStyle={{ background: '#141414', border: '1px solid #222', borderRadius: 8, fontSize: 12 }}
            itemStyle={{ color: '#ccc' }}
            formatter={(v: number) => [`${v}%`]}
          />
          <ReferenceLine y={70} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
          {activeCats.map(cat =>
            hidden.has(cat.category) ? null : (
              <Line
                key={cat.category}
                type="monotone"
                dataKey={cat.category}
                name={cat.label}
                stroke={cat.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                connectNulls
              />
            )
          )}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}
