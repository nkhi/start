/**
 * DraggableTask Component
 * 
 * Wraps a task item to make it draggable using @dnd-kit.
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../../types';
import styles from './Todos.module.css';

interface DraggableTaskProps {
    task: Task;
    dateStr: string;
    children: React.ReactNode;
    disabled?: boolean;
}

export function DraggableTask({ task, dateStr, children, disabled = false }: DraggableTaskProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: {
            type: 'task',
            task,
            dateStr,
        },
        disabled,
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: disabled ? 'default' : 'grab',
        touchAction: 'none',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`${styles.draggableTask} ${isDragging ? styles.dragging : ''}`}
            {...attributes}
            {...listeners}
        >
            {children}
        </div>
    );
}

/**
 * TaskDragOverlay Component
 * 
 * Renders the overlay shown while dragging a task.
 */
interface TaskDragOverlayProps {
    task: Task;
    renderContent: (task: Task) => React.ReactNode;
}

export function TaskDragOverlay({ task, renderContent }: TaskDragOverlayProps) {
    return (
        <div className={styles.taskDragOverlay}>
            {renderContent(task)}
        </div>
    );
}
