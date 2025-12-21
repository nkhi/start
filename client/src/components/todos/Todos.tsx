/**
 * Todos Component
 * 
 * Main task management component with drag-and-drop reordering.
 * 
 * ## Architecture:
 * - useTaskDragAndDrop: Encapsulates all DnD logic
 * - DraggableTask: Wrapper for each task item
 * - SortableTaskList: Container for task groups
 * 
 * ## Features:
 * - Fractional indexing for stable ordering
 * - Cross-container drag (date, category, state)
 * - Optimistic updates with error rollback
 * - Day and Week view modes
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getTasks, getWorkTasks, getTasksForWeek, createTask, updateTask, deleteTask as apiDeleteTask, batchPuntTasks, batchFailTasks, batchGraveyardTasks, reorderTask, getGraveyardTasks, getWorkGraveyardTasks, graveyardTask as apiGraveyardTask, resurrectTask as apiResurrectTask } from '../../api/tasks';
import type { Task } from '../../types';
import { generateId, DateUtility } from '../../utils';
import { getOrderBefore, sortByOrder } from '../../utils/orderUtils';
import { Trash, Check, X, ArrowBendDownRight, CaretDown, ArrowRight, ArrowUp, DotsThreeVertical, Ghost, Copy } from '@phosphor-icons/react';
import { DayWeek, type DayWeekColumnData } from '../shared/DayWeek';
import { WeekView } from './WeekView';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { useTaskDragAndDrop, createContainerId, type TaskCategory, type TaskState } from '../../hooks/useTaskDragAndDrop';
import { DraggableTask, TaskDragOverlay } from './DraggableTask';
import { SortableTaskList } from './SortableTaskList';
import { Graveyard } from './Graveyard';
import styles from './Todos.module.css';

// ============================================
// Helper Components
// ============================================

/**
 * StateOverlayWrapper - Hover overlay for changing task state
 */
interface StateOverlayProps {
  taskId: string;
  dateStr: string;
  currentState: TaskState;
  onSetState: (dateStr: string, taskId: string, newState: TaskState) => void;
  onToggle: () => void;
  children: React.ReactNode;
}

function StateOverlayWrapper({ taskId, dateStr, currentState, onSetState, onToggle, children }: StateOverlayProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [isHoveringOverlay, setIsHoveringOverlay] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    clearTimers();
    hoverTimerRef.current = setTimeout(() => {
      setShowOverlay(true);
    }, 400);
  }, [clearTimers]);

  const handleMouseLeave = useCallback(() => {
    clearTimers();
    hideTimerRef.current = setTimeout(() => {
      if (!isHoveringOverlay) {
        setShowOverlay(false);
      }
    }, 100);
  }, [clearTimers, isHoveringOverlay]);

  const handleOverlayEnter = useCallback(() => {
    setIsHoveringOverlay(true);
    clearTimers();
  }, [clearTimers]);

  const handleOverlayLeave = useCallback(() => {
    setIsHoveringOverlay(false);
    setShowOverlay(false);
  }, []);

  const handleStateClick = useCallback((e: React.MouseEvent, newState: 'completed' | 'failed') => {
    e.stopPropagation();
    onSetState(dateStr, taskId, newState);
    setShowOverlay(false);
    setIsHoveringOverlay(false);
    clearTimers();
  }, [dateStr, taskId, onSetState, clearTimers]);

  useEffect(() => {
    return () => { clearTimers(); };
  }, [clearTimers]);

  return (
    <div
      className={styles.stateOverlayWrapper}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div onClick={onToggle}>
        {children}
      </div>
      {showOverlay && (
        <div
          className={styles.stateOverlay}
          onMouseEnter={handleOverlayEnter}
          onMouseLeave={handleOverlayLeave}
        >
          <button
            type="button"
            className={`${styles.overlayDot} ${styles.successDot} ${currentState === 'completed' ? styles.active : ''}`}
            onClick={(e) => handleStateClick(e, 'completed')}
            title="Mark as completed"
          >
            <Check size={12} weight="bold" />
          </button>
          <button
            type="button"
            className={`${styles.overlayDot} ${styles.failDot} ${currentState === 'failed' ? styles.active : ''}`}
            onClick={(e) => handleStateClick(e, 'failed')}
            title="Mark as failed"
          >
            <X size={12} weight="bold" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * StatusBar - Visual task completion indicator
 * Shows segments for: Completed (green), Failed (red), Punted (yellow), Active (transparent/empty)
 */
function StatusBar({ active, punted, completed, failed }: { active: number; punted: number; completed: number; failed: number }) {
  const total = active + punted + completed + failed;
  if (total === 0) return null;

  const getPct = (val: number) => (val / total) * 100;

  return (
    <div className={styles.statusBar}>
      <div className={styles.statusSegment} style={{ width: `${getPct(active)}%`, backgroundColor: 'rgba(255, 255, 255, 0.6)' }} />
      <div className={styles.statusSegment} style={{ width: `${getPct(completed)}%`, backgroundColor: 'rgba(52, 211, 153, 0.8)' }} />
      <div className={styles.statusSegment} style={{ width: `${getPct(punted)}%`, backgroundColor: 'rgba(251, 191, 36, 0.8)' }} />
      <div className={styles.statusSegment} style={{ width: `${getPct(failed)}%`, backgroundColor: 'rgba(255, 59, 48, 0.8)' }} />
    </div>
  );
}

/**
 * TaskActionsOverlay - Hover overlay for task actions (move to top, punt, delete)
 * Shows a DotsThreeVertical icon that reveals actions on hover
 */
interface TaskActionsOverlayProps {
  onMoveToTop: () => void;
  onPunt: () => void;
  onDelete: () => void;
  onGraveyard: () => void;
  onCopy: () => void;
}

function TaskActionsOverlay({ onMoveToTop, onPunt, onDelete, onGraveyard, onCopy }: TaskActionsOverlayProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [isHoveringOverlay, setIsHoveringOverlay] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    clearTimers();
    hoverTimerRef.current = setTimeout(() => {
      setShowOverlay(true);
    }, 200);
  }, [clearTimers]);

  const handleMouseLeave = useCallback(() => {
    clearTimers();
    hideTimerRef.current = setTimeout(() => {
      if (!isHoveringOverlay) {
        setShowOverlay(false);
      }
    }, 100);
  }, [clearTimers, isHoveringOverlay]);

  const handleOverlayEnter = useCallback(() => {
    setIsHoveringOverlay(true);
    clearTimers();
  }, [clearTimers]);

  const handleOverlayLeave = useCallback(() => {
    setIsHoveringOverlay(false);
    setShowOverlay(false);
  }, []);

  const handleAction = useCallback((e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
    setShowOverlay(false);
    setIsHoveringOverlay(false);
    clearTimers();
  }, [clearTimers]);

  useEffect(() => {
    return () => { clearTimers(); };
  }, [clearTimers]);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [overlayPosition, setOverlayPosition] = useState<{ top: number; left?: number; right?: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (showOverlay && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const spaceRight = windowWidth - rect.right;

      // Smart positioning: If we're close to the right edge (right-most column), 
      // render to the left to avoid overflow. 
      // Note: User mentioned "left most column" but likely meant right-most as that causes overflow.
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
      onMouseEnter={handleMouseEnter}
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

// ============================================
// Helper Functions
// ============================================

/**
 * Get task category safely typed
 */
function getTaskCategory(task: Task): TaskCategory {
  return (task.category === 'work' ? 'work' : 'life');
}

/**
 * Get task state safely typed
 */
function getTaskState(task: Task): TaskState {
  if (task.state === 'completed' || task.state === 'failed') {
    return task.state as TaskState;
  }
  return task.completed ? 'completed' : 'active';
}

/**
 * Get counts for tasks in a category
 * Separates punted active tasks (puntDays > 0) from fresh active tasks
 */
function getCountsForCategory(taskList: Task[]) {
  let active = 0, punted = 0, completed = 0, failed = 0;

  taskList.forEach(t => {
    const state = getTaskState(t);
    if (state === 'completed') completed++;
    else if (state === 'failed') failed++;
    else if ((t.puntDays || 0) > 0) punted++;
    else active++;
  });

  return { active, punted, completed, failed };
}

// ============================================
// Main Component
// ============================================

interface TodosProps {
  workMode?: boolean;
}

export function Todos({ workMode = false }: TodosProps) {
  // State
  const [tasks, setTasks] = useState<Record<string, Task[]>>({});
  const [newTaskTexts, setNewTaskTexts] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [weekCategory, setWeekCategory] = useState<TaskCategory>(workMode ? 'work' : 'life');
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({});

  // Graveyard state
  const [isGraveyardOpen, setIsGraveyardOpen] = useState(false);
  const [isGraveyardLoading, setIsGraveyardLoading] = useState(false);
  const [graveyardTasks, setGraveyardTasks] = useState<Task[]>([]);

  // Week View state
  const [weekStart, setWeekStart] = useState<Date>(() => {
    // Calculate start of week (Sunday)
    const d = new Date();
    const day = d.getDay(); // 0 is Sunday
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [weekDates, setWeekDates] = useState<Date[]>([]);

  // Calculate week dates whenever start changes or mode changes
  useEffect(() => {
    let dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }

    // Filter out weekends for work mode (Monday-Friday only)
    if (workMode) {
      dates = dates.filter(d => {
        const day = d.getDay();
        return day !== 0 && day !== 6; // Exclude Sunday (0) and Saturday (6)
      });
    }

    setWeekDates(dates);
  }, [weekStart, workMode]);

  // Sync category with work mode
  useEffect(() => {
    setWeekCategory(workMode ? 'work' : 'life');
  }, [workMode]);

  const handlePrevWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() - 7);
    setWeekStart(newStart);
  };

  const handleNextWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() + 7);
    setWeekStart(newStart);
  };

  const handleCurrentWeek = () => {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    setWeekStart(d);
  };

  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ----------------------------------------
  // Drag and Drop Hook
  // ----------------------------------------

  const handleReorder = useCallback(async (
    taskId: string,
    newOrder: string,
    options?: { date?: string; category?: TaskCategory; state?: TaskState }
  ) => {
    await reorderTask(taskId, newOrder, options);
  }, []);

  const handleOptimisticUpdate = useCallback((updater: (prev: Record<string, Task[]>) => Record<string, Task[]>) => {
    setTasks(updater);
  }, []);

  const handleDndError = useCallback(() => {
    loadTasks();
  }, []);

  const {
    sensors,
    activeTask,
    handlers,
    isDropTarget,
    isOverGraveyard,
  } = useTaskDragAndDrop({
    tasks,
    graveyardTasks,
    onReorder: handleReorder,
    onOptimisticUpdate: handleOptimisticUpdate,
    onGraveyard: sendToGraveyard,
    onResurrect: resurrectFromGraveyard,
    onError: handleDndError,
  });

  // ----------------------------------------
  // Data Loading
  // ----------------------------------------

  useEffect(() => {
    loadTasks();

    return () => {
      Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  async function loadTasks() {
    try {
      const data = workMode
        ? await getWorkTasks()
        : await getTasks();
      setTasks(data || {});
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }

  async function loadWeekTasks(start: Date, end: Date) {
    try {
      const startStr = DateUtility.formatDate(start);
      const endStr = DateUtility.formatDate(end);
      const data = await getTasksForWeek(startStr, endStr);
      setTasks(prev => ({ ...prev, ...data }));
    } catch (error) {
      console.error('Failed to load week tasks:', error);
    }
  }

  // Load week tasks when week dates change
  useEffect(() => {
    if (viewMode === 'week' && weekDates.length > 0) {
      loadWeekTasks(weekDates[0], weekDates[weekDates.length - 1]);
    }
  }, [viewMode, weekDates]);

  async function loadGraveyardTasks() {
    setIsGraveyardLoading(true);
    try {
      const data = workMode
        ? await getWorkGraveyardTasks()
        : await getGraveyardTasks();
      setGraveyardTasks(data || []);
    } catch (error) {
      console.error('Failed to load graveyard tasks:', error);
    } finally {
      setIsGraveyardLoading(false);
    }
  }

  // Load graveyard tasks when panel opens
  useEffect(() => {
    if (isGraveyardOpen) {
      loadGraveyardTasks();
    }
  }, [isGraveyardOpen]);

  // ----------------------------------------
  // Graveyard Operations
  // ----------------------------------------

  async function sendToGraveyard(dateStr: string, taskId: string) {
    const currentDayTasks = tasks[dateStr] || [];
    const task = currentDayTasks.find(t => t.id === taskId);
    if (!task) return;

    // Optimistic update: remove from day, add to graveyard
    setTasks(prev => ({
      ...prev,
      [dateStr]: (prev[dateStr] || []).filter(t => t.id !== taskId)
    }));
    setGraveyardTasks(prev => [{ ...task, date: null, state: 'active' }, ...prev]);

    try {
      await apiGraveyardTask(taskId);
    } catch (error) {
      console.error('Failed to graveyard task:', error);
      // Rollback
      setTasks(prev => ({ ...prev, [dateStr]: [...(prev[dateStr] || []), task] }));
      setGraveyardTasks(prev => prev.filter(t => t.id !== taskId));
    }
  }

  async function resurrectFromGraveyard(taskId: string, targetDate: string) {
    const task = graveyardTasks.find(t => t.id === taskId);
    if (!task) return;

    // Optimistic update: remove from graveyard, add to target date
    setGraveyardTasks(prev => prev.filter(t => t.id !== taskId));
    setTasks(prev => ({
      ...prev,
      [targetDate]: [...(prev[targetDate] || []), { ...task, date: targetDate, state: 'active' }]
    }));

    try {
      await apiResurrectTask(taskId, targetDate);
    } catch (error) {
      console.error('Failed to resurrect task:', error);
      // Rollback
      setGraveyardTasks(prev => [task, ...prev]);
      setTasks(prev => ({
        ...prev,
        [targetDate]: (prev[targetDate] || []).filter(t => t.id !== taskId)
      }));
    }
  }

  async function deleteGraveyardTask(taskId: string) {
    const task = graveyardTasks.find(t => t.id === taskId);
    if (!task) return;

    // Optimistic update
    setGraveyardTasks(prev => prev.filter(t => t.id !== taskId));

    try {
      await apiDeleteTask(taskId);
    } catch (error) {
      console.error('Failed to delete graveyard task:', error);
      // Rollback
      setGraveyardTasks(prev => [task, ...prev]);
    }
  }


  // ----------------------------------------
  // Task Operations
  // ----------------------------------------

  async function addTask(e: React.FormEvent, dateStr: string, category: TaskCategory) {
    e.preventDefault();
    const inputKey = `${dateStr}_${category}`;
    const text = newTaskTexts[inputKey];
    if (!text?.trim()) return;

    // Set createdAt to noon on the target date (not "now")
    // This ensures puntDays calculates from the date the task was created for
    const createdAt = new Date(`${dateStr}T12:00:00`).toISOString();

    const newTask: Task = {
      id: generateId(),
      text: text,
      completed: false,
      date: dateStr,
      createdAt: createdAt,
      category: category,
      state: 'active'
    };

    // Optimistic update
    const currentDayTasks = tasks[dateStr] || [];
    const updatedDayTasks = [...currentDayTasks, newTask];
    const updatedTasks = { ...tasks, [dateStr]: updatedDayTasks };

    setTasks(updatedTasks);
    setNewTaskTexts({ ...newTaskTexts, [inputKey]: '' });

    try {
      await createTask(newTask);
    } catch (error) {
      console.error('Failed to create task:', error);
      setTasks(tasks);
    }
  }

  function toggleTask(dateStr: string, taskId: string) {
    const currentDayTasks = tasks[dateStr] || [];
    const currentTask = currentDayTasks.find(t => t.id === taskId);
    if (!currentTask) return;

    const currentState = getTaskState(currentTask);
    let newState: TaskState;

    // Cycle through: active -> completed -> failed -> active
    if (currentState === 'active') {
      newState = 'completed';
    } else if (currentState === 'completed') {
      newState = 'failed';
    } else {
      newState = 'active';
    }

    const updatedTask = {
      ...currentTask,
      completed: newState === 'completed',
      state: newState
    };

    const updatedDayTasks = currentDayTasks.map(t =>
      t.id === taskId ? updatedTask : t
    );
    const updatedTasks = { ...tasks, [dateStr]: updatedDayTasks };

    setTasks(updatedTasks);

    // Debounce API save
    const debounceKey = `${dateStr}_${taskId}`;
    if (debounceTimers.current[debounceKey]) {
      clearTimeout(debounceTimers.current[debounceKey]);
    }

    debounceTimers.current[debounceKey] = setTimeout(async () => {
      try {
        await updateTask(taskId, {
          completed: newState === 'completed',
          state: newState
        });
      } catch (error) {
        console.error('Failed to update task:', error);
        setTasks(tasks);
      }
      delete debounceTimers.current[debounceKey];
    }, 3000);
  }

  function setTaskState(dateStr: string, taskId: string, newState: TaskState) {
    const currentDayTasks = tasks[dateStr] || [];
    const currentTask = currentDayTasks.find(t => t.id === taskId);
    if (!currentTask) return;

    const updatedTask = {
      ...currentTask,
      completed: newState === 'completed',
      state: newState
    };

    const updatedDayTasks = currentDayTasks.map(t =>
      t.id === taskId ? updatedTask : t
    );
    const updatedTasks = { ...tasks, [dateStr]: updatedDayTasks };

    setTasks(updatedTasks);

    // Debounce API save
    const debounceKey = `${dateStr}_${taskId}`;
    if (debounceTimers.current[debounceKey]) {
      clearTimeout(debounceTimers.current[debounceKey]);
    }

    debounceTimers.current[debounceKey] = setTimeout(async () => {
      try {
        await updateTask(taskId, {
          completed: newState === 'completed',
          state: newState
        });
      } catch (error) {
        console.error('Failed to update task:', error);
        setTasks(tasks);
      }
      delete debounceTimers.current[debounceKey];
    }, 3000);
  }

  async function puntTask(dateStr: string, taskId: string) {
    const currentDayTasks = tasks[dateStr] || [];
    const taskToPunt = currentDayTasks.find(t => t.id === taskId);
    if (!taskToPunt) return;

    const today = new Date();
    const todayStr = DateUtility.formatDate(today);

    let targetDateStr = todayStr;

    if (dateStr >= todayStr) {
      const d = new Date(dateStr);
      d.setUTCDate(d.getUTCDate() + 1);
      targetDateStr = d.toISOString().split('T')[0];
    }

    // Calculate puntDays for optimistic update
    const createdDate = new Date(taskToPunt.createdAt.split('T')[0] + 'T00:00:00Z');
    const targetDate = new Date(targetDateStr + 'T00:00:00Z');
    const newPuntDays = Math.max(0, Math.floor((targetDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));

    // Create the moved task (same ID, new date)
    const movedTask: Task = {
      ...taskToPunt,
      date: targetDateStr,
      state: 'active',
      completed: false,
      puntDays: newPuntDays
    };

    console.log('[PUNT] Moving task:', { id: taskToPunt.id, from: dateStr, to: targetDateStr, puntDays: newPuntDays });

    // Optimistic update: REMOVE from source, ADD to target (move, not clone)
    const updatedTasks = { ...tasks };

    // Remove from source date
    updatedTasks[dateStr] = currentDayTasks.filter(t => t.id !== taskId);

    // Add to target date
    const targetDayTasks = updatedTasks[targetDateStr] || [];
    updatedTasks[targetDateStr] = [...targetDayTasks, movedTask];

    setTasks(updatedTasks);

    try {
      // Just update the task's date (move it)
      await updateTask(taskId, { date: targetDateStr, state: 'active', completed: false });
    } catch (error) {
      console.error('Failed to punt task:', error);
      setTasks(tasks);
    }
  }

  async function deleteTask(dateStr: string, taskId: string) {
    const currentDayTasks = tasks[dateStr] || [];
    const updatedDayTasks = currentDayTasks.filter(t => t.id !== taskId);
    const updatedTasks = { ...tasks, [dateStr]: updatedDayTasks };

    setTasks(updatedTasks);

    try {
      await apiDeleteTask(taskId);
    } catch (error) {
      console.error('Failed to delete task:', error);
      setTasks(tasks);
    }
  }

  async function batchPuntAllTasks(dateStr: string, taskIds: string[], _category: TaskCategory) {
    if (taskIds.length === 0) return;

    const today = new Date();
    const todayStr = DateUtility.formatDate(today);

    let targetDateStr = todayStr;
    if (dateStr >= todayStr) {
      const d = new Date(dateStr);
      d.setUTCDate(d.getUTCDate() + 1);
      targetDateStr = d.toISOString().split('T')[0];
    }

    const currentDayTasks = tasks[dateStr] || [];
    const targetDayTasks = tasks[targetDateStr] || [];

    // Tasks to move (keep same ID, just update date)
    const tasksToPunt = currentDayTasks.filter(t => taskIds.includes(t.id));

    // Calculate puntDays for each moved task
    const movedTasks = tasksToPunt.map(t => {
      const createdDate = new Date(t.createdAt.split('T')[0] + 'T00:00:00Z');
      const targetDate = new Date(targetDateStr + 'T00:00:00Z');
      const newPuntDays = Math.max(0, Math.floor((targetDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));
      return {
        ...t,
        date: targetDateStr,
        state: 'active' as const,
        completed: false,
        puntDays: newPuntDays
      };
    });

    // Remove from source, add to target (move, not clone)
    const updatedCurrentDay = currentDayTasks.filter(t => !taskIds.includes(t.id));
    const updatedTargetDay = [...targetDayTasks, ...movedTasks];

    setTasks(prev => ({
      ...prev,
      [dateStr]: updatedCurrentDay,
      [targetDateStr]: updatedTargetDay
    }));

    try {
      await batchPuntTasks(taskIds, dateStr, targetDateStr);
    } catch (error) {
      console.error('Failed to batch punt tasks:', error);
      setTasks(tasks);
    }
  }

  async function batchFailAllTasks(dateStr: string, taskIds: string[]) {
    if (taskIds.length === 0) return;

    const currentDayTasks = tasks[dateStr] || [];
    const updatedDayTasks = currentDayTasks.map(t =>
      taskIds.includes(t.id) ? { ...t, state: 'failed' as const, completed: false } : t
    );

    setTasks(prev => ({
      ...prev,
      [dateStr]: updatedDayTasks
    }));

    try {
      await batchFailTasks(taskIds);
    } catch (error) {
      console.error('Failed to batch fail tasks:', error);
      setTasks(tasks);
    }
  }

  async function batchGraveyardAllTasks(dateStr: string, taskIds: string[]) {
    if (taskIds.length === 0) return;

    const currentDayTasks = tasks[dateStr] || [];
    const tasksToGrave = currentDayTasks.filter(t => taskIds.includes(t.id));
    const updatedDayTasks = currentDayTasks.filter(t => !taskIds.includes(t.id));

    // Optimistic update: remove from day, add to graveyard
    setTasks(prev => ({
      ...prev,
      [dateStr]: updatedDayTasks
    }));
    setGraveyardTasks(prev => [
      ...tasksToGrave.map(t => ({ ...t, date: null, state: 'active' })),
      ...prev
    ]);

    try {
      await batchGraveyardTasks(taskIds);
    } catch (error) {
      console.error('Failed to batch graveyard tasks:', error);
      setTasks(tasks);
      setGraveyardTasks(graveyardTasks);
    }
  }

  async function moveTaskToTop(dateStr: string, taskId: string) {
    const currentDayTasks = tasks[dateStr] || [];
    const task = currentDayTasks.find(t => t.id === taskId);
    if (!task) return;

    const category = getTaskCategory(task);
    const state = getTaskState(task);

    // Get siblings in the same list
    const siblings = currentDayTasks.filter(t => {
      const tCat = getTaskCategory(t);
      const tState = getTaskState(t);
      return tCat === category && tState === state && t.id !== taskId;
    });

    if (siblings.length === 0) return;

    const sortedSiblings = sortByOrder(siblings);
    const topOrder = sortedSiblings[0].order || null;
    const newOrder = getOrderBefore(topOrder);

    // Optimistic update
    const updatedTasks = { ...tasks };
    updatedTasks[dateStr] = currentDayTasks.map(t =>
      t.id === taskId ? { ...t, order: newOrder } : t
    );
    setTasks(updatedTasks);

    try {
      await reorderTask(taskId, newOrder);
    } catch (error) {
      console.error('Failed to move task to top:', error);
      setTasks(tasks);
    }
  }

  // ----------------------------------------
  // UI Helpers
  // ----------------------------------------

  const toggleAccordion = (key: string) => {
    setExpandedAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ----------------------------------------
  // Task Rendering
  // ----------------------------------------

  const renderTaskItem = (task: Task, dateStr: string) => {
    const taskState = getTaskState(task);
    const puntDays = task.puntDays || 0;

    return (
      <DraggableTask key={task.id} task={task}>
        <div className={`${styles.todoItem} ${styles[taskState] || ''}`}>
          <div className={styles.todoItemContent}>
            <StateOverlayWrapper
              taskId={task.id}
              dateStr={dateStr}
              currentState={taskState}
              onSetState={setTaskState}
              onToggle={() => toggleTask(dateStr, task.id)}
            >
              <button
                type="button"
                className={`${styles.todoCheckBtn} ${styles[taskState] || ''}`}
              >
                {taskState === 'completed' && <Check size={12} weight="bold" />}
                {taskState === 'failed' && <X size={12} weight="bold" />}
              </button>
            </StateOverlayWrapper>
            <span className={styles.todoText}>{task.text}</span>
          </div>
          <TaskActionsOverlay
            onMoveToTop={() => moveTaskToTop(dateStr, task.id)}
            onPunt={() => puntTask(dateStr, task.id)}
            onDelete={() => deleteTask(dateStr, task.id)}
            onGraveyard={() => sendToGraveyard(dateStr, task.id)}
            onCopy={() => navigator.clipboard.writeText(task.text)}
          />
          {taskState === 'active' && puntDays > 0 && (
            <span
              className={styles.puntDaysBadge}
              title={`Punted ${puntDays} day${puntDays > 1 ? 's' : ''}`}
              style={{
                color: puntDays >= 3 ? '#FF3B30' : puntDays === 2 ? '#FF9500' : '#FBBF24'
              }}
            >
              {puntDays}
            </span>
          )}
        </div>
      </DraggableTask>
    );
  };

  const renderTasksWithAccordions = (
    taskList: Task[],
    dateStr: string,
    category: TaskCategory
  ) => {
    const activeTasks = taskList.filter(t => getTaskState(t) === 'active');
    const completedTasks = taskList.filter(t => getTaskState(t) === 'completed');
    const failedTasks = taskList.filter(t => getTaskState(t) === 'failed');

    const openKey = `${dateStr}_${category}_open`;
    const successKey = `${dateStr}_${category}_success`;
    const failedKey = `${dateStr}_${category}_failed`;

    // Open accordion defaults to expanded
    const isOpenExpanded = expandedAccordions[openKey] !== false;

    return (
      <div className={styles.accordionsContainer}>
        {/* Open tasks accordion - default expanded */}
        {activeTasks.length > 0 && (
          <div className={`${styles.accordion} ${isOpenExpanded ? styles.expanded : ''}`}>
            <div className={styles.accordionHeaderRow}>
              <button
                className={`${styles.accordionHeader} ${styles.openAccordion}`}
                onClick={() => setExpandedAccordions(prev => ({ ...prev, [openKey]: !isOpenExpanded }))}
              >
                <CaretDown
                  size={14}
                  className={`${styles.accordionCaret} ${isOpenExpanded ? styles.expanded : ''}`}
                />
                <span className={styles.accordionCount}>{activeTasks.length}</span>
                <span>Open</span>
              </button>
              {isOpenExpanded && (
                <div className={styles.accordionActions}>
                  <button
                    className={styles.accordionActionBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      batchPuntAllTasks(dateStr, activeTasks.map(t => t.id), category);
                    }}
                    title="Punt All to Next Day"
                  >
                    <ArrowBendDownRight size={14} />
                  </button>
                  <button
                    className={styles.accordionActionBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      batchFailAllTasks(dateStr, activeTasks.map(t => t.id));
                    }}
                    title="Fail All"
                  >
                    <X size={14} />
                  </button>
                  <button
                    className={styles.accordionActionBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      batchGraveyardAllTasks(dateStr, activeTasks.map(t => t.id));
                    }}
                    title="Graveyard All"
                  >
                    <Ghost size={14} weight="duotone" />
                  </button>
                </div>
              )}
            </div>
            {isOpenExpanded && (
              <SortableTaskList
                containerId={createContainerId(dateStr, category, 'active')}
                tasks={activeTasks}
                renderTask={(task) => renderTaskItem(task, dateStr)}
                isDropTarget={isDropTarget(dateStr, category, 'active')}
                className={styles.accordionContent}
              />
            )}
          </div>
        )}

        {/* Done accordion */}
        {completedTasks.length > 0 && (
          <div className={`${styles.accordion} ${expandedAccordions[successKey] ? styles.expanded : ''}`}>
            <button
              className={`${styles.accordionHeader} ${styles.successAccordion}`}
              onClick={() => toggleAccordion(successKey)}
            >
              <CaretDown
                size={14}
                className={`${styles.accordionCaret} ${expandedAccordions[successKey] ? styles.expanded : ''}`}
              />
              <span className={styles.accordionCount}>{completedTasks.length}</span>
              <span>Done</span>
            </button>
            {expandedAccordions[successKey] && (
              <SortableTaskList
                containerId={createContainerId(dateStr, category, 'completed')}
                tasks={completedTasks}
                renderTask={(task) => renderTaskItem(task, dateStr)}
                isDropTarget={isDropTarget(dateStr, category, 'completed')}
                className={styles.accordionContent}
              />
            )}
          </div>
        )}

        {/* Failed accordion */}
        {failedTasks.length > 0 && (
          <div className={`${styles.accordion} ${expandedAccordions[failedKey] ? styles.expanded : ''}`}>
            <button
              className={`${styles.accordionHeader} ${styles.failedAccordion}`}
              onClick={() => toggleAccordion(failedKey)}
            >
              <CaretDown
                size={14}
                className={`${styles.accordionCaret} ${expandedAccordions[failedKey] ? styles.expanded : ''}`}
              />
              <span className={styles.accordionCount}>{failedTasks.length}</span>
              <span>Cancelled</span>
            </button>
            {expandedAccordions[failedKey] && (
              <SortableTaskList
                containerId={createContainerId(dateStr, category, 'failed')}
                tasks={failedTasks}
                renderTask={(task) => renderTaskItem(task, dateStr)}
                isDropTarget={isDropTarget(dateStr, category, 'failed')}
                className={styles.accordionContent}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  // ----------------------------------------
  // Column Rendering
  // ----------------------------------------

  const renderTodoColumn = ({ date, dateStr, isToday, isShrunk }: DayWeekColumnData) => {
    const dayTasks = tasks[dateStr] || [];

    const lifeTasks = dayTasks.filter(t => !t.category || t.category === 'life');
    const workTasks = dayTasks.filter(t => t.category === 'work');

    const showLife = !workMode && (viewMode === 'day' || weekCategory === 'life');
    const showWork = viewMode === 'day' || weekCategory === 'work';

    return (
      <>
        <div className={styles.todoColumnHeader}>
          <span className={`${styles.todoDate} ${isToday ? 'today' : ''} ${isShrunk ? styles.shrunkDate : ''}`}>
            {isShrunk
              ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : <>{date.toLocaleDateString('en-US', { weekday: viewMode === 'week' ? 'short' : 'long' })}, {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
            }
          </span>
          {/* <span className={styles.todoDayName}>
            {date.toLocaleDateString('en-US', { weekday: 'short' })}
          </span> */}
        </div>

        <div className={styles.todoContentRow}>
          {showLife && (
            <div className={styles.todoCategorySection}>
              {viewMode === 'day' && (
                <div className={styles.todoCategoryHeader}>
                  <span>Life</span>
                  <StatusBar {...getCountsForCategory(lifeTasks)} />
                </div>
              )}
              <form onSubmit={(e) => addTask(e, dateStr, 'life')} className={styles.todoInputFormSmall}>
                <div className={styles.todoInputWrapper}>
                  <input
                    type="text"
                    value={newTaskTexts[`${dateStr}_life`] || ''}
                    onChange={(e) => setNewTaskTexts({ ...newTaskTexts, [`${dateStr}_life`]: e.target.value })}
                    placeholder="Add task"
                    className={styles.todoInputSmall}
                  />
                  <button
                    type="submit"
                    className={styles.todoInputSubmitBtn}
                    disabled={!newTaskTexts[`${dateStr}_life`]?.trim()}
                  >
                    <ArrowRight size={14} weight="bold" />
                  </button>
                </div>
              </form>
              {renderTasksWithAccordions(lifeTasks, dateStr, 'life')}
            </div>
          )}

          {showWork && (
            <div className={styles.todoCategorySection}>
              {viewMode === 'day' && (
                <div className={styles.todoCategoryHeader}>
                  <span>Work</span>
                  <StatusBar {...getCountsForCategory(workTasks)} />
                </div>
              )}
              <form onSubmit={(e) => addTask(e, dateStr, 'work')} className={styles.todoInputFormSmall}>
                <div className={styles.todoInputWrapper}>
                  <input
                    type="text"
                    value={newTaskTexts[`${dateStr}_work`] || ''}
                    onChange={(e) => setNewTaskTexts({ ...newTaskTexts, [`${dateStr}_work`]: e.target.value })}
                    placeholder="Add task"
                    className={styles.todoInputSmall}
                  />
                  <button
                    type="submit"
                    className={styles.todoInputSubmitBtn}
                    disabled={!newTaskTexts[`${dateStr}_work`]?.trim()}
                  >
                    <ArrowRight size={14} weight="bold" />
                  </button>
                </div>
              </form>
              {renderTasksWithAccordions(workTasks, dateStr, 'work')}
            </div>
          )}
        </div>
      </>
    );
  };

  // ----------------------------------------
  // Main Render
  // ----------------------------------------

  // Calculate custom grid template for work mode
  const getGridTemplate = () => {
    // Logic: Past days with NO active tasks -> 0.4fr
    //        Today & Future -> 1fr
    //        Past days WITH active tasks -> 1fr

    const todayStr = DateUtility.formatDate(new Date());

    // We need to iterate over weekDates to build the string
    const frValues = weekDates.map(date => {
      const dateStr = DateUtility.formatDate(date);

      // Future or Today: Always 1fr
      if (dateStr >= todayStr) return '1fr';

      // Past day: check if has active tasks IN THE CURRENT CATEGORY
      const dayTasks = tasks[dateStr] || [];
      const relevantTasks = dayTasks.filter(t =>
        weekCategory === 'life'
          ? (!t.category || t.category === 'life')
          : t.category === 'work'
      );

      const { active, punted } = getCountsForCategory(relevantTasks);
      const hasActiveTasks = (active > 0 || punted > 0);

      return hasActiveTasks ? '1fr' : '0.4fr';
    });

    return frValues.join(' ');
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      {...handlers}
    >
      {viewMode === 'week' ? (
        <WeekView
          renderColumn={renderTodoColumn}
          weekDates={weekDates}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onCurrentWeek={handleCurrentWeek}
          onClose={() => setViewMode('day')}
          onGraveyardClick={() => setIsGraveyardOpen(prev => !prev)}
          isGraveyardOpen={isGraveyardOpen}
          customGridTemplate={getGridTemplate()}
          weekCategory={weekCategory}
          onCategoryChange={!workMode ? setWeekCategory : undefined}
        />
      ) : (
        <DayWeek
          renderColumn={renderTodoColumn}
          className={styles.todosScrollContainer}
          columnClassName={styles.todoColumn}
          onMoreClick={() => setViewMode('week')}
          moreOverride="Week"
          onGraveyardClick={() => setIsGraveyardOpen(prev => !prev)}
          isGraveyardOpen={isGraveyardOpen}
        />
      )}

      <Graveyard
        isOpen={isGraveyardOpen}
        tasks={graveyardTasks}
        isOverGraveyard={isOverGraveyard}
        onClose={() => setIsGraveyardOpen(false)}
        onResurrect={resurrectFromGraveyard}
        onDelete={deleteGraveyardTask}
        isLoading={isGraveyardLoading}
        workMode={workMode}
      />

      <DragOverlay>
        {activeTask ? (
          <TaskDragOverlay task={activeTask}>
            <div className={`${styles.todoItem} ${styles[getTaskState(activeTask)]}`}>
              <div className={styles.todoItemContent}>
                <span className={styles.todoText}>{activeTask.text}</span>
              </div>
            </div>
          </TaskDragOverlay>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
