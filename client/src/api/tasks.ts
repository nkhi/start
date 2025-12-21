import type { Task } from '../types';
import { fetchWithErrorReporting } from './errorReporter';
import { API_BASE_URL } from '../config';

export type GroupedTasks = Record<string, {
  active: Task[];
  completed: Task[];
  failed: Task[];
}>;

export async function getTasks(): Promise<Record<string, Task[]>> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/tasks`);
  if (!response.ok) throw new Error('Failed to fetch tasks');
  return response.json();
}

export async function getWorkTasks(): Promise<Record<string, Task[]>> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/tasks/work`);
  if (!response.ok) throw new Error('Failed to fetch work tasks');
  return response.json();
}

export async function getTasksForWeek(start: string, end: string): Promise<Record<string, Task[]>> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/tasks/week?start=${start}&end=${end}`);
  if (!response.ok) throw new Error('Failed to fetch tasks for week');
  return response.json();
}

export async function getGroupedTasks(category?: 'life' | 'work'): Promise<GroupedTasks> {
  const url = category
    ? `${API_BASE_URL}/tasks/grouped?category=${category}`
    : `${API_BASE_URL}/tasks/grouped`;
  const response = await fetchWithErrorReporting(url);
  if (!response.ok) throw new Error('Failed to fetch grouped tasks');
  return response.json();
}

export type TaskCounts = Record<string, {
  active: number;
  completed: number;
  failed: number;
}>;

export async function getTaskCounts(category?: 'life' | 'work'): Promise<TaskCounts> {
  const url = category
    ? `${API_BASE_URL}/tasks/counts?category=${category}`
    : `${API_BASE_URL}/tasks/counts`;
  const response = await fetchWithErrorReporting(url);
  if (!response.ok) throw new Error('Failed to fetch task counts');
  return response.json();
}

export async function createTask(task: Task): Promise<void> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task)
  });
  if (!response.ok) throw new Error('Failed to create task');
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!response.ok) throw new Error('Failed to update task');
  return response.json();
}

export async function deleteTask(id: string): Promise<void> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/tasks/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete task');
}

export async function batchPuntTasks(
  taskIds: string[],
  sourceDate: string,
  targetDate: string
): Promise<{ ok: boolean; newTasks: Task[] }> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/tasks/batch/punt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskIds, sourceDate, targetDate })
  });
  if (!response.ok) throw new Error('Failed to batch punt tasks');
  return response.json();
}

export async function batchFailTasks(taskIds: string[]): Promise<void> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/tasks/batch/fail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskIds })
  });
  if (!response.ok) throw new Error('Failed to batch fail tasks');
}

export async function batchGraveyardTasks(taskIds: string[]): Promise<void> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/tasks/batch/graveyard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskIds })
  });
  if (!response.ok) throw new Error('Failed to batch graveyard tasks');
}

export async function reorderTask(
  id: string,
  order: string,
  options?: { date?: string; category?: 'life' | 'work'; state?: 'active' | 'completed' | 'failed' }
): Promise<Task> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/tasks/${id}/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order, ...options })
  });
  if (!response.ok) throw new Error('Failed to reorder task');
  return response.json();
}

export interface ReorderMove {
  id: string;
  order: string;
  date?: string;
  category?: 'life' | 'work';
  state?: 'active' | 'completed' | 'failed';
}

export async function batchReorderTasks(moves: ReorderMove[]): Promise<void> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/tasks/batch/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ moves })
  });
  if (!response.ok) throw new Error('Failed to batch reorder tasks');
}

export async function getGraveyardTasks(): Promise<Task[]> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/tasks/graveyard`);
  if (!response.ok) throw new Error('Failed to fetch graveyard tasks');
  return response.json();
}

export async function getWorkGraveyardTasks(): Promise<Task[]> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/tasks/graveyard/work`);
  if (!response.ok) throw new Error('Failed to fetch work graveyard tasks');
  return response.json();
}

export async function graveyardTask(id: string): Promise<Task> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/tasks/${id}/graveyard`, {
    method: 'PATCH'
  });
  if (!response.ok) throw new Error('Failed to graveyard task');
  return response.json();
}

export async function resurrectTask(id: string, date: string): Promise<Task> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/tasks/${id}/resurrect`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date })
  });
  if (!response.ok) throw new Error('Failed to resurrect task');
  return response.json();
}
