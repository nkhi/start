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
 * - Day and Week view modes
 * - Work/Life category separation
 * - Task state accordions (open, done, cancelled)
 * - Cross-container drag-and-drop
 * - Graveyard for archived tasks
 */

import { useEffect, useState, useCallback } from 'react';
import { Check, X, CaretDown, ArrowRight, ArrowBendDownRight, Ghost } from '@phosphor-icons/react';
import { DayWeek, type DayWeekColumnData } from '../shared/DayWeek';
import { WeekView } from './WeekView';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { useTaskDragAndDrop, createContainerId } from '../../hooks/useTaskDragAndDrop';
import { DraggableTask, TaskDragOverlay } from './DraggableTask';
import { SortableTaskList } from './SortableTaskList';
import { Graveyard } from './Graveyard';
import { DateUtility } from '../../utils';

// hooks
import { useTaskOperations } from '../../hooks/useTaskOperations';
import { useGraveyard } from '../../hooks/useGraveyard';
import { useWeekNavigation } from '../../hooks/useWeekNavigation';
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
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [weekCategory, setWeekCategory] = useState<TaskCategory>(workMode ? 'work' : 'life');
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({});

  // Sync category with work mode
  useEffect(() => {
    setWeekCategory(workMode ? 'work' : 'life');
  }, [workMode]);

  // ----------------------------------------
  // Hooks
  // ----------------------------------------

  const taskOps = useTaskOperations({ workMode });
  const weekNav = useWeekNavigation({ workMode });

  const graveyard = useGraveyard({
    workMode,
    tasks: taskOps.tasks,
    setTasks: taskOps.setTasks,
  });

  // Load week tasks when in week mode
  useEffect(() => {
    if (viewMode === 'week' && weekNav.weekDates.length > 0) {
      taskOps.loadWeekTasks(weekNav.weekDates[0], weekNav.weekDates[weekNav.weekDates.length - 1]);
    }
  }, [viewMode, weekNav.weekDates]);

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

  // Week View: Prefetch the full visible week
  useEffect(() => {
    if (viewMode !== 'week' || !calendarContext || weekNav.weekDates.length === 0) return;

    const startDate = weekNav.weekDates[0];
    const endDate = weekNav.weekDates[weekNav.weekDates.length - 1];

    calendarContext.prefetchDateRange(startDate, endDate);
  }, [viewMode, weekNav.weekDates, calendarContext]);

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
            <span className={styles.todoText}>{task.text}</span>
          </div>
          <TaskActionsOverlay
            onMoveToTop={() => taskOps.moveTaskToTop(dateStr, task.id)}
            onPunt={() => taskOps.puntTask(dateStr, task.id)}
            onDelete={() => taskOps.deleteTask(dateStr, task.id)}
            onGraveyard={() => graveyard.sendToGraveyard(dateStr, task.id)}
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
    const dayTasks = taskOps.tasks[dateStr] || [];

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
          <CalendarPopover date={date} />
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
              {viewMode === 'day' && (
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

    const frValues = weekNav.weekDates.map(date => {
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
      {viewMode === 'week' ? (
        <WeekView
          renderColumn={renderTodoColumn}
          weekDates={weekNav.weekDates}
          onPrevWeek={weekNav.handlePrevWeek}
          onNextWeek={weekNav.handleNextWeek}
          onCurrentWeek={weekNav.handleCurrentWeek}
          onClose={() => setViewMode('day')}
          onGraveyardClick={() => graveyard.setIsOpen(!graveyard.isOpen)}
          isGraveyardOpen={graveyard.isOpen}
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
          onGraveyardClick={() => graveyard.setIsOpen(!graveyard.isOpen)}
          isGraveyardOpen={graveyard.isOpen}
          workMode={workMode}
        />
      )}

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
