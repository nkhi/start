/**
 * StateDistributionBar
 *
 * A thin stacked horizontal bar showing the proportion of each habit state.
 * Used in HabitHealthCards and CategoryScoreCards.
 *
 * Segments left→right: Done (1) | Exception (3) | Partial (4) | Failed (2) | Not logged (0)
 */

import styles from '../InsightsDashboard.module.css';

interface Props {
  stateProps: { s1: number; s3: number; s4: number; s2: number; s0: number };
  height?: number;
  showLabels?: boolean;
}

const SEGMENTS = [
  { key: 's1' as const, color: '#10b981', label: 'Done'      },
  { key: 's3' as const, color: '#14b8a6', label: 'Exception' },
  { key: 's4' as const, color: '#f59e0b', label: 'Partial'   },
  { key: 's2' as const, color: '#dc2626', label: 'Failed'    },
  { key: 's0' as const, color: '#2a2a2a', label: 'No log'    },
];

export function StateDistributionBar({ stateProps, height = 4, showLabels = false }: Props) {
  const total = stateProps.s1 + stateProps.s3 + stateProps.s4 + stateProps.s2 + stateProps.s0;
  if (total === 0) {
    return <div className={styles.distBar} style={{ height, background: '#1f1f1f', borderRadius: 999 }} />;
  }

  return (
    <div className={styles.distBarWrapper}>
      <div className={styles.distBar} style={{ height, borderRadius: height / 2 }}>
        {SEGMENTS.map(seg => {
          const pct = (stateProps[seg.key] / total) * 100;
          if (pct < 0.5) return null;
          return (
            <div
              key={seg.key}
              className={styles.distBarSegment}
              style={{ width: `${pct}%`, background: seg.color }}
              title={`${seg.label}: ${Math.round(pct)}%`}
            />
          );
        })}
      </div>
      {showLabels && (
        <div className={styles.distBarLabels}>
          {SEGMENTS.map(seg => {
            const pct = (stateProps[seg.key] / total) * 100;
            if (pct < 5) return null;
            return (
              <span key={seg.key} style={{ color: seg.color, fontSize: 10 }}>
                {Math.round(pct)}%
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
