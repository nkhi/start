/**
 * useTaskOperations Hook
 * 
 * Central hub for all task CRUD operations. This hook manages the main task state
 * and provides optimistic updates with error rollback for all mutations.
 * 
 * ## Responsibilities:
 * - Task state (`Record<string, Task[]>` keyed by date)
 * - New task input state (text fields)
 * - All task mutations: add, toggle, setState, delete, punt, move to top
 * - Batch operations: punt all, fail all, graveyard all
 * - Data loading from API
 * 
 * ## Design Decisions:
 * - Optimistic updates: UI updates immediately, rolls back on API error
 * - Debounced saves: toggleTask/setTaskState debounce API calls by 3s
 * - Work mode awareness: punt operations skip weekends in work mode
 * 
 * ## Usage:
 * ```tsx
 * const ops = useTaskOperations({ workMode });
 * // ops.addTask(e, dateStr, 'work')
 * // ops.puntTask(dateStr, taskId)
 * ```
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Task } from '../types';
import {
    getTasks,
    getWorkTasks,
    getTasksForWeek,
    createTask,
    updateTask,
    deleteTask as apiDeleteTask,
    batchPuntTasks,
    batchFailTasks,
    batchGraveyardTasks,
    reorderTask,
} from '../api/tasks';
import { generateId, DateUtility } from '../utils';
import { getOrderBefore, sortByOrder } from '../utils/orderUtils';
import {
    getTaskCategory,
    getTaskState,
    calculatePuntDays,
    type TaskCategory,
    type TaskState,
} from '../components/todos/taskUtils';

export interface UseTaskOperationsOptions {
    workMode: boolean;
}

export interface UseTaskOperationsReturn {
    // State
    tasks: Record<string, Task[]>;
    setTasks: React.Dispatch<React.SetStateAction<Record<string, Task[]>>>;
    newTaskTexts: Record<string, string>;
    setNewTaskTexts: React.Dispatch<React.SetStateAction<Record<string, string>>>;

    // Data loading
    loadTasks: () => Promise<void>;
    loadWeekTasks: (start: Date, end: Date) => Promise<void>;

    // Single task operations
    addTask: (e: React.FormEvent, dateStr: string, category: TaskCategory) => Promise<void>;
    toggleTask: (dateStr: string, taskId: string) => void;
    setTaskState: (dateStr: string, taskId: string, newState: TaskState) => void;
    deleteTask: (dateStr: string, taskId: string) => Promise<void>;
    puntTask: (dateStr: string, taskId: string) => Promise<void>;
    moveTaskToTop: (dateStr: string, taskId: string) => Promise<void>;

    // Batch operations
    batchPuntAllTasks: (dateStr: string, taskIds: string[], category: TaskCategory) => Promise<void>;
    batchFailAllTasks: (dateStr: string, taskIds: string[]) => Promise<void>;
    batchGraveyardAllTasks: (dateStr: string, taskIds: string[]) => Promise<void>;

    // Field updates
    updateTaskText: (dateStr: string, taskId: string, newText: string) => void;
    updateTaskDate: (dateStr: string, taskId: string, newDateStr: string) => Promise<void>;
}

export function useTaskOperations({ workMode }: UseTaskOperationsOptions): UseTaskOperationsReturn {
    const [tasks, setTasks] = useState<Record<string, Task[]>>({});
    const [newTaskTexts, setNewTaskTexts] = useState<Record<string, string>>({});
    const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    // Cleanup debounce timers on unmount
    useEffect(() => {
        return () => {
            Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
        };
    }, []);

    // ----------------------------------------
    // Data Loading
    // ----------------------------------------

    const loadTasks = useCallback(async () => {
        try {
            const data = workMode
                ? await getWorkTasks()
                : await getTasks();
            setTasks(data || {});
        } catch (error) {
            console.error('Failed to load tasks:', error);
        }
    }, [workMode]);

    const loadWeekTasks = useCallback(async (start: Date, end: Date) => {
        try {
            const startStr = DateUtility.formatDate(start);
            const endStr = DateUtility.formatDate(end);
            const data = await getTasksForWeek(startStr, endStr);
            setTasks(prev => ({ ...prev, ...data }));
        } catch (error) {
            console.error('Failed to load week tasks:', error);
        }
    }, []);

    // Load tasks on mount
    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    // ----------------------------------------
    // Single Task Operations
    // ----------------------------------------

    /**
     * Add a new task to a specific date and category.
     */
    const addTask = useCallback(async (e: React.FormEvent, dateStr: string, category: TaskCategory) => {
        e.preventDefault();
        const inputKey = `${dateStr}_${category}`;
        const text = newTaskTexts[inputKey];
        if (!text?.trim()) return;

        // createdAt at noon on target date (not "now") for accurate puntDays
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
        setTasks(prev => ({ ...prev, [dateStr]: [...(prev[dateStr] || []), newTask] }));
        setNewTaskTexts(prev => ({ ...prev, [inputKey]: '' }));

        try {
            await createTask(newTask);
        } catch (error) {
            console.error('Failed to create task:', error);
            setTasks(prev => ({ ...prev, [dateStr]: currentDayTasks }));
        }
    }, [tasks, newTaskTexts]);

    /**
     * Cycle task state: active → completed → failed → active
     * Debounces API save by 3 seconds.
     */
    const toggleTask = useCallback((dateStr: string, taskId: string) => {
        const currentDayTasks = tasks[dateStr] || [];
        const currentTask = currentDayTasks.find(t => t.id === taskId);
        if (!currentTask) return;

        const currentState = getTaskState(currentTask);
        let newState: TaskState;

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

        setTasks(prev => ({
            ...prev,
            [dateStr]: (prev[dateStr] || []).map(t => t.id === taskId ? updatedTask : t)
        }));

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
                setTasks(prev => ({ ...prev, [dateStr]: currentDayTasks }));
            }
            delete debounceTimers.current[debounceKey];
        }, 3000);
    }, [tasks]);

    /**
     * Set task to a specific state (completed or failed).
     * Debounces API save by 3 seconds.
     */
    const setTaskStateFn = useCallback((dateStr: string, taskId: string, newState: TaskState) => {
        const currentDayTasks = tasks[dateStr] || [];
        const currentTask = currentDayTasks.find(t => t.id === taskId);
        if (!currentTask) return;

        const updatedTask = {
            ...currentTask,
            completed: newState === 'completed',
            state: newState
        };

        setTasks(prev => ({
            ...prev,
            [dateStr]: (prev[dateStr] || []).map(t => t.id === taskId ? updatedTask : t)
        }));

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
                setTasks(prev => ({ ...prev, [dateStr]: currentDayTasks }));
            }
            delete debounceTimers.current[debounceKey];
        }, 3000);
    }, [tasks]);

    /**
     * Delete a task from a specific date.
     */
    const deleteTaskFn = useCallback(async (dateStr: string, taskId: string) => {
        const currentDayTasks = tasks[dateStr] || [];

        setTasks(prev => ({
            ...prev,
            [dateStr]: (prev[dateStr] || []).filter(t => t.id !== taskId)
        }));

        try {
            await apiDeleteTask(taskId);
        } catch (error) {
            console.error('Failed to delete task:', error);
            setTasks(prev => ({ ...prev, [dateStr]: currentDayTasks }));
        }
    }, [tasks]);

    /**
     * Punt a task to the next day (or next workday in work mode).
     * In work mode, Friday punts to Monday.
     */
    const puntTask = useCallback(async (dateStr: string, taskId: string) => {
        const currentDayTasks = tasks[dateStr] || [];
        const taskToPunt = currentDayTasks.find(t => t.id === taskId);
        if (!taskToPunt) return;

        const today = new Date();
        const todayStr = DateUtility.formatDate(today);

        console.log('[PUNT DEBUG] Starting punt:', {
            sourceDate: dateStr,
            todayStr,
            workMode,
            taskText: taskToPunt.text,
            sourceIsInPast: dateStr < todayStr
        });

        let d: Date;

        if (dateStr >= todayStr) {
            // Future or today: punt to next day
            d = new Date(dateStr + 'T00:00:00');
            d.setDate(d.getDate() + 1);
            console.log('[PUNT DEBUG] Future date: punting to next day:', d.toString());
        } else {
            // Past date: punt to today
            d = new Date(todayStr + 'T00:00:00');
            console.log('[PUNT DEBUG] Past date: punting to today:', d.toString());
        }

        console.log('[PUNT DEBUG] Before weekend check:', {
            date: d.toString(),
            dayOfWeek: d.getDay(),
            dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]
        });

        // In work mode, ALWAYS skip weekends (whether punting from past or future)
        if (workMode) {
            while (d.getDay() === 0 || d.getDay() === 6) {
                console.log('[PUNT DEBUG] Skipping weekend day:', ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]);
                d.setDate(d.getDate() + 1);
            }
        }

        // Format as YYYY-MM-DD using local date parts
        const targetDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        console.log('[PUNT DEBUG] Final target date:', targetDateStr);

        const newPuntDays = calculatePuntDays(taskToPunt.createdAt, targetDateStr, taskToPunt.category as 'work' | 'life');

        const movedTask: Task = {
            ...taskToPunt,
            date: targetDateStr,
            state: 'active',
            completed: false,
            puntDays: newPuntDays
        };

        // Optimistic update
        setTasks(prev => {
            const updated = { ...prev };
            updated[dateStr] = (prev[dateStr] || []).filter(t => t.id !== taskId);
            updated[targetDateStr] = [...(prev[targetDateStr] || []), movedTask];
            return updated;
        });

        try {
            await updateTask(taskId, { date: targetDateStr, state: 'active', completed: false });
            console.log('[PUNT DEBUG] API call successful');
        } catch (error) {
            console.error('Failed to punt task:', error);
            setTasks(prev => ({ ...prev, [dateStr]: currentDayTasks }));
        }
    }, [tasks, workMode]);

    /**
     * Move a task to the top of its list (within same category/state).
     */
    const moveTaskToTop = useCallback(async (dateStr: string, taskId: string) => {
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
        setTasks(prev => ({
            ...prev,
            [dateStr]: (prev[dateStr] || []).map(t => t.id === taskId ? { ...t, order: newOrder } : t)
        }));

        try {
            await reorderTask(taskId, newOrder);
        } catch (error) {
            console.error('Failed to move task to top:', error);
            setTasks(prev => ({ ...prev, [dateStr]: currentDayTasks }));
        }
    }, [tasks]);

    /**
     * Update task text.
     * Debounces API save by 1 second.
     */
    const updateTaskText = useCallback((dateStr: string, taskId: string, newText: string) => {
        const currentDayTasks = tasks[dateStr] || [];
        const currentTask = currentDayTasks.find(t => t.id === taskId);
        if (!currentTask) return;

        setTasks(prev => ({
            ...prev,
            [dateStr]: (prev[dateStr] || []).map(t => t.id === taskId ? { ...t, text: newText } : t)
        }));

        const debounceKey = `${dateStr}_${taskId}_text`;
        if (debounceTimers.current[debounceKey]) {
            clearTimeout(debounceTimers.current[debounceKey]);
        }

        debounceTimers.current[debounceKey] = setTimeout(async () => {
            try {
                await updateTask(taskId, { text: newText });
            } catch (error) {
                console.error('Failed to update task text:', error);
            }
            delete debounceTimers.current[debounceKey];
        }, 1000);
    }, [tasks]);

    /**
     * Update task date.
     */
    const updateTaskDate = useCallback(async (dateStr: string, taskId: string, newDateStr: string) => {
        if (dateStr === newDateStr) return; // No change

        const currentDayTasks = tasks[dateStr] || [];
        const taskToMove = currentDayTasks.find(t => t.id === taskId);
        if (!taskToMove) return;

        const newPuntDays = calculatePuntDays(taskToMove.createdAt, newDateStr, taskToMove.category as 'work' | 'life');

        const movedTask: Task = {
            ...taskToMove,
            date: newDateStr,
            puntDays: newPuntDays
        };

        // Optimistic update
        setTasks(prev => {
            const updated = { ...prev };
            updated[dateStr] = (prev[dateStr] || []).filter(t => t.id !== taskId);
            updated[newDateStr] = [...(prev[newDateStr] || []), movedTask];
            return updated;
        });

        try {
            await updateTask(taskId, { date: newDateStr });
        } catch (error) {
            console.error('Failed to update task date:', error);
            // Rollback
            setTasks(prev => ({
                ...prev,
                [dateStr]: [...(prev[dateStr] || []), taskToMove],
                [newDateStr]: (prev[newDateStr] || []).filter(t => t.id !== taskId)
            }));
        }
    }, [tasks]);

    // ----------------------------------------
    // Batch Operations
    // ----------------------------------------

    /**
     * Punt all specified tasks to the next day (or next workday).
     */
    const batchPuntAllTasks = useCallback(async (dateStr: string, taskIds: string[], _category: TaskCategory) => {
        if (taskIds.length === 0) return;

        const today = new Date();
        const todayStr = DateUtility.formatDate(today);

        let d: Date;
        if (dateStr >= todayStr) {
            // Future or today: punt to next day
            d = new Date(dateStr + 'T00:00:00');
            d.setDate(d.getDate() + 1);
        } else {
            // Past date: punt to today
            d = new Date(todayStr + 'T00:00:00');
        }

        // In work mode, ALWAYS skip weekends
        if (workMode) {
            while (d.getDay() === 0 || d.getDay() === 6) {
                d.setDate(d.getDate() + 1);
            }
        }

        // Format as YYYY-MM-DD using local date parts
        const targetDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        const currentDayTasks = tasks[dateStr] || [];
        const targetDayTasks = tasks[targetDateStr] || [];

        const tasksToPunt = currentDayTasks.filter(t => taskIds.includes(t.id));
        const movedTasks = tasksToPunt.map(t => ({
            ...t,
            date: targetDateStr,
            state: 'active' as const,
            completed: false,
            puntDays: calculatePuntDays(t.createdAt, targetDateStr, t.category as 'work' | 'life')
        }));

        // Optimistic update
        setTasks(prev => ({
            ...prev,
            [dateStr]: (prev[dateStr] || []).filter(t => !taskIds.includes(t.id)),
            [targetDateStr]: [...(prev[targetDateStr] || []), ...movedTasks]
        }));

        try {
            await batchPuntTasks(taskIds, dateStr, targetDateStr);
        } catch (error) {
            console.error('Failed to batch punt tasks:', error);
            setTasks(prev => ({
                ...prev,
                [dateStr]: currentDayTasks,
                [targetDateStr]: targetDayTasks
            }));
        }
    }, [tasks, workMode]);

    /**
     * Fail all specified tasks.
     */
    const batchFailAllTasks = useCallback(async (dateStr: string, taskIds: string[]) => {
        if (taskIds.length === 0) return;

        const currentDayTasks = tasks[dateStr] || [];

        setTasks(prev => ({
            ...prev,
            [dateStr]: (prev[dateStr] || []).map(t =>
                taskIds.includes(t.id) ? { ...t, state: 'failed' as const, completed: false } : t
            )
        }));

        try {
            await batchFailTasks(taskIds);
        } catch (error) {
            console.error('Failed to batch fail tasks:', error);
            setTasks(prev => ({ ...prev, [dateStr]: currentDayTasks }));
        }
    }, [tasks]);

    /**
     * Send all specified tasks to the graveyard.
     */
    const batchGraveyardAllTasks = useCallback(async (dateStr: string, taskIds: string[]) => {
        if (taskIds.length === 0) return;

        const currentDayTasks = tasks[dateStr] || [];

        setTasks(prev => ({
            ...prev,
            [dateStr]: (prev[dateStr] || []).filter(t => !taskIds.includes(t.id))
        }));

        try {
            await batchGraveyardTasks(taskIds);
        } catch (error) {
            console.error('Failed to batch graveyard tasks:', error);
            setTasks(prev => ({ ...prev, [dateStr]: currentDayTasks }));
        }
    }, [tasks]);

    return {
        tasks,
        setTasks,
        newTaskTexts,
        setNewTaskTexts,
        loadTasks,
        loadWeekTasks,
        addTask,
        toggleTask,
        setTaskState: setTaskStateFn,
        deleteTask: deleteTaskFn,
        puntTask,
        moveTaskToTop,
        batchPuntAllTasks,
        batchFailAllTasks,
        batchGraveyardAllTasks,
        updateTaskText,
        updateTaskDate,
    };
}
