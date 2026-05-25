import type { HabitMetrics, CategoryMetrics, InsightTag } from '../useInsightsData';
import { StateDistributionBar } from './StateDistributionBar';
import { HABIT_TIME_CONFIG } from '../../constants';
import styles from '../InsightsDashboard.module.css';

const TAG_CONFIG: Record<InsightTag, { label: string; color: string; bg: string }> = {
  on_fire:          { label: '🔥 On Fire',         color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  solid:            { label: '✅ Solid',             color: '#6ee7b7', bg: 'rgba(110,231,183,0.08)' },
  exception_creep:  { label: '⚠️ Exception Creep',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  slipping:         { label: '⚠️ Slipping',          color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  struggling:       { label: '🚨 Struggling',        color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  dormant:          { label: '💤 Dormant',            color: '#6b7280', bg: 'rgba(107,114,128,0.10)' },
  essential_at_risk:{ label: '⚡ At Risk',            color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
  new_habit:        { label: '🌱 New',               color: '#38bdf8', bg: 'rgba(56,189,248,0.10)' },
};

function HabitCard({ habit }: { habit: HabitMetrics }) {
  const cfg = HABIT_TIME_CONFIG[habit.category];
  const catColor = cfg?.color === 'orange' ? '#f97316' : (cfg?.color ?? '#6b7280');
  const tag = TAG_CONFIG[habit.insightTag];
  const pct = Math.round(habit.weightedConsistency * 100);
  const cleanPct = Math.round(habit.cleanRate * 100);

  return (
    <div className={styles.habitCard}>
      <div className={styles.habitCardAccent} style={{ background: catColor }} />
      <div className={styles.habitCardBody}>
        <div className={styles.habitCardTop}>
          <div className={styles.habitCardName}>
            {habit.isEssential && <span className={styles.essentialBadge}>⚡</span>}
            {habit.name}
          </div>
          <span
            className={styles.insightTag}
            style={{ color: tag.color, background: tag.bg }}
          >
            {tag.label}
          </span>
        </div>

        <div className={styles.habitCardMid}>
          <StateDistributionBar stateProps={habit.stateProps} height={5} />
        </div>

        <div className={styles.habitCardStats}>
          <span className={styles.statItem}>
            <span className={styles.statValue}>{pct}%</span>
            <span className={styles.statLabel}>weighted</span>
          </span>
          <span className={styles.statDivider} />
          <span className={styles.statItem}>
            <span className={styles.statValue}>{cleanPct}%</span>
            <span className={styles.statLabel}>clean</span>
          </span>
          {Math.abs(habit.trendDelta) >= 0.02 && (
            <>
              <span className={styles.statDivider} />
              <span className={styles.statItem}>
                <span
                  className={styles.statValue}
                  style={{ color: habit.trendDelta > 0 ? '#10b981' : '#ef4444' }}
                >
                  {habit.trendDelta > 0 ? '+' : ''}{Math.round(habit.trendDelta * 100)}%
                </span>
                <span className={styles.statLabel}>vs prior</span>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface Props {
  categories: CategoryMetrics[];
  selectedCategory: string | null;
}

export function HabitHealthCards({ categories, selectedCategory }: Props) {
  const visibleCats = selectedCategory
    ? categories.filter(c => c.category === selectedCategory)
    : categories;

  // Essentials section first
  const essentials = visibleCats.flatMap(c => c.habits).filter(h => h.isEssential);
  // Sort habits within each category by attention score (worst first)
  const attentionScore = (h: HabitMetrics) => (1 - h.weightedConsistency) * (h.isEssential ? 2 : 1);

  return (
    <div className={styles.habitCardsSection}>
      {essentials.length > 0 && (
        <div className={styles.habitCardsGroup}>
          <div className={styles.habitCardsGroupHeader}>
            <span style={{ color: '#f97316' }}>⚡</span> Essential Habits
          </div>
          {essentials
            .sort((a, b) => attentionScore(b) - attentionScore(a))
            .map(h => <HabitCard key={h.habitId} habit={h} />)}
        </div>
      )}
      {visibleCats.map(cat => {
        const nonEssentials = cat.habits.filter(h => !h.isEssential);
        if (nonEssentials.length === 0) return null;
        const cfg = HABIT_TIME_CONFIG[cat.category];
        const catColor = cfg?.color === 'orange' ? '#f97316' : (cfg?.color ?? '#6b7280');
        return (
          <div key={cat.category} className={styles.habitCardsGroup}>
            <div className={styles.habitCardsGroupHeader}>
              <span style={{ color: catColor }}>●</span> {cat.label}
              <span className={styles.groupScore}>{Math.round(cat.score * 100)}%</span>
            </div>
            {nonEssentials
              .sort((a, b) => attentionScore(b) - attentionScore(a))
              .map(h => <HabitCard key={h.habitId} habit={h} />)}
          </div>
        );
      })}
    </div>
  );
}
