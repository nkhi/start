import type { HabitMetrics } from '../useInsightsData';
import styles from '../InsightsDashboard.module.css';

interface Props {
  habits: HabitMetrics[];
  days: number;
}

// Build a simple last-N-days streak display (using dowRates as a proxy since we
// don't have per-day raw entries here — show overall stats instead)
export function EssentialSpotlight({ habits, days }: Props) {
  const essentials = habits.filter(h => h.isEssential);
  if (essentials.length === 0) return null;

  return (
    <div className={styles.essentialSection}>
      <div className={styles.sectionLabel}>
        <span style={{ color: '#f97316' }}>⚡</span> Essential Habits
      </div>
      <div className={styles.essentialGrid}>
        {essentials.map(h => {
          const pct = Math.round(h.weightedConsistency * 100);
          const isGood = pct >= 85;

          // Build a mini DOW track
          const dowRates = h.dowRates;

          return (
            <div key={h.habitId} className={styles.essentialCard}>
              <div className={styles.essentialCardTop}>
                <span className={styles.essentialCardName}>{h.name}</span>
                <span
                  className={styles.essentialPct}
                  style={{ color: isGood ? '#10b981' : '#ef4444' }}
                >
                  {pct}%
                </span>
              </div>
              <div className={styles.essentialDoW}>
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map((label, i) => {
                  const rate = dowRates[i];
                  let dotColor = 'rgba(255,255,255,0.05)';
                  if (rate !== null) {
                    if (rate >= 0.9) dotColor = '#10b981';
                    else if (rate >= 0.6) dotColor = '#f59e0b';
                    else dotColor = '#ef4444';
                  }
                  return (
                    <div key={label} className={styles.essentialDot} title={`${label}: ${rate !== null ? Math.round(rate * 100) + '%' : 'no data'}`}>
                      <div className={styles.essentialDotCircle} style={{ background: dotColor }} />
                      <span className={styles.essentialDotLabel}>{label}</span>
                    </div>
                  );
                })}
              </div>
              <div className={styles.essentialSubtext}>
                {isGood
                  ? `Maintaining well over ${days}d`
                  : `Below 85% threshold — needs attention`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
