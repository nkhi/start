import type { CategoryMetrics } from '../useInsightsData';
import { StateDistributionBar } from './StateDistributionBar';
import styles from '../InsightsDashboard.module.css';

interface Props {
  categories: CategoryMetrics[];
  selectedCategory: string | null;
  onSelect: (cat: string | null) => void;
}

function TrendArrow({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.02) return <span className={styles.trendFlat}>—</span>;
  return delta > 0
    ? <span className={styles.trendUp}>↑ {Math.round(delta * 100)}%</span>
    : <span className={styles.trendDown}>↓ {Math.round(Math.abs(delta) * 100)}%</span>;
}

export function CategoryScoreCards({ categories, selectedCategory, onSelect }: Props) {
  if (categories.length === 0) return null;

  return (
    <div className={styles.scoreCardsRow}>
      {categories.map(cat => {
        const isSelected = selectedCategory === cat.category;
        const scorePct = Math.round(cat.score * 100);

        return (
          <button
            key={cat.category}
            className={`${styles.scoreCard} ${isSelected ? styles.scoreCardActive : ''}`}
            style={{ '--cat-color': cat.color } as React.CSSProperties}
            onClick={() => onSelect(isSelected ? null : cat.category)}
          >
            <div className={styles.scoreCardTop}>
              <span className={styles.scoreCardLabel}>{cat.label}</span>
              {cat.essentialCount > 0 && (
                <span className={styles.essentialBadge} title={`${cat.essentialCount} essential`}>⚡</span>
              )}
            </div>
            <div className={styles.scoreCardNumber}>{scorePct}%</div>
            <StateDistributionBar
              stateProps={
                // Aggregate stateProps across all habits in category
                cat.habits.reduce(
                  (acc, h) => ({
                    s1: acc.s1 + h.stateProps.s1,
                    s3: acc.s3 + h.stateProps.s3,
                    s4: acc.s4 + h.stateProps.s4,
                    s2: acc.s2 + h.stateProps.s2,
                    s0: acc.s0 + h.stateProps.s0,
                  }),
                  { s1: 0, s3: 0, s4: 0, s2: 0, s0: 0 }
                )
              }
              height={3}
            />
            <div className={styles.scoreCardFooter}>
              <span className={styles.scoreCardCount}>{cat.habitCount} habits</span>
              <TrendArrow delta={cat.delta} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
