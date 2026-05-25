/**
 * InsightsDashboard v2.2
 *
 * Layout:
 *   Header
 *   ┌─[Category Rings]──────────────┬─[Insight tiles]────────┐
 *   └───────────────────────────────┴────────────────────────┘
 *   ┌─[Weekly trend chart]──────────────────────────────────┐
 *   └──────────────────────────────────────────────────────┘
 *   ┌─[Period compare]──┬─[Day pattern]────────────────────┐
 *   └───────────────────┴──────────────────────────────────┘
 *   ┌─[Grade tiers]─────────────────────────────────────────┐
 *   └──────────────────────────────────────────────────────┘
 */

import { useMemo, useState } from 'react';
import { CaretLeftIcon } from '@phosphor-icons/react';
import { useInsightsData } from './useInsightsData';
import { CategoryRings } from './components/CategoryRings';
import { InsightsFeed } from './components/InsightsFeed';
import { TrendLineChart } from './components/TrendLineChart';
import { PeriodCompareList } from './components/PeriodCompareList';
import { DayPatternBars } from './components/DayPatternBars';
import { HabitGradeTiers } from './components/HabitGradeTiers';
import styles from './InsightsDashboard.module.css';

interface Props {
  onClose: () => void;
}

// ── Time range options ────────────────────────────────────────────────────────

function ytdDays(): number {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  return Math.ceil((now.getTime() - jan1.getTime()) / 86_400_000);
}

const RANGES = [
  { label: '1W',  days: 7 },
  { label: '2W',  days: 14 },
  { label: '3W',  days: 21 },
  { label: '4W',  days: 28 },
  { label: '60D', days: 60 },
  { label: '90D', days: 90 },
  { label: '6M',  days: 180 },
  { label: 'YTD', days: -1 },  // resolved dynamically
  { label: 'All', days: 3650 },
];

export function InsightsDashboard({ onClose }: Props) {
  const [selectedRange, setSelectedRange] = useState(4); // default 4W (index 3)
  const ytd = useMemo(() => ytdDays(), []);

  const days = RANGES[selectedRange].days === -1 ? ytd : RANGES[selectedRange].days;

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { isLoading, error, categoryMetrics, feed, trendSeries } =
    useInsightsData(days);

  const visibleCategories = selectedCategory
    ? categoryMetrics.filter(c => c.category === selectedCategory)
    : categoryMetrics;

  return (
    <div className={styles.panel}>
      <div className={styles.panelInner}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onClose}>
            <CaretLeftIcon size={14} weight="bold" />
            Back
          </button>
          <span className={styles.headerTitle}>Habit Insights</span>
          <div className={styles.rangeSelector}>
            {RANGES.map((r, i) => (
              <button
                key={r.label}
                className={`${styles.rangeBtn} ${selectedRange === i ? styles.rangeBtnActive : ''}`}
                onClick={() => setSelectedRange(i)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <span>Crunching your data…</span>
          </div>
        )}

        {error && (
          <div className={styles.loadingState}>
            <span>⚠️ Failed to load insights.</span>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {/* ── Top row: rings + insights side by side ──────────── */}
            <div className={styles.topRow}>

              <div className={`${styles.sectionCard} ${styles.ringsCard}`}>
                <div className={styles.sectionTitle}>Category Overview</div>
                <CategoryRings
                  categories={categoryMetrics}
                  selectedCategory={selectedCategory}
                  onSelect={cat => setSelectedCategory(cat)}
                />
              </div>

              <div className={`${styles.sectionCard} ${styles.feedCard_wrapper}`}>
                <InsightsFeed items={feed} />
              </div>

            </div>

            {/* ── Weekly trend (full width) ───────────────────────── */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionTitle}>Weekly Consistency Trend</div>
              <TrendLineChart
                trendSeries={trendSeries}
                categories={visibleCategories}
              />
            </div>

            {/* ── Period compare + Day pattern ───────────────────── */}
            <div className={styles.chartsRow}>
              <PeriodCompareList categories={visibleCategories} days={days} />
              <DayPatternBars categories={categoryMetrics} selectedCategory={selectedCategory} />
            </div>

            {/* ── Grade tiers ────────────────────────────────────── */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionTitle}>
                Habit Rankings
                {selectedCategory && (
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                    {' '}— {categoryMetrics.find(c => c.category === selectedCategory)?.label}
                  </span>
                )}
              </div>
              <HabitGradeTiers
                categories={categoryMetrics}
                selectedCategory={selectedCategory}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
