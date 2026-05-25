/**
 * PeriodCompareList
 *
 * Shows "This {days}D vs. Prior {days}D" as a clean list of rows —
 * one per category. A bar shows current completion; a small tick marks
 * where the prior period was. Delta chip (+/−%) makes direction obvious.
 */

import type { CategoryMetrics } from '../useInsightsData';
import styles from '../InsightsDashboard.module.css';

interface Props {
  categories: CategoryMetrics[];
  days: number;
}

export function PeriodCompareList({ categories, days }: Props) {
  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionTitle}>This {days}D vs. Prior {days}D</div>
      {categories.map(cat => {
        const cur = Math.round(cat.score * 100);
        const prior = Math.round(cat.priorScore * 100);
        const delta = cur - prior;
        const hasPriorData = cat.priorScore > 0;

        return (
          <div key={cat.category} className={styles.compareRow}>
            <div className={styles.compareDot} style={{ background: cat.color }} />
            <span className={styles.compareName}>{cat.label}</span>

            {/* Bar with prior marker */}
            <div className={styles.compareBar}>
              <div
                className={styles.compareBarFill}
                style={{ width: `${cur}%`, background: cat.color, opacity: 0.7 }}
              />
              {hasPriorData && (
                <div
                  className={styles.comparePriorMark}
                  style={{ left: `${prior}%` }}
                />
              )}
            </div>

            <div className={styles.compareNums}>
              {hasPriorData && (
                <>
                  <span className={styles.comparePriorNum}>{prior}%</span>
                  <span className={styles.compareArrow}>→</span>
                </>
              )}
              <span className={styles.compareCurNum}>{cur}%</span>
              {hasPriorData && (
                <span className={`${styles.compareDelta} ${
                  delta > 2 ? styles.compareDeltaPos
                    : delta < -2 ? styles.compareDeltaNeg
                    : styles.compareDeltaFlat
                }`}>
                  {delta > 0 ? '+' : ''}{delta}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
