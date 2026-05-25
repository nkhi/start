/**
 * HabitGradeTiers
 *
 * Groups all habits into Ontario-style grade tiers based on weighted
 * consistency. Essentials get an ⚡ badge. Each habit is a compact chip
 * showing name + insight tag + %.
 *
 *  A  85%+      On Fire / Solid
 *  B  75–84%
 *  C  65–74%    Needs attention
 *  D  55–64%
 *  F  <55%      Struggling / Dormant
 */

import type { HabitMetrics, CategoryMetrics, InsightTag } from '../useInsightsData';
import { HABIT_TIME_CONFIG } from '../../constants';
import styles from '../InsightsDashboard.module.css';

const TIERS = [
  { grade: 'A', min: 0.85, max: 1.00, label: 'On Track',        color: '#10b981', emoji: '🔥' },
  { grade: 'B', min: 0.75, max: 0.85, label: 'Solid',            color: '#34d399', emoji: '✅' },
  { grade: 'C', min: 0.65, max: 0.75, label: 'Needs Attention',  color: '#f59e0b', emoji: '⚠️' },
  { grade: 'D', min: 0.55, max: 0.65, label: 'Slipping',         color: '#f97316', emoji: '🔻' },
  { grade: 'F', min: 0.00, max: 0.55, label: 'Struggling',       color: '#ef4444', emoji: '💤' },
];

const TAG_LABEL: Record<InsightTag, string> = {
  on_fire:          '🔥',
  solid:            '✅',
  exception_creep:  '⚠️ except',
  slipping:         '⚠️ slip',
  struggling:       '🚨',
  dormant:          '💤',
  essential_at_risk:'⚡ risk',
  new_habit:        '🌱',
};

const TAG_COLOR: Record<InsightTag, string> = {
  on_fire:          '#10b981',
  solid:            '#6ee7b7',
  exception_creep:  '#f59e0b',
  slipping:         '#f97316',
  struggling:       '#ef4444',
  dormant:          '#6b7280',
  essential_at_risk:'#f97316',
  new_habit:        '#38bdf8',
};

const TAG_BG: Record<InsightTag, string> = {
  on_fire:          'rgba(16,185,129,0.12)',
  solid:            'rgba(110,231,183,0.08)',
  exception_creep:  'rgba(245,158,11,0.12)',
  slipping:         'rgba(249,115,22,0.12)',
  struggling:       'rgba(239,68,68,0.12)',
  dormant:          'rgba(107,114,128,0.10)',
  essential_at_risk:'rgba(249,115,22,0.15)',
  new_habit:        'rgba(56,189,248,0.10)',
};

function HabitChip({ habit }: { habit: HabitMetrics }) {
  const cfg = HABIT_TIME_CONFIG[habit.category];
  const catColor = cfg?.color === 'orange' ? '#f97316' : (cfg?.color ?? '#6b7280');
  const pct = Math.round(habit.weightedConsistency * 100);

  return (
    <div
      className={styles.habitChip}
      style={{ borderLeftColor: catColor }}
      title={`${habit.name} — ${pct}% (${habit.insightTag.replace(/_/g, ' ')})`}
    >
      {habit.isEssential && <span className={styles.chipEssential}>⚡</span>}
      <span className={styles.chipName}>{habit.name}</span>
      <span
        className={styles.chipTag}
        style={{ color: TAG_COLOR[habit.insightTag], background: TAG_BG[habit.insightTag] }}
      >
        {TAG_LABEL[habit.insightTag]}
      </span>
      <span className={styles.chipPct}>{pct}%</span>
    </div>
  );
}

interface Props {
  categories: CategoryMetrics[];
  selectedCategory: string | null;
}

export function HabitGradeTiers({ categories, selectedCategory }: Props) {
  const allHabits = selectedCategory
    ? (categories.find(c => c.category === selectedCategory)?.habits ?? [])
    : categories.flatMap(c => c.habits);

  return (
    <div className={styles.tiersSection}>
      {TIERS.map(tier => {
        const habits = allHabits
          .filter(h => h.weightedConsistency >= tier.min && h.weightedConsistency < tier.max)
          .sort((a, b) => b.weightedConsistency - a.weightedConsistency);

        if (habits.length === 0) return null;

        return (
          <div key={tier.grade} className={styles.tierGroup}>
            <div className={styles.tierHeader}>
              <span className={styles.tierGrade} style={{ color: tier.color }}>
                {tier.emoji} {tier.grade}
              </span>
              <span className={styles.tierLabel}>{tier.label}</span>
              <span className={styles.tierRange}>
                {tier.min === 0 ? '<55%' : `${Math.round(tier.min * 100)}–${Math.round(tier.max * 100)}%`}
              </span>
            </div>
            <div className={styles.tierChips}>
              {habits.map(h => <HabitChip key={h.habitId} habit={h} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
