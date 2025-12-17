import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getTasks, getWorkTasks, getTasksForWeek, createTask, updateTask, deleteTask as apiDeleteTask, batchPuntTasks, batchFailTasks, reorderTask } from '../../api/tasks';
import type { Task } from '../../types';
import { generateId, DateUtility } from '../../utils';
import { getOrderAfter, getOrderBefore, sortByOrder } from '../../utils/orderUtils';
import { Trash, Check, X, ArrowBendDownRight, CaretDown, ArrowRight, ArrowUp } from '@phosphor-icons/react';
import { DayWeek, type DayWeekColumnData } from '../shared/DayWeek';
import { WeekView } from './WeekView';
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './Todos.module.css';

// State overlay hover component
interface StateOverlayProps {
  taskId: string;
  dateStr: string;
  currentState: 'active' | 'completed' | 'failed';
  onSetState: (dateStr: string, taskId: string, newState: 'active' | 'completed' | 'failed') => void;
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
    // Delay hiding to allow mouse to move to overlay
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
    return () => {
      clearTimers();
    };
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

// Sortable wrapper for task items
interface SortableTaskItemProps {
  task: Task;
  children: React.ReactNode;
}

function SortableTaskItem({ task, children }: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
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

interface TodosProps {
  apiBaseUrl: string;
  workMode?: boolean;
}

export function Todos({ apiBaseUrl, workMode = false }: TodosProps) {
  const [tasks, setTasks] = useState<Record<string, Task[]>>({});
  const [newTaskTexts, setNewTaskTexts] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [weekCategory, setWeekCategory] = useState<'life' | 'work'>('life');
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({});

  // Drag and drop state
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeDragInfo, setActiveDragInfo] = useState<{ dateStr: string; category: 'life' | 'work'; state: 'active' | 'completed' | 'failed' } | null>(null);

  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // DnD sensors with activation constraint (8px distance to start drag)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Parse droppable ID like "2024-12-16_life_active" into components
  const parseDroppableId = (id: string) => {
    const parts = id.split('_');
    if (parts.length < 3) return null;
    return {
      date: parts[0],
      category: parts[1] as 'life' | 'work',
      state: parts[2] as 'active' | 'completed' | 'failed',
    };
  };

  // Get tasks filtered by date, category, and state
  const getFilteredTasks = (dateStr: string, category: 'life' | 'work', state: 'active' | 'completed' | 'failed') => {
    const dayTasks = tasks[dateStr] || [];
    return dayTasks.filter(t => {
      const taskCategory = t.category || 'life';
      const taskState = t.state || (t.completed ? 'completed' : 'active');
      return taskCategory === category && taskState === state;
    });
  };

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const taskId = String(active.id);

    // Find the task across all dates
    for (const [dateStr, dayTasks] of Object.entries(tasks)) {
      const task = dayTasks.find(t => t.id === taskId);
      if (task) {
        setActiveTask(task);
        setActiveDragInfo({
          dateStr,
          category: task.category || 'life',
          state: task.state || 'active',
        });
        break;
      }
    }
  }, [tasks]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveTask(null);
    setActiveDragInfo(null);

    if (!over || !activeDragInfo) return;

    const taskId = String(active.id);
    const overId = String(over.id);

    // Check if dropped on a sortable container (accordion)
    const target = parseDroppableId(overId);
    if (!target) return; // Dropped somewhere invalid

    // Get target tasks and calculate new order
    const targetTasks = getFilteredTasks(target.date, target.category, target.state);
    const sortedTasks = sortByOrder(targetTasks.filter(t => t.id !== taskId));
    const orders = sortedTasks.map(t => t.order).filter((o): o is string => o != null);
    const newOrder = orders.length > 0 ? getOrderAfter(orders[orders.length - 1]) : getOrderAfter(null);

    // Determine what changed
    const dateChanged = target.date !== activeDragInfo.dateStr;
    const categoryChanged = target.category !== activeDragInfo.category;
    const stateChanged = target.state !== activeDragInfo.state;

    if (!dateChanged && !categoryChanged && !stateChanged) {
      // Same location, no change needed
      return;
    }

    // Optimistic update
    const sourceDate = activeDragInfo.dateStr;
    const targetDate = target.date;

    setTasks(prev => {
      const updated = { ...prev };

      // Remove from source
      const sourceTasks = [...(updated[sourceDate] || [])];
      const taskIndex = sourceTasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return prev;

      const [movedTask] = sourceTasks.splice(taskIndex, 1);
      updated[sourceDate] = sourceTasks;

      // Update task properties
      const updatedTask: Task = {
        ...movedTask,
        order: newOrder,
        date: target.date,
        category: target.category,
        state: target.state,
        completed: target.state === 'completed',
      };

      // Add to target
      const targetTasks = [...(updated[targetDate] || [])];
      targetTasks.push(updatedTask);
      updated[targetDate] = targetTasks;

      return updated;
    });

    // API call
    try {
      await reorderTask(apiBaseUrl, taskId, newOrder, {
        date: dateChanged ? target.date : undefined,
        category: categoryChanged ? target.category : undefined,
        state: stateChanged ? target.state : undefined,
      });
    } catch (error) {
      console.error('Failed to reorder task:', error);
      // Reload to revert
      loadTasks();
    }
  }, [activeDragInfo, apiBaseUrl, tasks]);

  const handleDragCancel = useCallback(() => {
    setActiveTask(null);
    setActiveDragInfo(null);
  }, []);

  useEffect(() => {
    loadTasks();

    return () => {
      // Cleanup debounce timers on unmount
      Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  async function loadTasks() {
    try {
      const data = workMode
        ? await getWorkTasks(apiBaseUrl)
        : await getTasks(apiBaseUrl);
      setTasks(data || {});
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }

  async function loadWeekTasks(start: Date, end: Date) {
    try {
      const startStr = DateUtility.formatDate(start);
      const endStr = DateUtility.formatDate(end);
      const data = await getTasksForWeek(apiBaseUrl, startStr, endStr);
      setTasks(prev => ({ ...prev, ...data }));
    } catch (error) {
      console.error('Failed to load week tasks:', error);
    }
  }

  async function addTask(e: React.FormEvent, dateStr: string, category: 'life' | 'work') {
    e.preventDefault();
    const inputKey = `${dateStr}_${category}`;
    const text = newTaskTexts[inputKey];
    if (!text?.trim()) return;

    const newTask: Task = {
      id: generateId(),
      text: text,
      completed: false,
      date: dateStr,
      createdAt: new Date().toISOString(),
      category: category
    };

    // Optimistic update
    const currentDayTasks = tasks[dateStr] || [];
    const updatedDayTasks = [...currentDayTasks, newTask];
    const updatedTasks = { ...tasks, [dateStr]: updatedDayTasks };

    setTasks(updatedTasks);
    setNewTaskTexts({ ...newTaskTexts, [inputKey]: '' });

    try {
      await createTask(apiBaseUrl, newTask);
    } catch (error) {
      console.error('Failed to create task:', error);
      // Revert optimistic update on error
      setTasks(tasks);
    }
  }

  function toggleTask(dateStr: string, taskId: string) {
    const currentDayTasks = tasks[dateStr] || [];
    const currentTask = currentDayTasks.find(t => t.id === taskId);
    if (!currentTask) return;

    const currentState = currentTask.state || (currentTask.completed ? 'completed' : 'active');
    let newState: 'active' | 'completed' | 'failed';

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

    // Update UI immediately
    setTasks(updatedTasks);

    // Debounce API save - update only this single task
    const debounceKey = `${dateStr}_${taskId} `;
    if (debounceTimers.current[debounceKey]) {
      clearTimeout(debounceTimers.current[debounceKey]);
    }

    debounceTimers.current[debounceKey] = setTimeout(async () => {
      try {
        await updateTask(apiBaseUrl, taskId, {
          completed: newState === 'completed',
          state: newState
        });
      } catch (error) {
        console.error('Failed to update task:', error);
        // Revert optimistic update on error
        setTasks(tasks);
      }
      delete debounceTimers.current[debounceKey];
    }, 3000);
  }

  function setTaskState(dateStr: string, taskId: string, newState: 'active' | 'completed' | 'failed') {
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

    // Update UI immediately
    setTasks(updatedTasks);

    // Debounce API save
    const debounceKey = `${dateStr}_${taskId} `;
    if (debounceTimers.current[debounceKey]) {
      clearTimeout(debounceTimers.current[debounceKey]);
    }

    debounceTimers.current[debounceKey] = setTimeout(async () => {
      try {
        await updateTask(apiBaseUrl, taskId, {
          completed: newState === 'completed',
          state: newState
        });
      } catch (error) {
        console.error('Failed to update task:', error);
        // Revert optimistic update on error
        setTasks(tasks);
      }
      delete debounceTimers.current[debounceKey];
    }, 3000);
  }

  async function puntTask(dateStr: string, taskId: string) {
    const currentDayTasks = tasks[dateStr] || [];
    const taskToClone = currentDayTasks.find(t => t.id === taskId);
    if (!taskToClone) return;

    // 1. Determine target date
    // If task is in the past -> move to Today
    // If task is today or future -> move to Next Day
    const today = new Date();
    const todayStr = DateUtility.formatDate(today);

    let targetDateStr = todayStr;

    if (dateStr >= todayStr) {
      const d = new Date(dateStr);
      d.setUTCDate(d.getUTCDate() + 1);
      targetDateStr = d.toISOString().split('T')[0];
    }

    const newTask: Task = {
      ...taskToClone,
      id: generateId(),
      date: targetDateStr,
      createdAt: new Date().toISOString(),
      state: 'active',
      completed: false
    };

    // Optimistic update
    const updatedTasks = { ...tasks };

    // Mark original as failed
    updatedTasks[dateStr] = currentDayTasks.map(t =>
      t.id === taskId ? { ...t, state: 'failed' as const, completed: false } : t
    );

    // Add new task to target day
    const targetDayTasks = updatedTasks[targetDateStr] || [];
    updatedTasks[targetDateStr] = [...targetDayTasks, newTask];

    setTasks(updatedTasks);

    try {
      // Update original task to failed state
      await updateTask(apiBaseUrl, taskId, { state: 'failed', completed: false });
      // Create new task
      await createTask(apiBaseUrl, newTask);
    } catch (error) {
      console.error('Failed to punt task:', error);
      // Revert optimistic update on error
      setTasks(tasks);
    }
  }

  async function deleteTask(dateStr: string, taskId: string) {
    // Optimistic update
    const currentDayTasks = tasks[dateStr] || [];
    const updatedDayTasks = currentDayTasks.filter(t => t.id !== taskId);
    const updatedTasks = { ...tasks, [dateStr]: updatedDayTasks };

    setTasks(updatedTasks);

    try {
      await apiDeleteTask(apiBaseUrl, taskId);
    } catch (error) {
      console.error('Failed to delete task:', error);
      // Revert optimistic update on error
      setTasks(tasks);
    }
  }

  async function batchPuntAllTasks(dateStr: string, taskIds: string[], category: 'life' | 'work') {
    if (taskIds.length === 0) return;

    const today = new Date();
    const todayStr = DateUtility.formatDate(today);

    let targetDateStr = todayStr;
    if (dateStr >= todayStr) {
      const d = new Date(dateStr);
      d.setUTCDate(d.getUTCDate() + 1);
      targetDateStr = d.toISOString().split('T')[0];
    }

    // Optimistic update
    const currentDayTasks = tasks[dateStr] || [];
    const targetDayTasks = tasks[targetDateStr] || [];

    const updatedCurrentDay = currentDayTasks.map(t =>
      taskIds.includes(t.id) ? { ...t, state: 'failed' as const, completed: false } : t
    );

    const newTasks = currentDayTasks
      .filter(t => taskIds.includes(t.id))
      .map(t => ({
        ...t,
        id: generateId(),
        date: targetDateStr,
        createdAt: new Date().toISOString(),
        state: 'active' as const,
        completed: false
      }));

    const updatedTargetDay = [...targetDayTasks, ...newTasks];

    setTasks(prev => ({
      ...prev,
      [dateStr]: updatedCurrentDay,
      [targetDateStr]: updatedTargetDay
    }));

    try {
      await batchPuntTasks(apiBaseUrl, taskIds, dateStr, targetDateStr);
    } catch (error) {
      console.error('Failed to batch punt tasks:', error);
      setTasks(tasks);
    }
  }

  async function batchFailAllTasks(dateStr: string, taskIds: string[]) {
    if (taskIds.length === 0) return;

    // Optimistic update
    const currentDayTasks = tasks[dateStr] || [];
    const updatedDayTasks = currentDayTasks.map(t =>
      taskIds.includes(t.id) ? { ...t, state: 'failed' as const, completed: false } : t
    );

    setTasks(prev => ({
      ...prev,
      [dateStr]: updatedDayTasks
    }));

    try {
      await batchFailTasks(apiBaseUrl, taskIds);
    } catch (error) {
      console.error('Failed to batch fail tasks:', error);
      setTasks(tasks);
    }
  }

  async function moveTaskToTop(dateStr: string, taskId: string) {
    const currentDayTasks = tasks[dateStr] || [];
    const task = currentDayTasks.find(t => t.id === taskId);
    if (!task) return;

    // Determine context (category + state)
    const category = task.category || 'life';
    const state = task.state || (task.completed ? 'completed' : 'active');

    // Get siblings in the same list
    const siblings = currentDayTasks.filter(t => {
      const tCat = t.category || 'life';
      const tState = t.state || (t.completed ? 'completed' : 'active');
      return tCat === category && tState === state && t.id !== taskId;
    });

    // If no siblings, nothing to do
    if (siblings.length === 0) return;

    // Find current top order
    const sortedSiblings = sortByOrder(siblings);
    const topOrder = sortedSiblings[0].order || null;

    // Calculate new order
    const newOrder = getOrderBefore(topOrder);

    // Optimistic update
    const updatedTasks = { ...tasks };
    updatedTasks[dateStr] = currentDayTasks.map(t =>
      t.id === taskId ? { ...t, order: newOrder } : t
    );
    setTasks(updatedTasks);

    // API Call
    try {
      await reorderTask(apiBaseUrl, taskId, newOrder);
    } catch (error) {
      console.error('Failed to move task to top:', error);
      setTasks(tasks); // Revert
    }
  }

  const toggleAccordion = (key: string) => {
    setExpandedAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderTaskItem = (task: Task, dateStr: string) => {
    const taskState = task.state || (task.completed ? 'completed' : 'active');
    return (
      <SortableTaskItem key={task.id} task={task}>
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
          <div className={styles.todoActions}>
            <button
              className={styles.todoMoveTopBtn}
              onClick={() => moveTaskToTop(dateStr, task.id)}
              title="Move to Top"
            >
              <ArrowUp size={14} />
            </button>
            <button
              className={styles.todoCloneBtn}
              onClick={() => puntTask(dateStr, task.id)}
              title="Fail & Punt to Next Day"
            >
              <ArrowBendDownRight size={14} />
            </button>
            <button
              className={styles.todoDeleteBtn}
              onClick={() => deleteTask(dateStr, task.id)}
            >
              <Trash size={14} />
            </button>
          </div>
        </div>
      </SortableTaskItem>
    );
  };

  const renderTasksWithAccordions = (
    taskList: Task[],
    dateStr: string,
    category: 'life' | 'work'
  ) => {
    const activeTasks = taskList.filter(t => {
      const state = t.state || (t.completed ? 'completed' : 'active');
      return state === 'active';
    });
    const completedTasks = taskList.filter(t => {
      const state = t.state || (t.completed ? 'completed' : 'active');
      return state === 'completed';
    });
    const failedTasks = taskList.filter(t => {
      const state = t.state || (t.completed ? 'completed' : 'active');
      return state === 'failed';
    });

    const openKey = `${dateStr}_${category} _open`;
    const successKey = `${dateStr}_${category} _success`;
    const failedKey = `${dateStr}_${category} _failed`;

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
                <span>Open</span>
                <span className={styles.accordionCount}>{activeTasks.length}</span>
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
                </div>
              )}
            </div>
            {isOpenExpanded && (
              <SortableContext items={sortByOrder(activeTasks).map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className={styles.accordionContent} data-droppable={`${dateStr}_${category}_active`}>
                  {sortByOrder(activeTasks).map(task => renderTaskItem(task, dateStr))}
                </div>
              </SortableContext>
            )}
          </div>
        )}

        {/* Success accordion */}
        {completedTasks.length > 0 && (
          <div className={`${styles.accordion} ${expandedAccordions[successKey] ? styles.expanded : ''} `}>
            <button
              className={`${styles.accordionHeader} ${styles.successAccordion} `}
              onClick={() => toggleAccordion(successKey)}
            >
              <CaretDown
                size={14}
                className={`${styles.accordionCaret} ${expandedAccordions[successKey] ? styles.expanded : ''} `}
              />
              <span>Done</span>
              <span className={styles.accordionCount}>{completedTasks.length}</span>
            </button>
            {expandedAccordions[successKey] && (
              <SortableContext items={sortByOrder(completedTasks).map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className={styles.accordionContent} data-droppable={`${dateStr}_${category}_completed`}>
                  {sortByOrder(completedTasks).map(task => renderTaskItem(task, dateStr))}
                </div>
              </SortableContext>
            )}
          </div>
        )}

        {/* Failed accordion */}
        {failedTasks.length > 0 && (
          <div className={`${styles.accordion} ${expandedAccordions[failedKey] ? styles.expanded : ''} `}>
            <button
              className={`${styles.accordionHeader} ${styles.failedAccordion} `}
              onClick={() => toggleAccordion(failedKey)}
            >
              <CaretDown
                size={14}
                className={`${styles.accordionCaret} ${expandedAccordions[failedKey] ? styles.expanded : ''} `}
              />
              <span>Cancelled</span>
              <span className={styles.accordionCount}>{failedTasks.length}</span>
            </button>
            {expandedAccordions[failedKey] && (
              <SortableContext items={sortByOrder(failedTasks).map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className={styles.accordionContent} data-droppable={`${dateStr}_${category}_failed`}>
                  {sortByOrder(failedTasks).map(task => renderTaskItem(task, dateStr))}
                </div>
              </SortableContext>
            )}
          </div>
        )}
      </div>
    );
  };

  // Mini pie chart SVG component
  const MiniPieChart = ({ active, completed, failed }: { active: number; completed: number; failed: number }) => {
    const total = active + completed + failed;
    if (total === 0) return null;

    const size = 18;
    const radius = 9;
    const cx = size / 2;
    const cy = size / 2;

    // Calculate angles
    const activeAngle = (active / total) * 360;
    const completedAngle = (completed / total) * 360;
    // failed takes the rest

    // Convert angles to SVG arc paths
    const polarToCartesian = (angle: number) => {
      const rad = (angle - 90) * Math.PI / 180;
      return {
        x: cx + radius * Math.cos(rad),
        y: cy + radius * Math.sin(rad)
      };
    };

    const createArc = (startAngle: number, endAngle: number) => {
      if (endAngle - startAngle >= 360) {
        // Full circle
        return `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.001} ${cy - radius} `;
      }
      const start = polarToCartesian(startAngle);
      const end = polarToCartesian(endAngle);
      const largeArc = endAngle - startAngle > 180 ? 1 : 0;
      return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
    };

    let currentAngle = 0;
    const segments = [];

    if (active > 0) {
      segments.push({ path: createArc(currentAngle, currentAngle + activeAngle), color: 'rgba(255, 255, 255, 0.5)' });
      currentAngle += activeAngle;
    }
    if (completed > 0) {
      segments.push({ path: createArc(currentAngle, currentAngle + completedAngle), color: 'rgba(52, 211, 153, 0.8)' });
      currentAngle += completedAngle;
    }
    if (failed > 0) {
      segments.push({ path: createArc(currentAngle, 360), color: 'rgba(255, 59, 48, 0.8)' });
    }

    return (
      <svg width={size} height={size} className={styles.miniPieChart}>
        {segments.map((seg, i) => (
          <path key={i} d={seg.path} fill={seg.color} />
        ))}
      </svg>
    );
  };

  // Helper to compute counts for a specific category
  const getCountsForCategory = (taskList: Task[]) => {
    let active = 0, completed = 0, failed = 0;

    taskList.forEach(t => {
      const state = t.state || (t.completed ? 'completed' : 'active');
      if (state === 'completed') completed++;
      else if (state === 'failed') failed++;
      else active++;
    });

    return { active, completed, failed };
  };

  const renderTodoColumn = ({ date, dateStr, isToday }: DayWeekColumnData) => {
    const dayTasks = tasks[dateStr] || [];

    const lifeTasks = dayTasks.filter(t => !t.category || t.category === 'life');
    const workTasks = dayTasks.filter(t => t.category === 'work');

    const showLife = !workMode && (viewMode === 'day' || weekCategory === 'life');
    const showWork = viewMode === 'day' || weekCategory === 'work';

    return (
      <>
        <div className={styles.todoColumnHeader}>
          <span className={`${styles.todoDate} ${isToday ? 'today' : ''} `}>
            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          <span className={styles.todoDayName}>
            {date.toLocaleDateString('en-US', { weekday: 'short' })}
          </span>
        </div>

        <div className={styles.todoContentRow}>
          {showLife && (
            <div className={styles.todoCategorySection}>
              {viewMode === 'day' && (
                <div className={styles.todoCategoryHeader}>
                  <span>Life</span>
                  <MiniPieChart {...getCountsForCategory(lifeTasks)} />
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
                  <MiniPieChart {...getCountsForCategory(workTasks)} />
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

  if (viewMode === 'week') {
    return (
      <WeekView
        renderColumn={renderTodoColumn}
        currentDate={new Date()}
        onClose={() => setViewMode('day')}
        onWeekChange={loadWeekTasks}
        headerControls={
          <div className={styles.weekCategoryToggle}>
            <button
              className={`${styles.toggleBtn} ${weekCategory === 'life' ? styles.active : ''} `}
              onClick={() => setWeekCategory('life')}
            >
              Life
            </button>
            <button
              className={`${styles.toggleBtn} ${weekCategory === 'work' ? styles.active : ''} `}
              onClick={() => setWeekCategory('work')}
            >
              Work
            </button>
          </div>
        }
      />
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <DayWeek
        renderColumn={renderTodoColumn}
        className={styles.todosScrollContainer}
        columnClassName={styles.todoColumn}
        onMoreClick={() => setViewMode('week')}
        moreOverride="Week View"
      />
      <DragOverlay>
        {activeTask ? (
          <div className={styles.taskDragOverlay}>
            <div className={`${styles.todoItem} ${styles[activeTask.state || 'active']}`}>
              <div className={styles.todoItemContent}>
                <span className={styles.todoText}>{activeTask.text}</span>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
