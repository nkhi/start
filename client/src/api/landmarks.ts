/**
 * Landmarks API
 *
 * REST wrappers + TanStack Query hooks for landmarks endpoints.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { LandmarksByCategory, LandmarkItem, CreateLandmarkRequest, UpdateLandmarkRequest, ReorderLandmarksRequest } from '../types';
import { fetchWithErrorReporting } from './errorReporter';
import { API_BASE_URL } from '../config';
import { queryKeys } from './queryKeys';

// ============ REST API Functions ============

export async function getLandmarks(): Promise<LandmarksByCategory> {
    const response = await fetchWithErrorReporting(`${API_BASE_URL}/landmarks`);
    if (!response.ok) throw new Error('Failed to fetch landmarks');
    return response.json();
}

export async function createLandmark(landmark: CreateLandmarkRequest): Promise<LandmarkItem> {
    const response = await fetchWithErrorReporting(`${API_BASE_URL}/landmarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(landmark)
    });
    if (!response.ok) throw new Error('Failed to create landmark');
    return response.json();
}

export async function updateLandmark(id: string, updates: UpdateLandmarkRequest): Promise<LandmarkItem> {
    const response = await fetchWithErrorReporting(`${API_BASE_URL}/landmarks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update landmark');
    return response.json();
}

export async function deleteLandmark(id: string): Promise<void> {
    const response = await fetchWithErrorReporting(`${API_BASE_URL}/landmarks/${id}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete landmark');
}

export async function reorderLandmarks(request: ReorderLandmarksRequest): Promise<void> {
    const response = await fetchWithErrorReporting(`${API_BASE_URL}/landmarks/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
    });
    if (!response.ok) throw new Error('Failed to reorder landmarks');
}

// ============ TanStack Query Hooks ============

export function useLandmarks() {
    return useQuery({
        queryKey: queryKeys.landmarks.all,
        queryFn: getLandmarks,
    });
}

export function useCreateLandmark() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: createLandmark,
        onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.landmarks.all }),
    });
}

export function useUpdateLandmark() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: UpdateLandmarkRequest }) =>
            updateLandmark(id, updates),
        onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.landmarks.all }),
    });
}

export function useDeleteLandmark() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: deleteLandmark,
        onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.landmarks.all }),
    });
}

export function useReorderLandmarks() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: reorderLandmarks,
        onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.landmarks.all }),
    });
}
