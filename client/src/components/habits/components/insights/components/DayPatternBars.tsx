/**
 * DayPatternBars
 *
 * 7 vertical bars (Mon–Sun) showing average weighted completion across
 * all habits (or a selected category) for each day of the week.
 * Answers the question: "Which days am I most/least consistent?"
 */

import type { CategoryMetrics } from '../useInsightsData';
import styles from '../InsightsDashboard.module.css';

const DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
// DOW from server: 0=Sun, 1=Mon ... 6=Sat. Remap to Mon-first.
const DOW_INDEX = [1, 2, 3, 4, 5, 6, 0]; // Mon=1, Tue=2 ... Sun=0

interface Props {
  categories: CategoryMetrics[];
  selectedCategory: string | null;
}

function rateToColor(rate: number): string {
  if (rate >= 0.85) return '#10b981';
  if (rate >= 0.7)  return '#34d399';
  if (rate >= 0.55) return '#f59e0b';
  if (rate >= 0.4)  return '#f97316';
  return '#ef4444';
}

export function DayPatternBars({ categories, selectedCategory }: Props) {
  const habits = selectedCategory
    ? (categories.find(c => c.category === selectedCategory)?.habits ?? [])
    : categories.flatMap(c => c.habits);

  // Average weighted rate per day of week (0=Sun..6=Sat)
  const dowRates: (number | null)[] = Array(7).fill(null);
  for (let dow = 0; dow < 7; dow++) {
    const vals: number[] = [];
    for (const h of habits) {
      const r = h.dowRates[dow];
      if (r !== null) vals.push(r);
    }
    dowRates[dow] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  // Map to Mon-first display
  const displayRates = DOW_INDEX.map(i => dowRates[i]);
  const maxRate = Math.max(...displayRates.filter(r => r !== null) as number[], 0.01);

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionTitle}>Day of Week Pattern</div>
      <div className={styles.dayBars}>
        {DOW.map((day, i) => {
          const rate = displayRates[i];
          const pct = rate !== null ? rate : 0;
          const heightPct = (pct / maxRate) * 80; // max 80px bar
          const color = rate !== null ? rateToColor(rate) : 'rgba(255,255,255,0.05)';

          return (
            <div key={day} className={styles.dayBarCol}>
              <span className={styles.dayBarPct}>
                {rate !== null ? `${Math.round(rate * 100)}%` : ''}
              </span>
              <div
                className={styles.dayBar}
                style={{
                  height: `${Math.max(heightPct, 4)}px`,
                  background: color,
                  opacity: rate !== null ? 0.8 : 0.15,
                  boxShadow: rate !== null && rate >= 0.7 ? `0 0 8px ${color}50` : 'none',
                }}
              />
              <span className={styles.dayBarLabel}>{day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
