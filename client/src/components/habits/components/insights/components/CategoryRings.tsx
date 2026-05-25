/**
 * CategoryRings v2
 *
 * Super ring (large): all completed portions are "squished" together
 * starting at 12-o'clock, colored by category. The incomplete gray arc
 * fills the remainder — you instantly see overall completion + breakdown.
 *
 * Individual rings: larger, cleaner, with colored arc + center % label.
 * Click to filter dashboard to that category.
 */

import type { CategoryMetrics } from '../useInsightsData';
import styles from '../InsightsDashboard.module.css';

const GAP_PX = 3; // px gap between colored segments in super ring

// ── Helpers ──────────────────────────────────────────────────────────────────

function dash(arcLen: number, circumference: number) {
  return `${Math.max(0, arcLen)} ${circumference}`;
}

// offset so dasharray starts at 12-o'clock and cursor position
function offset(cursor: number, circumference: number) {
  return circumference / 4 - cursor;
}

// ── Super ring ────────────────────────────────────────────────────────────────

interface SuperRingProps {
  categories: CategoryMetrics[];
}

function SuperRing({ categories }: SuperRingProps) {
  const size = 180;
  const sw   = 14;
  const r    = (size - sw) / 2;
  const cx   = size / 2;
  const cy   = size / 2;
  const C    = 2 * Math.PI * r; // full circumference

  const totalHabits = categories.reduce((s, c) => s + c.habitCount, 0);
  if (totalHabits === 0) return null;

  // Overall weighted score
  const overall = categories.reduce((s, c) => s + c.habitCount * c.score, 0) / totalHabits;
  const overallPct = Math.round(overall * 100);

  // Each category's contribution = (habits in cat that are "done") / total habits
  // Arc length for that category = contribution * circumference
  // They're stacked from 12-o'clock (cursor starts at 0)
  let cursor = 0;
  const segments = categories
    .filter(c => c.habitCount > 0 && c.score > 0)
    .map(cat => {
      const contribution = (cat.habitCount / totalHabits) * cat.score;
      const arcLen = contribution * C - GAP_PX;
      const start  = cursor;
      cursor += contribution * C;
      return { cat, arcLen, start };
    });

  return (
    <div className={styles.superRingWrapper} style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ display: 'block' }}>
        {/* Full background track */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="rgba(255,255,255,0.05)" strokeWidth={sw} />

        {/* Stacked completed arcs, each in its category color */}
        {segments.map(({ cat, arcLen, start }) => (
          <circle
            key={cat.category}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={cat.color}
            strokeWidth={sw}
            strokeDasharray={dash(arcLen, C)}
            strokeDashoffset={offset(start, C)}
            strokeLinecap="butt"
            style={{ filter: `drop-shadow(0 0 6px ${cat.color}55)` }}
          />
        ))}
      </svg>

      {/* Center label */}
      <div className={styles.superRingCenter}>
        <span className={styles.superRingPct}>{overallPct}%</span>
        <span className={styles.superRingLabel}>overall</span>
      </div>
    </div>
  );
}

// ── Individual ring ───────────────────────────────────────────────────────────

interface SmallRingProps {
  category: CategoryMetrics;
  isSelected: boolean;
  onClick: () => void;
}

function SmallRing({ category: cat, isSelected, onClick }: SmallRingProps) {
  const size = 60;
  const sw   = 6;
  const r    = (size - sw) / 2;
  const cx   = size / 2;
  const cy   = size / 2;
  const C    = 2 * Math.PI * r;
  const filled = cat.score * C;
  const pct  = Math.round(cat.score * 100);

  return (
    <button
      className={`${styles.ringItem} ${isSelected ? styles.ringItemSelected : ''}`}
      onClick={onClick}
      title={`${cat.label}: ${pct}%`}
    >
      <svg width={size} height={size} style={{ display: 'block' }}>
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="rgba(255,255,255,0.07)" strokeWidth={sw} />
        {/* Fill */}
        {filled > 0.5 && (
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={cat.color}
            strokeWidth={sw}
            strokeDasharray={dash(filled, C)}
            strokeDashoffset={C / 4}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 5px ${cat.color}60)` }}
          />
        )}
        {/* Center percentage */}
        <text
          x={cx} y={cy + 4}
          textAnchor="middle"
          fill={pct >= 70 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)'}
          fontSize="12"
          fontWeight="700"
          fontFamily="inherit"
        >
          {pct}
        </text>
      </svg>
      <span className={styles.ringItemLabel}>{cat.label}</span>
    </button>
  );
}

// ── Exported component ────────────────────────────────────────────────────────

interface Props {
  categories: CategoryMetrics[];
  selectedCategory: string | null;
  onSelect: (cat: string | null) => void;
}

export function CategoryRings({ categories, selectedCategory, onSelect }: Props) {
  if (categories.length === 0) return null;

  return (
    <div className={styles.ringsSection}>
      {/* Super ring */}
      <SuperRing categories={categories} />

      {/* Individual category rings */}
      <div className={styles.individualRings}>
        {categories.map(cat => (
          <SmallRing
            key={cat.category}
            category={cat}
            isSelected={selectedCategory === cat.category}
            onClick={() => onSelect(selectedCategory === cat.category ? null : cat.category)}
          />
        ))}
      </div>
    </div>
  );
}
