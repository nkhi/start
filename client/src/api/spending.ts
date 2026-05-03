import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SpendingTransaction, SpendingMonth } from '../types';
import { fetchWithErrorReporting } from './errorReporter';
import { API_BASE_URL } from '../config';
import { queryKeys } from './queryKeys';

// ============ REST API Functions ============

export async function getSpendingMonth(month: string): Promise<SpendingMonth> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/spending?month=${month}`);
  if (!response.ok) throw new Error('Failed to fetch spending');
  return response.json();
}

export async function createSpendingTransaction(transaction: Partial<SpendingTransaction>): Promise<SpendingTransaction> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/spending`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transaction)
  });
  if (!response.ok) throw new Error('Failed to create spending transaction');
  return response.json();
}

export async function updateSpendingTransaction(id: string, updates: Partial<SpendingTransaction>): Promise<SpendingTransaction> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/spending/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!response.ok) throw new Error('Failed to update spending transaction');
  return response.json();
}

export async function deleteSpendingTransaction(id: string): Promise<void> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/spending/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete spending transaction');
}

// ============ TanStack Query Hooks ============

export function useSpendingMonth(month: string) {
  return useQuery({
    queryKey: queryKeys.spending.month(month),
    queryFn: () => getSpendingMonth(month),
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSpendingTransaction,
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.spending.all }),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<SpendingTransaction> }) =>
      updateSpendingTransaction(id, updates),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.spending.all }),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteSpendingTransaction,
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.spending.all }),
  });
}
