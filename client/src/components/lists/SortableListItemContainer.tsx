/**
 * SortableListItemContainer Component
 * 
 * A reusable component that renders a sortable list of items within a list.
 * Integrates with @dnd-kit's SortableContext for drag-and-drop.
 */

import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { ListItem } from '../../types';
import styles from './Lists.module.css';

export interface SortableListItemContainerProps {
    /** Unique container ID (typically the list ID) */
    containerId: string;

    /** Items to render in this list */
    items: ListItem[];

    /** Render function for each item */
    renderItem: (item: ListItem) => React.ReactNode;

    /** Whether this list is currently a drop target */
    isDropTarget?: boolean;

    /** Optional class name for the list container */
    className?: string;
}

export function SortableListItemContainer({
    containerId,
    items,
    renderItem,
    isDropTarget = false,
    className,
}: SortableListItemContainerProps) {
    // Sort items by position
    const sortedItems = useMemo(() =>
        [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
        [items]
    );

    // Get item IDs for SortableContext
    const itemIds = useMemo(
        () => sortedItems.map(item => item.id),
        [sortedItems]
    );

    // Make this container droppable
    const { setNodeRef, isOver } = useDroppable({
        id: containerId,
    });

    // Combine active states
    const showDropIndicator = isDropTarget || isOver;

    return (
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            <div
                ref={setNodeRef}
                className={`
          ${styles.listItems}
          ${showDropIndicator ? styles.listItemsDropTarget : ''}
          ${className || ''}
        `.trim()}
                data-droppable={containerId}
            >
                {sortedItems.map(item => renderItem(item))}
            </div>
        </SortableContext>
    );
}
