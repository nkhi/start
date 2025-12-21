import type { Habit, HabitEntry } from '../types';
import { fetchWithErrorReporting } from './errorReporter';
import { API_BASE_URL } from '../config';

export async function getHabits(): Promise<Habit[]> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/habits`);
  if (!response.ok) throw new Error('Failed to fetch habits');
  return response.json();
}

export async function getEntries(from: string, to: string): Promise<HabitEntry[]> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/habit-entries?from=${from}&to=${to}`);
  if (!response.ok) throw new Error('Failed to fetch entries');
  return response.json();
}

export async function saveEntry(entry: Partial<HabitEntry>): Promise<void> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/habit-entry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  });
  if (!response.ok) throw new Error('Failed to save entry');
}

export async function updateEntryComment(entryId: string, comment: string | null): Promise<void> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/habit-entry/${entryId}/comment`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment })
  });
  if (!response.ok) throw new Error('Failed to update entry comment');
}
