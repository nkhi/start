/**
 * TaskActionsOverlay Component
 * 
 * Hover menu for task actions (move to top, copy, punt, delete, graveyard).
 * Shows a three-dot icon that reveals action buttons on hover.
 * Uses a portal to render outside the task container for proper z-index.
 * 
 * ## Features:
 * - Smart positioning: renders left when near right edge
 * - Portal rendering: avoids z-index issues
 * - Hover delay: 200ms before showing, 100ms before hiding
 * 
 * ## Actions:
 * - Move to top: reorder task to top of its list
 * - Copy: copy task text to clipboard
 * - Punt: move task to next day
 * - Delete: permanently remove task
 * - Graveyard: archive task (can be resurrected)
 * 
 * ## Usage:
 * ```tsx
 * <TaskActionsOverlay
 *   onMoveToTop={() => ...}
 *   onPunt={() => ...}
 *   onDelete={() => ...}
 *   onGraveyard={() => ...}
 *   onCopy={() => ...}
 * />
 * ```
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    DotsThreeVertical,
    ArrowUp,
    Copy,
    ArrowBendDownRight,
    Trash,
    Ghost,
    PencilSimple,
    CalendarBlank
} from '@phosphor-icons/react';
import styles from './Todos.module.css';

interface TaskActionsOverlayProps {
    onMoveToTop: () => void;
    onPunt: () => void;
    onDelete: () => void;
    onGraveyard: () => void;
    onCopy: () => void;
    onEdit: () => void;
    onChangeDate: (newDateStr: string) => void;
}


export function TaskActionsOverlay({
    onMoveToTop,
    onPunt,
    onDelete,
    onGraveyard,
    onCopy,
    onEdit,
    onChangeDate
}: TaskActionsOverlayProps) {
    const [showOverlay, setShowOverlay] = useState(false);
    const [isHoveringOverlay, setIsHoveringOverlay] = useState(false);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const dateInputRef = useRef<HTMLInputElement>(null);
    const [overlayPosition, setOverlayPosition] = useState<{ top: number; left?: number; right?: number }>({ top: 0, left: 0 });

    const clearTimers = useCallback(() => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }
    }, []);

    const handleMouseLeave = useCallback(() => {
        clearTimers();
        hideTimerRef.current = setTimeout(() => {
            if (!isHoveringOverlay && !isDatePickerOpen) {
                setShowOverlay(false);
            }
        }, 100);
    }, [clearTimers, isHoveringOverlay, isDatePickerOpen]);

    const handleOverlayEnter = useCallback(() => {
        setIsHoveringOverlay(true);
        clearTimers();
    }, [clearTimers]);

    const handleOverlayLeave = useCallback(() => {
        setIsHoveringOverlay(false);
        if (!isDatePickerOpen) {
            setShowOverlay(false);
        }
    }, [isDatePickerOpen]);

    const handleAction = useCallback((e: React.SyntheticEvent, action: () => void) => {
        e.stopPropagation();
        action();
        setShowOverlay(false);
        setIsHoveringOverlay(false);
        clearTimers();
    }, [clearTimers]);

    const handleCalendarClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDatePickerOpen(true);
        if (dateInputRef.current) {
            if (typeof dateInputRef.current.showPicker === 'function') {
                setTimeout(() => {
                    try {
                        dateInputRef.current?.showPicker();
                    } catch (err) {
                        dateInputRef.current?.focus();
                    }
                }, 0);
            } else {
                dateInputRef.current.focus();
            }
        }
    }, []);

    const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setIsDatePickerOpen(false);
        if (e.target.value) {
            handleAction(e, () => onChangeDate(e.target.value));
        }
    }, [handleAction, onChangeDate]);

    const handleDateBlur = useCallback(() => {
        setIsDatePickerOpen(false);
        setShowOverlay(false);
    }, []);

    const stopPropagation = useCallback((e: React.SyntheticEvent) => {
        e.stopPropagation();
    }, []);

    useEffect(() => {
        return () => { clearTimers(); };
    }, [clearTimers]);

    // Smart positioning: render left when near right edge
    useEffect(() => {
        if (showOverlay && wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            const windowWidth = window.innerWidth;
            const spaceRight = windowWidth - rect.right;

            if (spaceRight < 180) {
                setOverlayPosition({
                    top: rect.top + rect.height / 2,
                    right: windowWidth - rect.left + 8
                });
            } else {
                setOverlayPosition({
                    top: rect.top + rect.height / 2,
                    left: rect.right + 8
                });
            }
        }
    }, [showOverlay]);

    return (
        <div
            ref={wrapperRef}
            className={styles.taskActionsWrapper}
            onMouseEnter={() => setShowOverlay(true)}
            onMouseLeave={handleMouseLeave}
        >
            <button type="button" className={styles.taskActionsBtn}>
                <DotsThreeVertical size={16} weight="bold" />
            </button>
            {showOverlay && createPortal(
                <div
                    className={styles.taskActionsOverlay}
                    style={overlayPosition}
                    onMouseEnter={handleOverlayEnter}
                    onMouseLeave={handleOverlayLeave}
                >
                    <button
                        type="button"
                        className={styles.actionOverlayBtn}
                        onClick={(e) => handleAction(e, onMoveToTop)}
                        title="Move to Top"
                    >
                        <ArrowUp type="duotone" size={14} />
                    </button>
                    <button
                        type="button"
                        className={styles.actionOverlayBtn}
                        onClick={(e) => handleAction(e, onEdit)}
                        title="Edit Text"
                    >
                        <PencilSimple type="duotone" size={14} />
                    </button>
                    <div className={styles.datePickerWrapper}>
                        <button
                            type="button"
                            className={styles.actionOverlayBtn}
                            onClick={handleCalendarClick}
                            title="Change Date"
                        >
                            <CalendarBlank type="duotone" size={14} />
                        </button>
                        <input
                            ref={dateInputRef}
                            type="date"
                            className={styles.datePickerHiddenInput}
                            onBlur={handleDateBlur}
                            onChange={handleDateChange}
                            onClick={stopPropagation}
                            onKeyDown={stopPropagation}
                        />
                    </div>
                    <button
                        type="button"
                        className={styles.actionOverlayBtn}
                        onClick={(e) => handleAction(e, onCopy)}
                        title="Copy Text"
                    >
                        <Copy type="duotone" size={14} />
                    </button>
                    <button
                        type="button"
                        className={styles.actionOverlayBtn}
                        onClick={(e) => handleAction(e, onPunt)}
                        title="Punt to Next Day"
                    >
                        <ArrowBendDownRight type="duotone" size={14} />
                    </button>
                    <button
                        type="button"
                        className={`${styles.actionOverlayBtn} ${styles.deleteAction}`}
                        onClick={(e) => handleAction(e, onDelete)}
                        title="Delete"
                    >
                        <Trash type="duotone" size={14} />
                    </button>
                    <button
                        type="button"
                        className={`${styles.actionOverlayBtn} ${styles.graveyardAction}`}
                        onClick={(e) => handleAction(e, onGraveyard)}
                        title="Send to Graveyard"
                    >
                        <Ghost type="duotone" size={14} />
                    </button>
                </div>,
                document.body
            )}
        </div>
    );
}
