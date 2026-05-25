import type { CategoryMetrics, HabitMetrics } from '../useInsightsData';
import styles from '../InsightsDashboard.module.css';

interface Props {
  categories: CategoryMetrics[];
  selectedCategory: string | null;
}

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function rateToColor(rate: number | null): string {
  if (rate === null) return 'rgba(255,255,255,0.03)';
  if (rate >= 0.9) return 'rgba(16,185,129,0.85)';
  if (rate >= 0.75) return 'rgba(16,185,129,0.55)';
  if (rate >= 0.6) return 'rgba(245,158,11,0.55)';
  if (rate >= 0.4) return 'rgba(245,158,11,0.3)';
  return 'rgba(239,68,68,0.4)';
}

function HabitDowRow({ habit }: { habit: HabitMetrics }) {
  return (
    <div className={styles.dowRow}>
      <div className={styles.dowHabitName}>
        {habit.isEssential && <span style={{ color: '#f97316', marginRight: 4 }}>⚡</span>}
        {habit.name}
      </div>
      <div className={styles.dowCells}>
        {DOW_LABELS.map((day, i) => {
          const rate = habit.dowRates[i];
          return (
            <div
              key={day}
              className={styles.dowCell}
              style={{ background: rateToColor(rate) }}
              title={rate !== null ? `${day}: ${Math.round(rate * 100)}%` : `${day}: no data`}
            >
              {rate !== null && rate >= 0.5 && (
                <span className={styles.dowCellLabel}>{Math.round(rate * 100)}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DayOfWeekGrid({ categories, selectedCategory }: Props) {
  const visibleCats = selectedCategory
    ? categories.filter(c => c.category === selectedCategory)
    : categories;

  return (
    <div className={styles.dowSection}>
      <div className={styles.dowHeader}>
        <div className={styles.dowHabitName} style={{ color: '#444', fontSize: 11 }}>Habit</div>
        <div className={styles.dowCells}>
          {DOW_LABELS.map(d => (
            <div key={d} className={styles.dowDayLabel}>{d}</div>
          ))}
        </div>
      </div>
      {visibleCats.map(cat => (
        <div key={cat.category} className={styles.dowCatGroup}>
          <div className={styles.dowCatLabel} style={{ color: cat.color }}>
            {cat.label}
          </div>
          {cat.habits
            .sort((a, b) => (a.isEssential === b.isEssential ? 0 : a.isEssential ? -1 : 1))
            .map(h => <HabitDowRow key={h.habitId} habit={h} />)}
        </div>
      ))}
    </div>
  );
}
