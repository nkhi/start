/**
 * Habits API
 *
 * REST wrappers + TanStack Query hooks for habits endpoints.
 *
 * STRUCTURE:
 *   1. Raw fetch functions (get*, create*, update*, delete*)
 *   2. TanStack Query hooks (use* for queries, use*Mutation for mutations)
 *
 * TO ADD A NEW ENDPOINT:
 *   1. Add the fetch function (use fetchWithErrorReporting)
 *   2. Add a query key to queryKeys.ts if it's a GET
 *   3. Add the corresponding useQuery/useMutation hook
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Habit, HabitEntry } from '../types';
import { fetchWithErrorReporting } from './errorReporter';
import { API_BASE_URL } from '../config';
import { queryKeys } from './queryKeys';

// ============ REST API Functions ============

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

export interface UpdateEntryStateParams {
  entryId: string;
  date: string;
  habitId: string;
  state: number;
  timestamp: string;
}

export async function updateEntryState(params: UpdateEntryStateParams): Promise<void> {
  const { entryId, ...body } = params;
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/habit-entry/${entryId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error('Failed to update entry state');
}

export async function updateEntryComment(entryId: string, comment: string | null): Promise<void> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/habit-entry/${entryId}/comment`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment })
  });
  if (!response.ok) throw new Error('Failed to update entry comment');
}

/**
 * Reorder a habit to be placed before another habit
 * @param habitId - The habit to move
 * @param targetHabitId - The habit to place before (null = move to end)
 */
export async function reorderHabit(habitId: string, targetHabitId: string | null): Promise<void> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/habits/${habitId}/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetHabitId })
  });
  if (!response.ok) throw new Error('Failed to reorder habit');
}

// ============ TanStack Query Hooks ============

export function useHabits() {
  return useQuery({
    queryKey: queryKeys.habits.list(),
    queryFn: getHabits,
  });
}

export function useHabitEntries(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.habits.entries(from, to),
    queryFn: () => getEntries(from, to),
  });
}

export function useUpdateEntryState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateEntryState,
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.habits.all }),
  });
}

export function useUpdateEntryComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, comment }: { entryId: string; comment: string | null }) =>
      updateEntryComment(entryId, comment),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.habits.all }),
  });
}

export function useReorderHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ habitId, targetHabitId }: { habitId: string; targetHabitId: string | null }) =>
      reorderHabit(habitId, targetHabitId),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.habits.all }),
  });
}
