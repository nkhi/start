/**
 * DraggableListItem Component
 * 
 * A wrapper component that makes a list item draggable using @dnd-kit.
 * Similar to DraggableTask but for list items.
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ListItem } from '../../types';
import styles from './Lists.module.css';

export interface DraggableListItemProps {
    /** The list item data */
    item: ListItem;

    /** Content to render inside the draggable wrapper */
    children: React.ReactNode;

    /** Whether dragging is disabled for this item */
    disabled?: boolean;
}

export function DraggableListItem({ item, children, disabled = false }: DraggableListItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
        isSorting,
    } = useSortable({
        id: item.id,
        data: {
            type: 'listItem',
            item,
        },
        disabled,
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: disabled ? 'default' : isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        zIndex: isDragging ? 1000 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
        ${styles.draggableListItem}
        ${isDragging ? styles.draggingItem : ''}
        ${isSorting ? styles.sortingItem : ''}
      `.trim()}
            {...attributes}
            {...listeners}
        >
            {children}
        </div>
    );
}

/**
 * ListItemDragOverlay Component
 * 
 * Renders the floating overlay shown while dragging a list item.
 */
export interface ListItemDragOverlayProps {
    item: ListItem;
    children: React.ReactNode;
}

export function ListItemDragOverlay({ children }: ListItemDragOverlayProps) {
    return (
        <div className={styles.listItemDragOverlay}>
            {children}
        </div>
    );
}
