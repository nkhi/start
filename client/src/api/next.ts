import type { Note } from '../types';
import { fetchWithErrorReporting } from './errorReporter';
import { API_BASE_URL } from '../config';

export async function getNotes(): Promise<Note[]> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/next`);
  if (!response.ok) throw new Error('Failed to fetch notes');
  return response.json();
}

export async function createNote(note: Partial<Note>): Promise<Note> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/next`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(note)
  });
  if (!response.ok) throw new Error('Failed to create note');
  return response.json();
}

export async function updateNote(id: string, updates: Partial<Note>): Promise<Note> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/next/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!response.ok) throw new Error('Failed to update note');
  return response.json();
}
