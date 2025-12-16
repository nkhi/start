/**
 * useDragAndDrop Hook
 * 
 * Encapsulates all drag-and-drop logic for task reordering.
 * Makes it easy to modify/extend DnD behavior without touching components.
 */

import { useState, useCallback, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import type { Task } from '../types';
import { getOrderForIndex, sortByOrder } from '../utils/orderUtils';

export interface DragItem {
  taskId: string;
  sourceDate: string;
  sourceCategory: 'life' | 'work';
  sourceState: 'active' | 'completed' | 'failed';
}

export interface DropTarget {
  date: string;
  category: 'life' | 'work';
  state: 'active' | 'completed' | 'failed';
  index: number;
}

export interface UseDragAndDropOptions {
  onReorder: (
    taskId: string,
    newOrder: string,
    options?: {
      date?: string;
      category?: 'life' | 'work';
      state?: 'active' | 'completed' | 'failed';
    }
  ) => Promise<void>;
  onScrollToDate?: (dateStr: string) => void;
}

export interface UseDragAndDropReturn {
  // Core DnD state
  activeId: UniqueIdentifier | null;
  activeTask: Task | null;
  overId: UniqueIdentifier | null;
  
  // Sensors for DndContext
  sensors: ReturnType<typeof useSensors>;
  
  // Event handlers
  handleDragStart: (event: DragStartEvent, task: Task) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: (event: DragEndEvent, getTasksForDrop: GetTasksForDropFn) => void;
  handleDragCancel: () => void;
  
  // Helper to calculate new order for a drop
  calculateNewOrder: (
    targetTasks: Task[],
    targetIndex: number,
    excludeTaskId?: string
  ) => string;
  
  // DndContext component for convenience
  DndContextProvider: typeof DndContext;
  DragOverlayComponent: typeof DragOverlay;
}

// Function type for getting tasks at a drop location
export type GetTasksForDropFn = (
  date: string,
  category: 'life' | 'work',
  state: 'active' | 'completed' | 'failed'
) => Task[];

/**
 * Parse a droppable ID to extract date, category, and state.
 * Format: "date_category_state" e.g. "2024-12-16_life_active"
 */
export function parseDroppableId(id: string): { date: string; category: 'life' | 'work'; state: 'active' | 'completed' | 'failed' } | null {
  const parts = id.split('_');
  if (parts.length < 3) return null;
  
  const date = parts[0];
  const category = parts[1] as 'life' | 'work';
  const state = parts[2] as 'active' | 'completed' | 'failed';
  
  if (!['life', 'work'].includes(category)) return null;
  if (!['active', 'completed', 'failed'].includes(state)) return null;
  
  return { date, category, state };
}

/**
 * Create a droppable ID from date, category, and state.
 */
export function createDroppableId(date: string, category: 'life' | 'work', state: 'active' | 'completed' | 'failed'): string {
  return `${date}_${category}_${state}`;
}

export function useDragAndDrop(options: UseDragAndDropOptions): UseDragAndDropReturn {
  const { onReorder, onScrollToDate } = options;
  
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  
  // Track the source info for the dragged item
  const dragSourceRef = useRef<DragItem | null>(null);
  
  // Configure sensors with activation constraints
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const handleDragStart = useCallback((event: DragStartEvent, task: Task) => {
    setActiveId(event.active.id);
    setActiveTask(task);
    
    // Parse source from active ID or set from task
    dragSourceRef.current = {
      taskId: task.id,
      sourceDate: task.date,
      sourceCategory: task.category || 'life',
      sourceState: task.state || 'active',
    };
  }, []);
  
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id ?? null);
    
    // If dragging near edge of a different day, trigger scroll
    if (over && onScrollToDate) {
      const parsed = parseDroppableId(String(over.id));
      if (parsed && dragSourceRef.current && parsed.date !== dragSourceRef.current.sourceDate) {
        // Could trigger auto-scroll here
        // onScrollToDate(parsed.date);
      }
    }
  }, [onScrollToDate]);
  
  const handleDragEnd = useCallback(async (
    event: DragEndEvent,
    getTasksForDrop: GetTasksForDropFn
  ) => {
    const { active, over } = event;
    
    setActiveId(null);
    setActiveTask(null);
    setOverId(null);
    
    if (!over || !dragSourceRef.current) {
      dragSourceRef.current = null;
      return;
    }
    
    const source = dragSourceRef.current;
    dragSourceRef.current = null;
    
    // Parse the drop target
    const overIdStr = String(over.id);
    
    // Check if dropped on a droppable container
    const target = parseDroppableId(overIdStr);
    if (!target) {
      // Maybe dropped on a specific task - get its container
      // For now, just return
      return;
    }
    
    // Get tasks at the target location  
    const targetTasks = getTasksForDrop(target.date, target.category, target.state);
    
    // Calculate new order (append to end for now - index can be refined with sortable)
    const sortedTasks = sortByOrder(targetTasks.filter(t => t.id !== source.taskId));
    const newOrder = getOrderForIndex(
      sortedTasks.map(t => t.order).filter((o): o is string => o != null),
      sortedTasks.length // Append to end
    );
    
    // Determine what changed
    const dateChanged = target.date !== source.sourceDate;
    const categoryChanged = target.category !== source.sourceCategory;
    const stateChanged = target.state !== source.sourceState;
    
    // Call the reorder handler
    await onReorder(source.taskId, newOrder, {
      date: dateChanged ? target.date : undefined,
      category: categoryChanged ? target.category : undefined,
      state: stateChanged ? target.state : undefined,
    });
  }, [onReorder]);
  
  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setActiveTask(null);
    setOverId(null);
    dragSourceRef.current = null;
  }, []);
  
  const calculateNewOrder = useCallback((
    targetTasks: Task[],
    targetIndex: number,
    excludeTaskId?: string
  ): string => {
    const filteredTasks = excludeTaskId 
      ? targetTasks.filter(t => t.id !== excludeTaskId)
      : targetTasks;
    const sortedTasks = sortByOrder(filteredTasks);
    const orders = sortedTasks.map(t => t.order).filter((o): o is string => o != null);
    return getOrderForIndex(orders, targetIndex);
  }, []);
  
  return {
    activeId,
    activeTask,
    overId,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    calculateNewOrder,
    DndContextProvider: DndContext,
    DragOverlayComponent: DragOverlay,
  };
}
