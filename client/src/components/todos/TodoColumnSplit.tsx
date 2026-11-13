import React, { useCallback, useLayoutEffect, useRef } from 'react';
import styles from './Todos.module.css';

interface TodoColumnSplitProps {
  isMobile: boolean;
  showLife: boolean;
  showWork: boolean;
  isLifeCollapsed: boolean;
  isWorkCollapsed: boolean;
  lifeCount: number;
  workCount: number;
  /** Value that changes whenever task content or accordion expansion changes */
  layoutSignature: string;
  lifeContent: React.ReactNode;
  workContent: React.ReactNode;
}

/**
 * Renders the Life and Work sections inside a todo day column.
 *
 * On desktop, uses the CSS flex layout as-is.
 * On mobile (vertical split), sizes each section to fit its content when under
 * half the available height, gives unused space to the other section, and caps
 * at a 50/50 split when both exceed half the height.
 */
export function TodoColumnSplit({
  isMobile,
  showLife,
  showWork,
  isLifeCollapsed,
  isWorkCollapsed,
  lifeCount,
  workCount,
  layoutSignature,
  lifeContent,
  workContent,
}: TodoColumnSplitProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const lifeRef = useRef<HTMLDivElement>(null);
  const workRef = useRef<HTMLDivElement>(null);

  const updateMobileSplit = useCallback(() => {
    const rowEl = rowRef.current;
    const lifeEl = lifeRef.current;
    const workEl = workRef.current;

    const resetStyles = (el: HTMLDivElement | null) => {
      if (!el) return;
      el.style.flex = '';
      el.style.height = '';
      el.style.marginTop = '';
    };

    if (!isMobile || !showLife || !showWork || !rowEl || !lifeEl || !workEl) {
      resetStyles(lifeEl);
      resetStyles(workEl);
      return;
    }

    const computed = getComputedStyle(rowEl);
    const padY = (parseFloat(computed.paddingTop) || 0) + (parseFloat(computed.paddingBottom) || 0);
    const gap = parseFloat(computed.rowGap) || 0;
    const availableHeight = rowEl.clientHeight - padY - gap;

    if (availableHeight <= 0) {
      resetStyles(lifeEl);
      resetStyles(workEl);
      return;
    }

    // Measure intrinsic content heights without fixed flex constraints
    lifeEl.style.flex = '0 0 auto';
    lifeEl.style.height = 'auto';
    lifeEl.style.marginTop = '';
    workEl.style.flex = '0 0 auto';
    workEl.style.height = 'auto';
    workEl.style.marginTop = '';

    const lifeNatural = lifeEl.offsetHeight;
    const workNatural = workEl.offsetHeight;

    if (lifeNatural + workNatural <= availableHeight) {
      if (workCount === 0 && lifeCount > 0) {
        workEl.style.marginTop = 'auto';
      }
      return;
    }

    const half = availableHeight / 2;
    const lifeHeight = Math.floor(Math.min(lifeNatural, Math.max(half, availableHeight - workNatural)));
    const workHeight = Math.floor(Math.min(workNatural, Math.max(half, availableHeight - lifeNatural)));

    lifeEl.style.flex = `0 0 ${lifeHeight}px`;
    workEl.style.flex = `0 0 ${workHeight}px`;
  }, [isMobile, showLife, showWork, lifeCount, workCount]);

  useLayoutEffect(() => {
    updateMobileSplit();
  }, [updateMobileSplit, layoutSignature]);

  useLayoutEffect(() => {
    if (!isMobile || !showLife || !showWork || !rowRef.current) return;

    const observer = new ResizeObserver(() => {
      updateMobileSplit();
    });
    observer.observe(rowRef.current);

    return () => observer.disconnect();
  }, [isMobile, showLife, showWork, updateMobileSplit]);

  return (
    <div ref={rowRef} className={styles.todoContentRow}>
      {showLife && (
        <div
          ref={lifeRef}
          className={`${styles.todoCategorySection} ${isLifeCollapsed ? styles.collapsedCategorySection : ''}`}
        >
          {lifeContent}
        </div>
      )}

      {showWork && (
        <div
          ref={workRef}
          className={`${styles.todoCategorySection} ${isWorkCollapsed ? styles.collapsedCategorySection : ''}`}
        >
          {workContent}
        </div>
      )}
    </div>
  );
}

