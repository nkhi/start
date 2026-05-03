import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { CaretLeft, CaretRight, Trash } from '@phosphor-icons/react';
import { 
  DndContext, 
  DragOverlay, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  useDroppable, 
  pointerWithin, 
  type DragStartEvent, 
  type DragEndEvent 
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { 
  useSpendingMonth, 
  useCreateTransaction, 
  useDeleteTransaction, 
  useUpdateTransaction 
} from '../../api/spending';
import type { SpendingTransaction } from '../../types';
import { generateId } from '../../utils';
import styles from './Spending.module.css';


// ==========================================
// Utilities
// ==========================================

const formatCurrency = (val: number) => {
  return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function getBudgetColorClass(dayTotal: number, dailyLimit: number) {
  if (dayTotal === 0) return ''; // Default no border if 0
  if (dayTotal <= dailyLimit) return styles.budgetGreen;
  if (dayTotal <= dailyLimit * 1.25) return styles.budgetYellow;
  return styles.budgetRed;
}

// ==========================================
// Draggable Transaction Item
// ==========================================

function DraggableTransaction({ t, onEdit, onDelete }: { t: SpendingTransaction, onEdit: (t: SpendingTransaction, updates: Partial<SpendingTransaction>) => void, onDelete: (id: string) => void }) {
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

  const saveChanges = () => {
    setIsEditing(false);
    const newAmt = parseFloat(editAmount);
    if (editName !== t.name || (editNote || null) !== t.note || (!isNaN(newAmt) && newAmt !== t.amount)) {
      onEdit(t, {
        name: editName,
        note: editNote || undefined,
        amount: !isNaN(newAmt) ? newAmt : t.amount
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
        <input 
           className={`${styles.editInput} ${styles.editNote}`} 
           placeholder="Add note..."
           value={editNote} 
           onChange={e => setEditNote(e.target.value)} 
           onKeyDown={handleKeyDown}
           onBlur={saveChanges}
           onPointerDown={e => e.stopPropagation()}
        />
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
      </div>
    </div>
  );
}

// ==========================================
// Droppable Day Column
// ==========================================

function DayColumn({ dateStr, dateObj, transactions, isToday, dailyLimit, onEdit, onDelete, onAdd }: { 
    dateStr: string, 
    dateObj: Date, 
    transactions: SpendingTransaction[],
    isToday: boolean,
    dailyLimit: number,
    onEdit: (t: SpendingTransaction, updates: Partial<SpendingTransaction>) => void,
    onDelete: (id: string) => void,
    onAdd: (dateStr: string, name: string, amount: number) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateStr}`,
    data: { type: 'dayColumn', dateStr }
  });

  const displayDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const dayTotal = transactions.reduce((sum, t) => sum + t.amount, 0);
  const colorClass = getBudgetColorClass(dayTotal, dailyLimit);

  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const handleAdd = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const amt = parseFloat(newAmount);
      if (newName.trim() && !isNaN(amt)) {
        onAdd(dateStr, newName.trim(), amt);
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
                    <DraggableTransaction key={t.id} t={t} onEdit={onEdit} onDelete={onDelete} />
                ))}
            </div>
        </SortableContext>

        <div className={styles.inlineAddContainer}>
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
            step="0.01" 
            placeholder="0.00" 
            value={newAmount}
            onChange={e => setNewAmount(e.target.value)}
            onKeyDown={handleAdd}
          />
        </div>
    </div>
  );
}

// ==========================================
// Main Component
// ==========================================

export function Spending() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTransaction, setActiveTransaction] = useState<SpendingTransaction | null>(null);
  
  const topPaneRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const displayMonthStr = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const { data } = useSpendingMonth(currentMonthStr);
  const createMutation = useCreateTransaction();
  const deleteMutation = useDeleteTransaction();
  const updateMutation = useUpdateTransaction();

  const transactions = data?.transactions || [];

  // Generate all days in the month
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    
    const result = [];
    for (let i = 1; i <= days; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        result.push(dateStr);
    }
    return result;
  }, [currentDate]);

  const DAILY_LIMIT = daysInMonth.length > 0 ? MONTHLY_BUDGET / daysInMonth.length : 0;

  const groupedTransactions = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const groups: Record<string, SpendingTransaction[]> = {};
    for (const t of sorted) {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    }
    return groups;
  }, [transactions]);

  // Calculate day totals for the chart
  const dayTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    let max = 0;
    for (const dateStr of daysInMonth) {
      const dayTotal = (groupedTransactions[dateStr] || []).reduce((sum, t) => sum + t.amount, 0);
      totals[dateStr] = dayTotal;
      if (dayTotal > max) max = dayTotal;
    }
    return { totals, max };
  }, [daysInMonth, groupedTransactions]);

  // Auto-Scroll to Today
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

  const handleAddTransaction = (dateStr: string, name: string, amount: number) => {
    createMutation.mutate({
      id: generateId(),
      date: dateStr,
      name,
      amount,
    });
  };

  // DND Handlers
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
        {/* Top Pane: Ledger */}
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
                            dailyLimit={DAILY_LIMIT}
                            transactions={groupedTransactions[dateStr] || []}
                            onEdit={(t, updates) => updateMutation.mutate({ id: t.id, updates })}
                            onDelete={(id) => deleteMutation.mutate(id)}
                            onAdd={handleAddTransaction}
                        />
                    );
                })}

                <div className={styles.monthNavContainer}>
                    <button className={styles.monthNavBtn} onClick={handlePrevMonth}><CaretLeft weight="bold" /></button>
                    <div className={styles.monthNavLabel} onClick={handleScrollToToday}>
                        {displayMonthStr}
                    </div>
                    <button className={styles.monthNavBtn} onClick={handleNextMonth}><CaretRight weight="bold" /></button>
                </div>
            </div>

            <DragOverlay>
                {activeTransaction ? (
                    <div className={`${styles.transactionItem} ${styles.dragOverlay}`}>
                        <div className={styles.itemMain}>
                            <div className={styles.itemName}>{activeTransaction.name}</div>
                            <div className={styles.itemAmount}>{formatCurrency(activeTransaction.amount)}</div>
                        </div>
                        {activeTransaction.note && <div className={styles.itemNote}>{activeTransaction.note}</div>}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>

        {/* Bottom Pane: Visualization */}
        <div className={styles.bottomPane}>
            {daysInMonth.map(dateStr => {
                const total = dayTotals.totals[dateStr];
                // Minimum 2% height so empty days still show a tiny sliver, or 0 if preferred. Let's do 2% so it looks continuous.
                const heightPercent = dayTotals.max > 0 ? Math.max((total / dayTotals.max) * 100, 2) : 2;
                const colorClass = getBudgetColorClass(total, DAILY_LIMIT);
                
                // Parse date for the label underneath
                const d = new Date(dateStr);
                const localDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
                const dayLabel = localDate.getDate();

                return (
                    <div key={dateStr} className={styles.chartBarWrapper}>
                        <div 
                            className={`${styles.chartBar} ${colorClass}`} 
                            style={{ height: `${heightPercent}%` }}
                        />
                        <div className={styles.chartBarLabel}>{dayLabel}</div>
                    </div>
                );
            })}
        </div>
    </div>
  );
}
