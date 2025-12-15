import type { Task } from '../types';

export async function getTasks(baseUrl: string): Promise<Record<string, Task[]>> {
  const response = await fetch(`${baseUrl}/tasks`);
  if (!response.ok) throw new Error('Failed to fetch tasks');
  return response.json();
}

export async function getWorkTasks(baseUrl: string): Promise<Record<string, Task[]>> {
  const response = await fetch(`${baseUrl}/tasks/work`);
  if (!response.ok) throw new Error('Failed to fetch work tasks');
  return response.json();
}

export async function getTasksForWeek(baseUrl: string, start: string, end: string): Promise<Record<string, Task[]>> {
  const response = await fetch(`${baseUrl}/tasks/week?start=${start}&end=${end}`);
  if (!response.ok) throw new Error('Failed to fetch tasks for week');
  return response.json();
}

export async function createTask(baseUrl: string, task: Task): Promise<void> {
  const response = await fetch(`${baseUrl}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task)
  });
  if (!response.ok) throw new Error('Failed to create task');
}

export async function updateTask(baseUrl: string, id: string, updates: Partial<Task>): Promise<Task> {
  const response = await fetch(`${baseUrl}/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!response.ok) throw new Error('Failed to update task');
  return response.json();
}

export async function deleteTask(baseUrl: string, id: string): Promise<void> {
  const response = await fetch(`${baseUrl}/tasks/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete task');
}
