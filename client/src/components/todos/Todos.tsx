/**
 * Todos Component
 * 
 * Main task management component with drag-and-drop reordering.
 * 
 * ## Architecture:
 * This component is primarily a layout/rendering orchestrator. All business
 * logic has been extracted to dedicated hooks:
 * 
 * - useTaskOperations: All task CRUD, punt, and batch operations
 * - useGraveyard: Graveyard panel state and operations
 * - useWeekNavigation: Week view date management
 * - useTaskDragAndDrop: Drag and drop functionality
 * 
 * ## Features:
 * - Day and Week view modes (Defaults to Week; persisted in localStorage 'todosViewMode')
 * - Work/Life category separation
 * - Task state accordions (open, done, cancelled)
 * - Cross-container drag-and-drop
 * - Graveyard for archived tasks
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Check, X, CaretDown, ArrowRight, ArrowBendDownRight, Ghost } from '@phosphor-icons/react';
import { DayWeek, type DayWeekColumnData, type DayWeekHandle } from '../shared/DayWeek';
import { MultiWeekView } from './MultiWeekView';
import { TodosNavigationMenu } from './TodosNavigationMenu';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { useTaskDragAndDrop, createContainerId } from '../../hooks/useTaskDragAndDrop';
import { DraggableTask, TaskDragOverlay } from './DraggableTask';
import { SortableTaskList } from './SortableTaskList';
import { Graveyard } from './Graveyard';
import { DateUtility } from '../../utils';

// hooks
import { useTaskOperations } from '../../hooks/useTaskOperations';
import { useGraveyard } from '../../hooks/useGraveyard';
import { useViewNavigation } from '../../hooks/useViewNavigation';
import { useCalendarEventsContext } from '../../contexts/CalendarEventsContext';


// components
import { StateOverlayWrapper } from './StateOverlayWrapper';
import { TaskActionsOverlay } from './TaskActionsOverlay';
import { StatusBar } from './StatusBar';
import { CalendarPopover } from './calendar';

// utilities
import {
  getTaskState,
  getCountsForCategory,
  type TaskCategory,
} from './taskUtils';
import type { Task } from '../../types';

import styles from './Todos.module.css';

// ============================================
// Main Component
// ============================================

interface TodosProps {
  workMode?: boolean;
}

export function Todos({ workMode = false }: TodosProps) {
  // ----------------------------------------
  // View Mode State
  // ----------------------------------------
  const [viewMode, setViewMode] = useState<'day' | 'two-day' | 'week'>(() => {
    const saved = localStorage.getItem('todosViewMode');
    if (saved === 'three-day') return 'two-day';
    return (saved === 'day' || saved === 'two-day' || saved === 'week') ? saved : 'two-day';
  });

  const [focusedDateStr, setFocusedDateStr] = useState<string>('');
  const dayWeekRef = useRef<DayWeekHandle>(null);

  const isFocusedToday = focusedDateStr === DateUtility.formatDate(new Date());
  const isFutureDate = focusedDateStr > DateUtility.formatDate(new Date());

  const handleScrollToToday = useCallback(() => {
    dayWeekRef.current?.scrollToToday();
  }, []);

  const [weekCategory, setWeekCategory] = useState<TaskCategory>(workMode ? 'work' : 'life');
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({});

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('todosViewMode', viewMode);
  }, [viewMode]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      if (key === 'w' && !e.repeat) {
        setViewMode(prev => prev === 'day' ? 'two-day' : prev === 'two-day' ? 'week' : 'day');
      } else if (key === 'q' && !e.repeat && !workMode) {
        setWeekCategory(prev => prev === 'life' ? 'work' : 'life');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Sync category with work mode
  useEffect(() => {
    setWeekCategory(workMode ? 'work' : 'life');
  }, [workMode]);

  // ----------------------------------------
  // Hooks
  // ----------------------------------------

  const handleCycleViewMode = useCallback(() => {
    setViewMode(prev => {
      if (prev === 'day') return 'two-day';
      if (prev === 'two-day') return 'week';
      return 'day';
    });
  }, []);

  const taskOps = useTaskOperations({ workMode });
  const viewNav = useViewNavigation({
    workMode,
    viewMode: viewMode
  });

  const graveyard = useGraveyard({
    workMode,
    tasks: taskOps.tasks,
    setTasks: taskOps.setTasks,
  });

  // Load tasks when in paginated modes
  useEffect(() => {
    if ((viewMode === 'week' || viewMode === 'two-day') && viewNav.dates.length > 0) {
      taskOps.loadWeekTasks(viewNav.dates[0], viewNav.dates[viewNav.dates.length - 1]);
    }
  }, [viewMode, viewNav.dates]);

  // ----------------------------------------
  // Edit State
  // ----------------------------------------
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskText, setEditTaskText] = useState<string>('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTaskId && editInputRef.current) {
      editInputRef.current.focus();
      const length = editInputRef.current.value.length;
      editInputRef.current.setSelectionRange(length, length);
    }
  }, [editingTaskId]);

  const handleEditTaskSubmit = useCallback((dateStr: string, taskId: string) => {
    if (editTaskText.trim()) {
      taskOps.updateTaskText(dateStr, taskId, editTaskText.trim());
    }
    setEditingTaskId(null);
  }, [editTaskText, taskOps]);

  // ----------------------------------------
  // Calendar Prefetching
  // ----------------------------------------
  const calendarContext = useCalendarEventsContext();

  // Day View: Prefetch today ± 3 days on mount
  useEffect(() => {
    if (viewMode !== 'day' || !calendarContext) return;

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 3);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 3);

    calendarContext.prefetchDateRange(startDate, endDate);
  }, [viewMode, calendarContext]);

  // Week / Two-Day View: Prefetch the full visible date range
  useEffect(() => {
    if ((viewMode !== 'week' && viewMode !== 'two-day') || !calendarContext || viewNav.dates.length === 0) return;

    const startDate = viewNav.dates[0];
    const endDate = viewNav.dates[viewNav.dates.length - 1];

    calendarContext.prefetchDateRange(startDate, endDate);
  }, [viewMode, viewNav.dates, calendarContext]);

  // ----------------------------------------
  // Drag and Drop
  // ----------------------------------------

  const handleReorder = useCallback(async (
    taskId: string,
    newOrder: string,
    options?: { date?: string; category?: TaskCategory; state?: 'active' | 'completed' | 'failed' }
  ) => {
    const { reorderTask } = await import('../../api/tasks');
    await reorderTask(taskId, newOrder, options);
  }, []);

  const handleOptimisticUpdate = useCallback((updater: (prev: Record<string, Task[]>) => Record<string, Task[]>) => {
    taskOps.setTasks(updater);
  }, [taskOps.setTasks]);

  const handleDndError = useCallback(() => {
    taskOps.loadTasks();
  }, [taskOps.loadTasks]);

  const {
    sensors,
    activeTask,
    handlers,
    isDropTarget,
    isOverGraveyard,
  } = useTaskDragAndDrop({
    tasks: taskOps.tasks,
    graveyardTasks: graveyard.tasks,
    onReorder: handleReorder,
    onOptimisticUpdate: handleOptimisticUpdate,
    onGraveyard: graveyard.sendToGraveyard,
    onResurrect: graveyard.resurrectFromGraveyard,
    onError: handleDndError,
  });

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
              onSetState={taskOps.setTaskState}
              onToggle={() => taskOps.toggleTask(dateStr, task.id)}
            >
              <button
                type="button"
                className={`${styles.todoCheckBtn} ${styles[taskState] || ''}`}
              >
                {taskState === 'completed' && <Check size={12} weight="bold" />}
                {taskState === 'failed' && <X size={12} weight="bold" />}
              </button>
            </StateOverlayWrapper>
            {editingTaskId === task.id ? (
              <input
                ref={editInputRef}
                type="text"
                className={styles.todoInputSmall}
                style={{ flex: 1, margin: 0, height: 'auto', padding: '2px 4px' }}
                value={editTaskText}
                onChange={(e) => setEditTaskText(e.target.value)}
                onBlur={() => handleEditTaskSubmit(dateStr, task.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleEditTaskSubmit(dateStr, task.id);
                  } else if (e.key === 'Escape') {
                    setEditingTaskId(null);
                  }
                }}
              />
            ) : (
              <span className={styles.todoText}>{task.text}</span>
            )}
          </div>
          {editingTaskId !== task.id && (
            <TaskActionsOverlay
              onMoveToTop={() => taskOps.moveTaskToTop(dateStr, task.id)}
              onPunt={() => taskOps.puntTask(dateStr, task.id)}
              onDelete={() => taskOps.deleteTask(dateStr, task.id)}
              onGraveyard={() => graveyard.sendToGraveyard(dateStr, task.id)}
              onCopy={() => navigator.clipboard.writeText(task.text)}
              onEdit={() => {
                setEditTaskText(task.text);
                setEditingTaskId(task.id);
              }}
              onChangeDate={(newDateStr) => {
                taskOps.updateTaskDate(dateStr, task.id, newDateStr);
              }}
            />
          )}
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

    // Isolated condition so it's easy to iterate on later
    const shouldAutoExpandDone = viewMode === 'day' && activeTasks.length === 0 && completedTasks.length > 0;

    const isOpenExpanded = expandedAccordions[openKey] !== false;
    const isSuccessExpanded = expandedAccordions[successKey] !== undefined
      ? expandedAccordions[successKey]
      : shouldAutoExpandDone;

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
                      taskOps.batchPuntAllTasks(dateStr, activeTasks.map(t => t.id), category);
                    }}
                    title="Punt All to Next Day"
                  >
                    <ArrowBendDownRight size={14} />
                  </button>
                  <button
                    className={styles.accordionActionBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      taskOps.batchFailAllTasks(dateStr, activeTasks.map(t => t.id));
                    }}
                    title="Fail All"
                  >
                    <X size={14} />
                  </button>
                  <button
                    className={styles.accordionActionBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      taskOps.batchGraveyardAllTasks(dateStr, activeTasks.map(t => t.id));
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
          <div className={`${styles.accordion} ${isSuccessExpanded ? styles.expanded : ''}`}>
            <button
              className={`${styles.accordionHeader} ${styles.successAccordion}`}
              onClick={() => setExpandedAccordions(prev => ({ ...prev, [successKey]: !isSuccessExpanded }))}
            >
              <CaretDown
                size={14}
                className={`${styles.accordionCaret} ${isSuccessExpanded ? styles.expanded : ''}`}
              />
              <span className={styles.accordionCount}>{completedTasks.length}</span>
              <span>Done</span>
            </button>
            {isSuccessExpanded && (
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
    const dayTasks = taskOps.tasks[dateStr] || [];

    const lifeTasks = dayTasks.filter(t => !t.category || t.category === 'life');
    const workTasks = dayTasks.filter(t => t.category === 'work');

    const showLife = !workMode && (viewMode === 'day' || viewMode === 'two-day' || weekCategory === 'life');
    const showWork = viewMode === 'day' || viewMode === 'two-day' || weekCategory === 'work';

    return (
      <>
        <div className={styles.todoColumnHeader}>
          <span className={`${styles.todoDate} ${isToday ? 'today' : ''} ${isShrunk ? styles.shrunkDate : ''}`}>
            {isShrunk
              ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : <>{date.toLocaleDateString('en-US', { weekday: viewMode === 'week' ? 'short' : 'long' })}, {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
            }
          </span>
          <CalendarPopover date={date} />
        </div>

        <div className={styles.todoContentRow}>
          {showLife && (
            <div className={styles.todoCategorySection}>
              {(viewMode === 'day' || viewMode === 'two-day') && (
                <div className={styles.todoCategoryHeader}>
                  <span>Life</span>
                  <StatusBar {...getCountsForCategory(lifeTasks)} />
                </div>
              )}
              <form onSubmit={(e) => taskOps.addTask(e, dateStr, 'life')} className={styles.todoInputFormSmall}>
                <div className={styles.todoInputWrapper}>
                  <input
                    type="text"
                    value={taskOps.newTaskTexts[`${dateStr}_life`] || ''}
                    onChange={(e) => taskOps.setNewTaskTexts(prev => ({ ...prev, [`${dateStr}_life`]: e.target.value }))}
                    placeholder="Add task"
                    className={styles.todoInputSmall}
                  />
                  <button
                    type="submit"
                    className={styles.todoInputSubmitBtn}
                    disabled={!taskOps.newTaskTexts[`${dateStr}_life`]?.trim()}
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
              {(viewMode === 'day' || viewMode === 'two-day') && (
                <div className={styles.todoCategoryHeader}>
                  <span>Work</span>
                  <StatusBar {...getCountsForCategory(workTasks)} />
                </div>
              )}
              <form onSubmit={(e) => taskOps.addTask(e, dateStr, 'work')} className={styles.todoInputFormSmall}>
                <div className={styles.todoInputWrapper}>
                  <input
                    type="text"
                    value={taskOps.newTaskTexts[`${dateStr}_work`] || ''}
                    onChange={(e) => taskOps.setNewTaskTexts(prev => ({ ...prev, [`${dateStr}_work`]: e.target.value }))}
                    placeholder="Add task"
                    className={styles.todoInputSmall}
                  />
                  <button
                    type="submit"
                    className={styles.todoInputSubmitBtn}
                    disabled={!taskOps.newTaskTexts[`${dateStr}_work`]?.trim()}
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
  // Grid Template Calculation
  // ----------------------------------------

  const getGridTemplate = () => {
    const todayStr = DateUtility.formatDate(new Date());

    const frValues = viewNav.dates.map(date => {
      const dateStr = DateUtility.formatDate(date);

      if (dateStr >= todayStr) return '1fr';

      const dayTasks = taskOps.tasks[dateStr] || [];
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

  // ----------------------------------------
  // Main Render
  // ----------------------------------------

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      {...handlers}
    >
      {(viewMode === 'week' || viewMode === 'two-day') ? (
        <MultiWeekView
          renderColumn={renderTodoColumn}
          dates={viewNav.dates}
          customGridTemplate={getGridTemplate()}
        />
      ) : (
        <DayWeek
          ref={dayWeekRef}
          dates={viewNav.dates}
          renderColumn={renderTodoColumn}
          className={styles.todosScrollContainer}
          columnClassName={styles.todoColumn}
          workMode={workMode}
          hideGlobalButtons={true}
          onFocusedDateChange={setFocusedDateStr}
        />
      )}

      {/* --- Global Canvas UI Overlay --- */}
      <TodosNavigationMenu
        viewMode={viewMode}
        onCycleViewMode={handleCycleViewMode}
        isGraveyardOpen={graveyard.isOpen}
        onToggleGraveyard={() => graveyard.setIsOpen(!graveyard.isOpen)}
        workMode={workMode}
        weekCategory={weekCategory}
        onToggleCategory={() => setWeekCategory(weekCategory === 'life' ? 'work' : 'life')}
        onPrev={viewNav.handlePrev}
        onCurrent={viewNav.handleCurrent}
        onNext={viewNav.handleNext}
        onScrollToToday={handleScrollToToday}
        isFocusedToday={isFocusedToday}
        isFutureDate={isFutureDate}
      />

      <Graveyard
        isOpen={graveyard.isOpen}
        tasks={graveyard.tasks}
        isOverGraveyard={isOverGraveyard}
        onClose={() => graveyard.setIsOpen(false)}
        onResurrect={graveyard.resurrectFromGraveyard}
        onDelete={graveyard.deleteGraveyardTask}
        isLoading={graveyard.isLoading}
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
