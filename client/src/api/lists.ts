import type { List } from '../types';
import { fetchWithErrorReporting } from './errorReporter';

export async function getLists(baseUrl: string): Promise<List[]> {
  const response = await fetchWithErrorReporting(`${baseUrl}/lists`);
  if (!response.ok) throw new Error('Failed to fetch lists');
  return response.json();
}

export async function createList(baseUrl: string, list: Partial<List>): Promise<List> {
  const response = await fetchWithErrorReporting(`${baseUrl}/lists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(list)
  });
  if (!response.ok) throw new Error('Failed to create list');
  return response.json();
}

export async function updateList(baseUrl: string, id: string, updates: Partial<List>): Promise<List> {
  const response = await fetchWithErrorReporting(`${baseUrl}/lists/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!response.ok) throw new Error('Failed to update list');
  return response.json();
}

export async function deleteList(baseUrl: string, id: string): Promise<void> {
  const response = await fetchWithErrorReporting(`${baseUrl}/lists/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete list');
}

// Reorder a list (update order only)
export async function reorderList(baseUrl: string, id: string, order: string): Promise<List> {
  const response = await fetchWithErrorReporting(`${baseUrl}/lists/${id}/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order })
  });
  if (!response.ok) throw new Error('Failed to reorder list');
  return response.json();
}

// Reorder items within a list (position update only - optimized)
export async function reorderListItems(baseUrl: string, listId: string, itemOrder: string[]): Promise<void> {
  const response = await fetchWithErrorReporting(`${baseUrl}/lists/${listId}/reorder-items`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemOrder })
  });
  if (!response.ok) throw new Error('Failed to reorder list items');
}

// Reorder lists (order update only - optimized, uses numeric ordering)
export async function reorderLists(baseUrl: string, listOrder: string[]): Promise<void> {
  const response = await fetchWithErrorReporting(`${baseUrl}/lists/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listOrder })
  });
  if (!response.ok) throw new Error('Failed to reorder lists');
}
