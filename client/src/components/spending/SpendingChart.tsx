import React from 'react';
import type { SpendingBudget } from '../../types';
import styles from './SpendingChart.module.css';

interface SpendingChartProps {
  daysInMonth: string[];
  dayTotals: { totals: Record<string, number>; max: number };
  dayTotalsByBudget: Record<string, Record<string, number>>;
  dailyLimit: number;
  budgets: SpendingBudget[];
  onHoverDate: (dateStr: string | null, position: { x: number; y: number } | null) => void;
}

function getBudgetColorClass(dayTotal: number, dailyLimit: number) {
  if (dayTotal === 0) return '';
  if (dayTotal <= dailyLimit) return styles.budgetGreen;
  if (dayTotal <= dailyLimit * 1.25) return styles.budgetYellow;
  return styles.budgetRed;
}

export function SpendingChart({
  daysInMonth,
  dayTotals,
  dayTotalsByBudget,
  dailyLimit,
  budgets,
  onHoverDate,
}: SpendingChartProps) {
  return (
    <div className={styles.bottomPane}>
      {daysInMonth.map(dateStr => {
        const total = dayTotals.totals[dateStr];
        // Minimum 2% height so empty days still show a tiny sliver
        const heightPercent = dayTotals.max > 0 ? Math.max((total / dayTotals.max) * 100, 2) : 2;
        const colorClass = getBudgetColorClass(total, dailyLimit);

        // Parse date for the label underneath
        const d = new Date(dateStr);
        const localDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
        const dayLabel = localDate.getDate();

        return (
          <div key={dateStr} className={styles.chartBarWrapper}>
            <div
              className={`${styles.chartBarContainer} ${colorClass}`}
              style={{ height: `${heightPercent}%` }}
              onPointerEnter={(e) => {
                onHoverDate(dateStr, { x: e.clientX, y: e.clientY });
              }}
              onPointerMove={(e) => {
                onHoverDate(dateStr, { x: e.clientX, y: e.clientY });
              }}
              onPointerLeave={() => {
                onHoverDate(null, null);
              }}
            >
              {/* Render a segment for each budget that has spending today */}
              {budgets.map(b => {
                const bAmount = dayTotalsByBudget[dateStr]?.[b.id] || 0;
                if (bAmount === 0 || total === 0) return null;
                const segmentHeightPercent = (bAmount / total) * 100;
                return (
                  <div
                    key={b.id}
                    className={styles.chartBarSegment}
                    style={{ height: `${segmentHeightPercent}%` }}
                  />
                );
              })}
            </div>
            <div className={styles.chartBarLabel}>{dayLabel}</div>
          </div>
        );
      })}
    </div>
  );
}
