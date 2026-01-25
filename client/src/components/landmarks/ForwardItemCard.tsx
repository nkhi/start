import React, { useRef, useEffect, useCallback } from 'react';
import { Trash } from '@phosphor-icons/react';
import { type LandmarkItem } from '../../types';
import styles from './Landmarks.module.css';

interface ForwardItemCardProps {
    item: LandmarkItem;
    daysUntilText: string;
    isToday: boolean;
    onTextChange: (text: string) => void;
    onDateChange: (date: string | null) => void;
    onDelete: () => void;
}

export function ForwardItemCard({
    item,
    daysUntilText,
    isToday,
    onTextChange,
    onDateChange,
    onDelete
}: ForwardItemCardProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        }
    }, []);

    // Adjust height whenever text changes
    useEffect(() => {
        adjustHeight();
    }, [item.text, adjustHeight]);

    // Adjust height when textarea width changes (viewport resize)
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const resizeObserver = new ResizeObserver(() => {
            adjustHeight();
        });

        resizeObserver.observe(textarea);

        return () => {
            resizeObserver.disconnect();
        };
    }, [adjustHeight]);

    return (
        <div className={`${styles.item} ${isToday ? styles.itemToday : ''}`}>
            <textarea
                ref={textareaRef}
                className={styles.itemText}
                // Display text is just the text, we render daysUntil separately if needed
                // But per design, we might want to show it inline? 
                // The prompt said: "rendering into a separate non-editable text display"
                // So we'll put it before the text or as a prefix
                value={item.text}
                onChange={(e) => onTextChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                rows={1}
                onInput={adjustHeight}
            />

            {/* Display the "X days" as a non-editable badge/text if it exists */}
            {daysUntilText && (
                <span className={styles.dateBadge} style={{ marginLeft: '8px', flexShrink: 0 }}>
                    {daysUntilText}
                </span>
            )}

            <button
                className={styles.deleteBtn}
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                onPointerDown={(e) => e.stopPropagation()}
            >
                <Trash size={14} />
            </button>
            <input
                type="date"
                className={styles.dateInput}
                value={item.date || ''}
                onChange={(e) => onDateChange(e.target.value || null)}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
            />
        </div>
    );
}
