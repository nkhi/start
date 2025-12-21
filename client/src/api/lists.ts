import type { List } from '../types';
import { fetchWithErrorReporting } from './errorReporter';
import { API_BASE_URL } from '../config';

export async function getLists(): Promise<List[]> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/lists`);
  if (!response.ok) throw new Error('Failed to fetch lists');
  return response.json();
}

export async function createList(list: Partial<List>): Promise<List> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/lists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(list)
  });
  if (!response.ok) throw new Error('Failed to create list');
  return response.json();
}

export async function updateList(id: string, updates: Partial<List>): Promise<List> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/lists/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!response.ok) throw new Error('Failed to update list');
  return response.json();
}

export async function deleteList(id: string): Promise<void> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/lists/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete list');
}

export async function reorderList(id: string, order: string): Promise<List> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/lists/${id}/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order })
  });
  if (!response.ok) throw new Error('Failed to reorder list');
  return response.json();
}

export async function reorderListItems(listId: string, itemOrder: string[]): Promise<void> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/lists/${listId}/reorder-items`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemOrder })
  });
  if (!response.ok) throw new Error('Failed to reorder list items');
}

export async function reorderLists(listOrder: string[]): Promise<void> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/lists/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listOrder })
  });
  if (!response.ok) throw new Error('Failed to reorder lists');
}
