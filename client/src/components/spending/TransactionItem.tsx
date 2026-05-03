import React, { useState } from 'react';
import { Trash } from '@phosphor-icons/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SpendingTransaction, SpendingBudget } from '../../types';
import { formatCurrency } from './utils';
import styles from './TransactionItem.module.css';

interface TransactionItemProps {
  t: SpendingTransaction;
  budgets: SpendingBudget[];
  onEdit?: (t: SpendingTransaction, updates: Partial<SpendingTransaction>) => void;
  onDelete?: (id: string) => void;
}

export function TransactionItem({ t, budgets, onEdit, onDelete }: TransactionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `transaction-${t.id}`,
    data: { type: 'transaction', transaction: t }
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(t.name);
  const [editAmount, setEditAmount] = useState(t.amount.toString());
  const [editNote, setEditNote] = useState(t.note || '');
  const [editBudgetId, setEditBudgetId] = useState(t.budgetId || (budgets.length > 0 ? budgets[0].id : ''));

  const saveChanges = () => {
    setIsEditing(false);
    const newAmt = parseFloat(editAmount);
    if (onEdit && (editName !== t.name || (editNote || null) !== t.note || editBudgetId !== t.budgetId || (!isNaN(newAmt) && newAmt !== t.amount))) {
      onEdit(t, {
        name: editName,
        note: editNote || undefined,
        amount: !isNaN(newAmt) ? newAmt : t.amount,
        budgetId: editBudgetId
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveChanges();
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(t.name);
      setEditAmount(t.amount.toString());
      setEditNote(t.note || '');
      setEditBudgetId(t.budgetId || (budgets.length > 0 ? budgets[0].id : ''));
    }
  };

  if (isEditing) {
    return (
      <div className={`${styles.transactionItem} ${styles.editModeContainer}`}>
        <div className={styles.editInputsRow}>
          <input
            autoFocus
            className={styles.editInput}
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={saveChanges}
            onPointerDown={e => e.stopPropagation()}
          />
          <input
            className={`${styles.editInput} ${styles.editAmount}`}
            type="number"
            step="0.01"
            value={editAmount}
            onChange={e => setEditAmount(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={saveChanges}
            onPointerDown={e => e.stopPropagation()}
          />
        </div>
        <div className={`${styles.editInputsRow} ${budgets.length > 1 ? styles.editInputsRowStacked : ''}`}>
          {budgets.length > 1 && (
            <select
              className={`${styles.editInput} ${styles.editNote} ${styles.selectInput} ${styles.budgetSelect}`}
              value={editBudgetId}
              onChange={e => setEditBudgetId(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={saveChanges}
              onPointerDown={e => e.stopPropagation()}
            >
              {budgets.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
          <input
            className={`${styles.editInput} ${styles.editNote} ${styles.editNoteInput}`}
            placeholder="Add note..."
            value={editNote}
            onChange={e => setEditNote(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={saveChanges}
            onPointerDown={e => e.stopPropagation()}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.draggableTransactionWrapper} ${isDragging ? styles.draggingItem : ''}`}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (!onEdit) return;
        e.stopPropagation();
        setIsEditing(true);
      }}
    >
      <div className={styles.transactionItem}>
        <div className={styles.itemMain}>
          <div className={styles.itemName}>{t.name}</div>
          <div className={styles.itemAmount}>{formatCurrency(t.amount)}</div>
        </div>
        {t.note && <div className={styles.itemNote}>{t.note}</div>}
        {onDelete && (
          <button
            className={styles.itemDeleteBtn}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(t.id);
            }}
            onPointerDown={e => e.stopPropagation()}
          >
            <Trash weight="bold" />
          </button>
        )}
      </div>
    </div>
  );
}
