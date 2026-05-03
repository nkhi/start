import React from 'react';
import type { SpendingBudget } from '../../types';
import styles from './SpendingChart.module.css';

interface SpendingChartProps {
  daysInMonth: string[];
  dayTotals: { totals: Record<string, number>; max: number };
  dayTotalsByBudget: Record<string, Record<string, number>>;
  dailyLimit: number;
  budgets: SpendingBudget[];
  isCumulative: boolean;
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
  isCumulative,
  onHoverDate,
}: SpendingChartProps) {
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  
  // Calculate data for each day
  const chartData = daysInMonth.map((dateStr, index) => {
    let spentValue = 0;
    let targetValue = 0;
    
    if (isCumulative) {
      // Cumulative spent until today
      for (let i = 0; i <= index; i++) {
        spentValue += dayTotals.totals[daysInMonth[i]] || 0;
      }
      targetValue = dailyLimit * (index + 1);
    } else {
      // Daily spent today
      spentValue = dayTotals.totals[dateStr] || 0;
      targetValue = dailyLimit;
    }
    
    return {
      dateStr,
      spentValue,
      targetValue,
      dailyTotal: dayTotals.totals[dateStr] || 0
    };
  });

  const maxVal = isCumulative 
    ? Math.max(totalBudget, ...chartData.map(d => d.spentValue), 1)
    : Math.max(dayTotals.max, dailyLimit, 1);

  return (
    <div className={styles.bottomPane}>
      {chartData.map((data, index) => {
        const { dateStr, spentValue, targetValue, dailyTotal } = data;
        
        const spentHeight = (spentValue / maxVal) * 100;
        const ghostHeight = (targetValue / maxVal) * 100;
        
        const colorClass = getBudgetColorClass(dailyTotal, dailyLimit);

        // Parse date for the label underneath
        const d = new Date(dateStr);
        const localDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
        const dayLabel = localDate.getDate();

        return (
          <div key={dateStr} className={styles.chartBarWrapper}>
            <div className={styles.barsContainer}>
              {/* Ghost Placeholder (Target) */}
              <div 
                className={`${styles.ghostBar} ${colorClass} ${dailyTotal > 0 ? styles.hasTransactions : ''}`} 
                style={{ height: `${ghostHeight}%` }}
              />
              
              {/* Actual Spending */}
              <div
                className={`${styles.chartBarContainer} ${colorClass}`}
                style={{ height: `${spentHeight}%` }}
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
                {budgets.map(b => {
                  let bVal = 0;
                  if (isCumulative) {
                    for (let i = 0; i <= index; i++) {
                      bVal += dayTotalsByBudget[daysInMonth[i]]?.[b.id] || 0;
                    }
                  } else {
                    bVal = dayTotalsByBudget[dateStr]?.[b.id] || 0;
                  }
                  
                  if (bVal === 0 || spentValue === 0) return null;
                  const segmentHeightPercent = (bVal / spentValue) * 100;
                  return (
                    <div
                      key={b.id}
                      className={styles.chartBarSegment}
                      style={{ height: `${segmentHeightPercent}%` }}
                    />
                  );
                })}
              </div>
            </div>
            <div className={styles.chartBarLabel}>{dayLabel}</div>
          </div>
        );
      })}
    </div>
  );
}
