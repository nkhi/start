/**
 * DroppableAccordion Component
 * 
 * Wraps an accordion to make it a drop target for tasks.
 */

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { Task } from '../../types';
import { sortByOrder } from '../../utils/orderUtils';
import styles from './Todos.module.css';

interface DroppableAccordionProps {
    /** Unique ID for this droppable: "date_category_state" */
    id: string;
    /** Tasks in this accordion */
    tasks: Task[];
    /** Whether the accordion is expanded */
    isExpanded: boolean;
    children: React.ReactNode;
}

export function DroppableAccordion({ id, tasks, children }: DroppableAccordionProps) {
    const { setNodeRef, isOver } = useDroppable({
        id,
        data: {
            type: 'accordion',
            accepts: ['task'],
        },
    });

    // Sort tasks by order for sortable context
    const sortedTasks = sortByOrder(tasks);
    const taskIds = sortedTasks.map(t => t.id);

    return (
        <div
            ref={setNodeRef}
            className={`${styles.droppableAccordion} ${isOver ? styles.dropTarget : ''}`}
        >
            <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                {children}
            </SortableContext>
        </div>
    );
}
