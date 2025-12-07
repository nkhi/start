import React, { useEffect, useState, useRef } from 'react';
import { HabitAPI } from '../../api';
import type { Task } from '../../types';
import { generateId, DateUtility } from '../../utils';
import { Trash, Check, X, ArrowBendDownRight } from '@phosphor-icons/react';
import { DayWeek, type DayWeekColumnData } from '../shared/DayWeek';
import { WeekView } from './WeekView';
import styles from './Todos.module.css';

interface TodosProps {
  apiBaseUrl: string;
}

export function Todos({ apiBaseUrl }: TodosProps) {
  const [tasks, setTasks] = useState<Record<string, Task[]>>({});
  const [newTaskTexts, setNewTaskTexts] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [weekCategory, setWeekCategory] = useState<'life' | 'work'>('life');
  const api = useRef(new HabitAPI(apiBaseUrl)).current;
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    loadTasks();

    return () => {
      // Cleanup debounce timers on unmount
      Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  async function loadTasks() {
    try {
      const data = await api.getTasks();
      setTasks(data || {});
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }

  async function loadWeekTasks(start: Date, end: Date) {
    try {
      const startStr = DateUtility.formatDate(start);
      const endStr = DateUtility.formatDate(end);
      const data = await api.getTasksForWeek(startStr, endStr);
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
      await api.createTask(newTask);
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
    const debounceKey = `${dateStr}_${taskId}`;
    if (debounceTimers.current[debounceKey]) {
      clearTimeout(debounceTimers.current[debounceKey]);
    }

    debounceTimers.current[debounceKey] = setTimeout(async () => {
      try {
        await api.updateTask(taskId, {
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
      await api.updateTask(taskId, { state: 'failed', completed: false });
      // Create new task
      await api.createTask(newTask);
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
      await api.deleteTask(taskId);
    } catch (error) {
      console.error('Failed to delete task:', error);
      // Revert optimistic update on error
      setTasks(tasks);
    }
  }

  const renderTodoColumn = ({ date, dateStr, isToday }: DayWeekColumnData) => {
    const dayTasks = tasks[dateStr] || [];
    const sortTasks = (taskList: Task[]) => {
      return [...taskList].sort((a, b) => {
        const stateA = a.state || (a.completed ? 'completed' : 'active');
        const stateB = b.state || (b.completed ? 'completed' : 'active');

        const isAActive = stateA === 'active';
        const isBActive = stateB === 'active';

        if (isAActive && !isBActive) return -1;
        if (!isAActive && isBActive) return 1;
        return 0;
      });
    };

    const lifeTasks = sortTasks(dayTasks.filter(t => !t.category || t.category === 'life'));
    const workTasks = sortTasks(dayTasks.filter(t => t.category === 'work'));

    const showLife = viewMode === 'day' || weekCategory === 'life';
    const showWork = viewMode === 'day' || weekCategory === 'work';

    return (
      <>
        <div className={styles.todoColumnHeader}>
          <span className={`${styles.todoDate} ${isToday ? 'today' : ''}`}>
            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          <span className={styles.todoDayName}>
            {date.toLocaleDateString('en-US', { weekday: 'short' })}
          </span>
        </div>

        <div className={styles.todoContentRow}>
          {showLife && (
            <div className={styles.todoCategorySection}>
              {viewMode === 'day' && <div className={styles.todoCategoryHeader}>Life</div>}
              <form onSubmit={(e) => addTask(e, dateStr, 'life')} className={styles.todoInputFormSmall}>
                <input
                  type="text"
                  value={newTaskTexts[`${dateStr}_life`] || ''}
                  onChange={(e) => setNewTaskTexts({ ...newTaskTexts, [`${dateStr}_life`]: e.target.value })}
                  placeholder="Add task"
                  className={styles.todoInputSmall}
                />
              </form>
              <div className={styles.todoItems}>
                {lifeTasks.map(task => {
                  const taskState = task.state || (task.completed ? 'completed' : 'active');
                  return (
                    <div
                      key={task.id}
                      className={`${styles.todoItem} ${styles[taskState] || ''}`}
                      onClick={() => toggleTask(dateStr, task.id)}
                    >
                      <div className={styles.todoItemContent}>
                        <button
                          type="button"
                          className={`${styles.todoCheckBtn} ${styles[taskState] || ''}`}
                        >
                          {taskState === 'completed' && <Check size={12} weight="bold" />}
                          {taskState === 'failed' && <X size={12} weight="bold" />}
                        </button>
                        <span className={styles.todoText}>{task.text}</span>
                      </div>
                      <div className={styles.todoActions}>
                        <button
                          className={styles.todoCloneBtn}
                          onClick={(e) => { e.stopPropagation(); puntTask(dateStr, task.id); }}
                          title="Fail & Punt to Next Day"
                        >
                          <ArrowBendDownRight size={14} />
                        </button>
                        <button
                          className={styles.todoDeleteBtn}
                          onClick={(e) => { e.stopPropagation(); deleteTask(dateStr, task.id); }}
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {showWork && (
            <div className={styles.todoCategorySection}>
              {viewMode === 'day' && <div className={styles.todoCategoryHeader}>Work</div>}
              <form onSubmit={(e) => addTask(e, dateStr, 'work')} className={styles.todoInputFormSmall}>
                <input
                  type="text"
                  value={newTaskTexts[`${dateStr}_work`] || ''}
                  onChange={(e) => setNewTaskTexts({ ...newTaskTexts, [`${dateStr}_work`]: e.target.value })}
                  placeholder="Add task"
                  className={styles.todoInputSmall}
                />
              </form>
              <div className={styles.todoItems}>
                {workTasks.map(task => {
                  const taskState = task.state || (task.completed ? 'completed' : 'active');
                  return (
                    <div
                      key={task.id}
                      className={`${styles.todoItem} ${styles[taskState] || ''}`}
                      onClick={() => toggleTask(dateStr, task.id)}
                    >
                      <div className={styles.todoItemContent}>
                        <button
                          type="button"
                          className={`${styles.todoCheckBtn} ${styles[taskState] || ''}`}
                        >
                          {taskState === 'completed' && <Check size={12} weight="bold" />}
                          {taskState === 'failed' && <X size={12} weight="bold" />}
                        </button>
                        <span className={styles.todoText}>{task.text}</span>
                      </div>

                      <div className={styles.todoActions}>
                        <button
                          className={styles.todoCloneBtn}
                          onClick={(e) => { e.stopPropagation(); puntTask(dateStr, task.id); }}
                          title="Fail & Punt to Next Day"
                        >
                          <ArrowBendDownRight size={14} />
                        </button>
                        <button
                          className={styles.todoDeleteBtn}
                          onClick={(e) => { e.stopPropagation(); deleteTask(dateStr, task.id); }}
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
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
              className={`${styles.toggleBtn} ${weekCategory === 'life' ? styles.active : ''}`}
              onClick={() => setWeekCategory('life')}
            >
              Life
            </button>
            <button
              className={`${styles.toggleBtn} ${weekCategory === 'work' ? styles.active : ''}`}
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
    <DayWeek
      renderColumn={renderTodoColumn}
      className={styles.todosScrollContainer}
      columnClassName={styles.todoColumn}
      onMoreClick={() => setViewMode('week')}
    />
  );
}
