import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { CaretLeft, CaretRight, Coin, Coins } from '@phosphor-icons/react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent
} from '@dnd-kit/core';

import {
  useSpendingMonth,
  useCreateTransaction,
  useDeleteTransaction,
  useUpdateTransaction
} from '../../api/spending';
import type { SpendingTransaction } from '../../types';
import { generateId } from '../../utils';

import { formatCurrency } from './utils';
import { useSpendingData } from './hooks/useSpendingData';
import { DayColumn } from './DayColumn';
import { SpendingChart } from './SpendingChart';
import { SpendingTooltips } from './SpendingTooltips';
import { SpendingSummary } from './SpendingSummary';

import styles from './Spending.module.css';
import transactionStyles from './TransactionItem.module.css';

interface SpendingProps {
  workMode?: boolean;
}

export function Spending({ workMode = false }: SpendingProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTransaction, setActiveTransaction] = useState<SpendingTransaction | null>(null);
  const [sessionTransactions, setSessionTransactions] = useState<SpendingTransaction[]>([]);
  const [isCumulative, setIsCumulative] = useState(true);

  const topPaneRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const displayMonthStr = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const { data } = useSpendingMonth(currentMonthStr, workMode);
  const createMutation = useCreateTransaction();
  const deleteMutation = useDeleteTransaction();
  const updateMutation = useUpdateTransaction();

  const transactions = [...(data?.transactions || []), ...sessionTransactions];
  const budgets = data?.budgets || [];

  const {
    daysInMonth,
    dailyLimit,
    groupedTransactions,
    dayTotals,
    dayTotalsByBudget,
    totalBudget,
    totalSpent,
    spentByBudget
  } = useSpendingData(currentDate, transactions, budgets);

  /**
   * We automatically scroll the user to the current date column to orient them
   * when they load the app. If they are viewing a past/future month, we scroll
   * them to the end of the month instead. We only do this once per month-view change
   * to avoid stealing scroll control from the user.
   */
  useLayoutEffect(() => {
    if (!topPaneRef.current || hasScrolled || daysInMonth.length === 0) return;

    const todayStr = new Date().toISOString().split('T')[0];
    let targetDateStr = todayStr;

    const isCurrentMonth = new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();
    if (!isCurrentMonth) {
      targetDateStr = daysInMonth[daysInMonth.length - 1];
    }

    const el = document.getElementById(`day-col-${targetDateStr}`);
    if (el && topPaneRef.current) {
      const containerCenter = topPaneRef.current.clientWidth / 2;
      const elCenter = el.offsetLeft + (el.clientWidth / 2);
      topPaneRef.current.scrollTo({
        left: elCenter - containerCenter,
        behavior: 'smooth'
      });
      setHasScrolled(true);
    }
  }, [daysInMonth, currentDate, hasScrolled]);

  useEffect(() => {
    setHasScrolled(false);
  }, [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const handleScrollToToday = () => {
    setCurrentDate(new Date());
  };

  const handleAddTransaction = (dateStr: string, name: string, amount: number, budgetId: string) => {
    const newId = generateId();
    createMutation.mutate({
      id: newId,
      date: dateStr,
      name,
      amount,
      budgetId
    });

    if (workMode) {
      setSessionTransactions(prev => [...prev, {
        id: newId,
        date: dateStr,
        name,
        amount,
        budgetId,
        note: null,
        createdAt: new Date().toISOString()
      }]);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'transaction') {
      setActiveTransaction(active.data.current.transaction);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTransaction(null);
    const { active, over } = event;

    if (!over) return;

    const activeTransaction = active.data.current?.transaction as SpendingTransaction;
    if (!activeTransaction) return;

    let targetDateStr: string | null = null;

    if (over.data.current?.type === 'dayColumn') {
      targetDateStr = over.data.current.dateStr;
    } else if (over.data.current?.type === 'transaction') {
      targetDateStr = over.data.current.transaction.date;
    }

    if (targetDateStr && targetDateStr !== activeTransaction.date) {
      updateMutation.mutate({
        id: activeTransaction.id,
        updates: { date: targetDateStr }
      });
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className={styles.splitContainer}>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >




        <div className={styles.topPane} ref={topPaneRef}>
          {daysInMonth.map(dateStr => {
            const d = new Date(dateStr);
            const localDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);

            return (
              <DayColumn
                key={dateStr}
                dateStr={dateStr}
                dateObj={localDate}
                isToday={dateStr === todayStr}
                dailyLimit={dailyLimit}
                budgets={budgets}
                transactions={groupedTransactions[dateStr] || []}
                onEdit={workMode ? undefined : (t, updates) => updateMutation.mutate({ id: t.id, updates })}
                onDelete={workMode ? undefined : (id) => deleteMutation.mutate(id)}
                onAdd={handleAddTransaction}
              />
            );
          })}
        </div>

        <div className={styles.controlsRow}>
          <div className={styles.controlsWrapper}>
            <div className={styles.monthNavContainer}>
              <button className={styles.monthNavBtn} onClick={handlePrevMonth}><CaretLeft size={18} weight="bold" /></button>
              <div className={styles.monthNavLabel} onClick={handleScrollToToday}>
                {displayMonthStr}
              </div>
              <button className={styles.monthNavBtn} onClick={handleNextMonth}><CaretRight size={18} weight="bold" /></button>
            </div>

            <div className={styles.chartToggleContainer}>
              <button
                className={styles.chartToggleBtn}
                onClick={() => setIsCumulative(!isCumulative)}
                title={isCumulative ? "Show Daily View" : "Show Cumulative View"}
              >
                {isCumulative ? <Coin size={18} weight="duotone" /> : <Coins size={18} weight="duotone" />}
                <span className={styles.toggleLabel}>
                  {isCumulative ? "Show Daily View" : "Show Cumulative View"}
                </span>
              </button>
            </div>
          </div>

          <SpendingSummary
            totalBudget={totalBudget}
            totalSpent={totalSpent}
            spentByBudget={spentByBudget}
            budgets={budgets}
          />
        </div>

        <SpendingChart
          daysInMonth={daysInMonth}
          dayTotals={dayTotals}
          dayTotalsByBudget={dayTotalsByBudget}
          dailyLimit={dailyLimit}
          budgets={budgets}
          isCumulative={isCumulative}
          onHoverDate={(dateStr, position) => {
            setHoveredDate(dateStr);
            setTooltipPosition(position);
          }}
        />




        <DragOverlay>
          {activeTransaction ? (
            <div className={`${transactionStyles.transactionItem} ${transactionStyles.dragOverlay}`}>
              <div className={transactionStyles.itemMain}>
                <div className={transactionStyles.itemName}>{activeTransaction.name}</div>
                <div className={transactionStyles.itemAmount}>{formatCurrency(activeTransaction.amount)}</div>
              </div>
              {activeTransaction.note && <div className={transactionStyles.itemNote}>{activeTransaction.note}</div>}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <SpendingTooltips
        hoveredDate={hoveredDate}
        tooltipPosition={tooltipPosition}
        budgets={budgets}
        dayTotalsByBudget={dayTotalsByBudget}
      />
    </div>
  );
}
