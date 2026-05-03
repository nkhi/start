import React from 'react';
import type { SpendingBudget } from '../../types';
import { formatCurrency } from './utils';
import styles from './Spending.module.css';

interface SpendingSummaryProps {
  totalBudget: number;
  totalSpent: number;
  spentByBudget: Record<string, number>;
  budgets: SpendingBudget[];
}

export function SpendingSummary({ totalBudget, totalSpent, spentByBudget, budgets }: SpendingSummaryProps) {
  const remaining = Math.max(0, totalBudget - totalSpent);
  const isOverBudget = totalSpent > totalBudget;

  // Calculate segments
  // We want to show a segment for each budget that has spending
  const barTotal = Math.max(totalBudget, totalSpent);
  if (barTotal === 0) return null;

  const getPct = (val: number) => (val / barTotal) * 100;

  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const targetSpent = (totalBudget / daysInMonth) * currentDay;

  const goodSpent = Math.min(totalSpent, targetSpent);
  const excessSpent = Math.max(0, totalSpent - targetSpent);

  return (
    <div className={styles.summaryContainer}>
      <div className={styles.summaryStats}>
        <div className={styles.summaryStatItem}>
          <span className={styles.statLabel}>Spent</span>
          <span className={styles.statValue}>{formatCurrency(totalSpent)}</span>
        </div>
        <div className={styles.summaryStatItem}>
          <span className={styles.statLabel}>{isOverBudget ? 'Over' : 'Remaining'}</span>
          <span className={`${styles.statValue} ${isOverBudget ? styles.overBudget : ''}`}>
            {formatCurrency(isOverBudget ? totalSpent - totalBudget : remaining)}
          </span>
        </div>
      </div>

      <div className={styles.summaryStatusBar}>
        {/* Good spending (within target) */}
        {goodSpent > 0 && (
          <div
            className={styles.summaryStatusSegment}
            style={{
              width: `${getPct(goodSpent)}%`,
              backgroundColor: '#34D399' // Green
            }}
            title={`Within target: ${formatCurrency(goodSpent)}`}
          />
        )}

        {/* Excess spending (above target) */}
        {excessSpent > 0 && (
          <div
            className={styles.summaryStatusSegment}
            style={{
              width: `${getPct(excessSpent)}%`,
              backgroundColor: '#FF3B30' // Red
            }}
            title={`Excess spending: ${formatCurrency(excessSpent)}`}
          />
        )}

        {/* Remaining budget segment */}
        {!isOverBudget && (
          <div
            className={styles.summaryStatusSegment}
            style={{
              width: `${getPct(remaining)}%`,
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }}
            title={`Remaining: ${formatCurrency(remaining)}`}
          />
        )}
      </div>
    </div>
  );
}
