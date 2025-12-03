import React, { useEffect, useState, useRef } from 'react';
import { HabitAPI } from '../api';
import type { Task } from '../types';
import { generateId, DateUtility } from '../utils';
import { Trash, Check, X, ArrowBendDownRight } from '@phosphor-icons/react';
import { DayWeek, type DayWeekColumnData } from './DayWeek';

interface TodosProps {
  apiBaseUrl: string;
}

export function Todos({ apiBaseUrl }: TodosProps) {
  const [tasks, setTasks] = useState<Record<string, Task[]>>({});
  const [newTaskTexts, setNewTaskTexts] = useState<Record<string, string>>({});
  const api = useRef(new HabitAPI(apiBaseUrl)).current;

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      const data = await api.getTasks();
      setTasks(data || {});
    } catch (error) {
      console.error('Failed to load tasks:', error);
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

  async function toggleTask(dateStr: string, taskId: string) {
    const currentDayTasks = tasks[dateStr] || [];
    const task = currentDayTasks.find(t => t.id === taskId);
    if (!task) return;
    
    const currentState = task.state || (task.completed ? 'completed' : 'active');
    let newState: 'active' | 'completed' | 'failed';
    
    if (currentState === 'active') {
      newState = 'completed';
    } else {
      // If completed or failed, go back to active
      newState = 'active';
    }
    
    // Optimistic update
    const updatedDayTasks = currentDayTasks.map(t => 
      t.id === taskId 
        ? { ...t, completed: newState === 'completed', state: newState }
        : t
    );
    const updatedTasks = { ...tasks, [dateStr]: updatedDayTasks };
    
    setTasks(updatedTasks);
    
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
    
    return (
      <>
        <div className="todo-column-header">
          <span className={`todo-date ${isToday ? 'today' : ''}`}>
            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          <span className="todo-day-name">
            {date.toLocaleDateString('en-US', { weekday: 'short' })}
          </span>
        </div>
        
        <div className="todo-content-row">
          <div className="todo-category-section">
            <div className="todo-category-header">Life</div>
            <form onSubmit={(e) => addTask(e, dateStr, 'life')} className="todo-input-form-small">
               <input
                type="text"
                value={newTaskTexts[`${dateStr}_life`] || ''}
                onChange={(e) => setNewTaskTexts({ ...newTaskTexts, [`${dateStr}_life`]: e.target.value })}
                placeholder="Add task"
                className="todo-input-small"
              />
            </form>
            <div className="todo-items">
              {lifeTasks.map(task => {
                const taskState = task.state || (task.completed ? 'completed' : 'active');
                return (
                  <div key={task.id} className={`todo-item ${taskState}`}>
                    <div className="todo-item-content">
                      <button 
                        className={`todo-check-btn ${taskState}`}
                        onClick={() => toggleTask(dateStr, task.id)}
                      >
                        {taskState === 'completed' && <Check size={12} weight="bold" />}
                        {taskState === 'failed' && <X size={12} weight="bold" />}
                      </button>
                      <span className="todo-text">{task.text}</span>
                    </div>
                    <div className="todo-actions">
                      <button 
                        className="todo-clone-btn"
                        onClick={() => puntTask(dateStr, task.id)}
                        title="Fail & Punt to Next Day"
                      >
                        <ArrowBendDownRight size={14} />
                      </button>
                      <button 
                        className="todo-delete-btn"
                        onClick={() => deleteTask(dateStr, task.id)}
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="todo-category-section">
            <div className="todo-category-header">Work</div>
            <form onSubmit={(e) => addTask(e, dateStr, 'work')} className="todo-input-form-small">
               <input
                type="text"
                value={newTaskTexts[`${dateStr}_work`] || ''}
                onChange={(e) => setNewTaskTexts({ ...newTaskTexts, [`${dateStr}_work`]: e.target.value })}
                placeholder="Add task"
                className="todo-input-small"
              />
            </form>
            <div className="todo-items">
              {workTasks.map(task => {
                const taskState = task.state || (task.completed ? 'completed' : 'active');
                return (
                  <div key={task.id} className={`todo-item ${taskState}`}>
                    <div className="todo-item-content">
                      <button 
                        className={`todo-check-btn ${taskState}`}
                        onClick={() => toggleTask(dateStr, task.id)}
                      >
                        {taskState === 'completed' && <Check size={12} weight="bold" />}
                        {taskState === 'failed' && <X size={12} weight="bold" />}
                      </button>
                      <span className="todo-text">{task.text}</span>
                    </div>
                    <div className="todo-actions">
                      <button 
                        className="todo-clone-btn"
                        onClick={() => puntTask(dateStr, task.id)}
                        title="Fail & Punt to Next Day"
                      >
                        <ArrowBendDownRight size={14} />
                      </button>
                      <button 
                        className="todo-delete-btn"
                        onClick={() => deleteTask(dateStr, task.id)}
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <DayWeek
      renderColumn={renderTodoColumn}
      className="todos-scroll-container"
      columnClassName="todo-column"
    />
  );
}
