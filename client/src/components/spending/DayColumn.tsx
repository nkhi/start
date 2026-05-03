import React, { useState, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { SpendingTransaction, SpendingBudget } from '../../types';
import { TransactionItem } from './TransactionItem';
import { formatCurrency } from './utils';
import styles from './DayColumn.module.css';

interface DayColumnProps {
  dateStr: string;
  dateObj: Date;
  transactions: SpendingTransaction[];
  isToday: boolean;
  dailyLimit: number;
  budgets: SpendingBudget[];
  onEdit?: (t: SpendingTransaction, updates: Partial<SpendingTransaction>) => void;
  onDelete?: (id: string) => void;
  onAdd: (dateStr: string, name: string, amount: number, budgetId: string) => void;
}

function getBudgetColorClass(dayTotal: number, dailyLimit: number) {
  if (dayTotal === 0) return '';
  if (dayTotal <= dailyLimit) return styles.budgetGreen;
  if (dayTotal <= dailyLimit * 1.25) return styles.budgetYellow;
  return styles.budgetRed;
}

export function DayColumn({ 
  dateStr, 
  dateObj, 
  transactions, 
  isToday, 
  dailyLimit, 
  budgets, 
  onEdit, 
  onDelete, 
  onAdd 
}: DayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateStr}`,
    data: { type: 'dayColumn', dateStr }
  });

  const displayDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const dayTotal = transactions.reduce((sum, t) => sum + t.amount, 0);
  const colorClass = getBudgetColorClass(dayTotal, dailyLimit);

  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newBudgetId, setNewBudgetId] = useState(budgets.length > 0 ? budgets[0].id : '');

  useEffect(() => {
    if (!newBudgetId && budgets.length > 0) {
      setNewBudgetId(budgets[0].id);
    }
  }, [budgets, newBudgetId]);

  const handleAdd = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const amt = parseFloat(newAmount);
      if (newName.trim() && !isNaN(amt)) {
        onAdd(dateStr, newName.trim(), amt, newBudgetId);
        setNewName('');
        setNewAmount('');
      }
    }
  };

  return (
    <div
      ref={setNodeRef}
      id={`day-col-${dateStr}`}
      className={`${styles.dayColumn} ${isToday ? styles.isToday : ''} ${isOver ? styles.dropTarget : ''} ${colorClass}`}
    >
      <div className={styles.dayHeader}>
        <span className={styles.dayTitle}>{displayDate}</span>
        <span className={styles.dayTotal}>{formatCurrency(dayTotal)}</span>
      </div>

      <SortableContext
        items={transactions.map(t => `transaction-${t.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className={styles.dayItems}>
          {transactions.map(t => (
            <TransactionItem key={t.id} t={t} budgets={budgets} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      </SortableContext>

      <div className={`${styles.inlineAddContainer} ${budgets.length > 1 ? styles.inlineAddContainerWrapped : ''}`}>
        <input
          className={`${styles.inlineAddInput} ${styles.inlineAddName}`}
          placeholder="Add item..."
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={handleAdd}
        />
        <input
          className={`${styles.inlineAddInput} ${styles.inlineAddAmount}`}
          type="number"
          inputMode="decimal"
          step="0.01"
          placeholder="0.00"
          value={newAmount}
          onChange={e => setNewAmount(e.target.value)}
          onKeyDown={handleAdd}
        />
        {budgets.length > 1 && (
          <select
            className={`${styles.inlineAddInput} ${styles.selectInput} ${styles.inlineBudgetSelect}`}
            value={newBudgetId}
            onChange={e => setNewBudgetId(e.target.value)}
            onKeyDown={handleAdd}
          >
            {budgets.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
