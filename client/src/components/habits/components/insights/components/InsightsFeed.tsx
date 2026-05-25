import type { InsightFeedItem } from '../useInsightsData';
import styles from '../InsightsDashboard.module.css';

interface Props {
  items: InsightFeedItem[];
}

const TYPE_BORDER: Record<InsightFeedItem['type'], string> = {
  achievement: '#10b981',
  warning:     '#f59e0b',
  pattern:     '#6366f1',
  info:        '#38bdf8',
};

export function InsightsFeed({ items }: Props) {
  return (
    <>
      <div className={styles.sectionTitle}>Insights</div>
      {items.length === 0 ? (
        <div className={styles.feedEmpty}>
          Not enough data yet — check back after a few more days.
        </div>
      ) : (
        <div className={styles.feedGrid}>
          {items.map(item => (
            <div
              key={item.id}
              className={styles.feedCard}
              style={{ borderLeftColor: TYPE_BORDER[item.type] }}
            >
              <div className={styles.feedCardTop}>
                <span className={styles.feedIcon}>{item.icon}</span>
                <span className={styles.feedHeadline}>{item.headline}</span>
              </div>
              <p className={styles.feedDetail}>{item.detail}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
