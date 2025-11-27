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
    // We need separate state for life/work inputs
    // But for now let's just use the same state object but key it differently?
    // Or just use a simple prompt? No, let's do it properly.
    // We need to update the state to handle categories.
    // Let's assume the current newTaskTexts is just for 'life' (default) or we need to change it.
    // Let's change newTaskTexts to be Record<string, {life: string, work: string}>
    
    // Actually, let's just use a composite key for the input state: `${dateStr}_${category}`
    const inputKey = `${dateStr}_${category}`;
    const text = newTaskTexts[inputKey];
    if (!text?.trim()) return;

    const newTask: Task = {
      id: generateId(),
      text: text,
      completed: false,
      date: dateStr,
      createdAt: new Date().toISOString(),
      category: category // We need to add this to the type
    };

    const currentDayTasks = tasks[dateStr] || [];
    const updatedDayTasks = [...currentDayTasks, newTask];
    const updatedTasks = { ...tasks, [dateStr]: updatedDayTasks };

    setTasks(updatedTasks);
    setNewTaskTexts({ ...newTaskTexts, [inputKey]: '' });
    await api.saveTasks(updatedTasks);
  }

  async function toggleTask(dateStr: string, taskId: string) {
    const currentDayTasks = tasks[dateStr] || [];
    const updatedDayTasks = currentDayTasks.map(t => {
      if (t.id !== taskId) return t;
      
      const currentState = t.state || (t.completed ? 'completed' : 'active');
      let newState: 'active' | 'completed' | 'failed';
      
      if (currentState === 'active') {
        newState = 'completed';
      } else {
        // If completed or failed, go back to active
        newState = 'active';
      }
      
      return { 
        ...t, 
        completed: newState === 'completed',
        state: newState 
      };
    });
    const updatedTasks = { ...tasks, [dateStr]: updatedDayTasks };
    
    setTasks(updatedTasks);
    await api.saveTasks(updatedTasks);
  }

  async function puntTask(dateStr: string, taskId: string) {
    const currentDayTasks = tasks[dateStr] || [];
    const taskToClone = currentDayTasks.find(t => t.id === taskId);
    if (!taskToClone) return;

    // 1. Mark original as failed
    const updatedOriginalDayTasks = currentDayTasks.map(t => 
      t.id === taskId ? { ...t, state: 'failed' as const, completed: false } : t
    );
    
    // 2. Determine target date
    // If task is in the past -> move to Today
    // If task is today or future -> move to Next Day
    const today = new Date();
    const todayStr = DateUtility.formatDate(today);
    
    let targetDateStr = todayStr;
    
    if (dateStr >= todayStr) {
      const d = new Date(dateStr);
      // Add 1 day. Since dateStr is YYYY-MM-DD (UTC), we can safely add 24h
      // But we need to be careful with timezone offsets if using local methods.
      // Let's stick to UTC operations to match DateUtility.formatDate
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
    
    const updatedTasks = { ...tasks };
    
    // Update original day
    updatedTasks[dateStr] = updatedOriginalDayTasks;
    
    // Update target day (append new task)
    // Note: if target day is same as original day (shouldn't happen with new logic unless logic is wrong),
    // we need to be careful not to overwrite.
    // But logic says: if dateStr < today, target=today (different).
    // If dateStr >= today, target=dateStr+1 (different).
    // So targetDateStr is always different from dateStr?
    // Wait. If dateStr < today (e.g. yesterday), target is today. They are different.
    // If dateStr == today, target is tomorrow. Different.
    // So we can safely update both keys.
    
    const targetDayTasks = updatedTasks[targetDateStr] || [];
    updatedTasks[targetDateStr] = [...targetDayTasks, newTask];

    setTasks(updatedTasks);
    await api.saveTasks(updatedTasks);
  }

  async function deleteTask(dateStr: string, taskId: string) {
    const currentDayTasks = tasks[dateStr] || [];
    const updatedDayTasks = currentDayTasks.filter(t => t.id !== taskId);
    const updatedTasks = { ...tasks, [dateStr]: updatedDayTasks };
    
    setTasks(updatedTasks);
    await api.saveTasks(updatedTasks);
  }

  const renderTodoColumn = ({ date, dateStr, isToday }: DayWeekColumnData) => {
    const dayTasks = tasks[dateStr] || [];
    const lifeTasks = dayTasks.filter(t => !t.category || t.category === 'life');
    const workTasks = dayTasks.filter(t => t.category === 'work');
    
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
