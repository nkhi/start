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

const BUDGET_COLORS = [
  '#34D399', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
];

export function SpendingSummary({ totalBudget, totalSpent, spentByBudget, budgets }: SpendingSummaryProps) {
  const remaining = Math.max(0, totalBudget - totalSpent);
  const isOverBudget = totalSpent > totalBudget;
  
  // Calculate segments
  // We want to show a segment for each budget that has spending
  const barTotal = Math.max(totalBudget, totalSpent);
  if (barTotal === 0) return null;

  const getPct = (val: number) => (val / barTotal) * 100;

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
        {budgets.map((budget, index) => {
          const spent = spentByBudget[budget.id] || 0;
          if (spent === 0) return null;
          return (
            <div
              key={budget.id}
              className={styles.summaryStatusSegment}
              style={{ 
                width: `${getPct(spent)}%`, 
                backgroundColor: BUDGET_COLORS[index % BUDGET_COLORS.length] 
              }}
              title={`${budget.name}: ${formatCurrency(spent)}`}
            />
          );
        })}
        {/* Unassigned spending */}
        {spentByBudget['unassigned'] > 0 && (
          <div
            className={styles.summaryStatusSegment}
            style={{ 
              width: `${getPct(spentByBudget['unassigned'])}%`, 
              backgroundColor: 'rgba(255, 255, 255, 0.4)' 
            }}
            title={`Unassigned: ${formatCurrency(spentByBudget['unassigned'])}`}
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
