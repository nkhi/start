import { useState, useCallback } from 'react';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { useLandmarks, useCreateLandmark, useUpdateLandmark, useDeleteLandmark, useReorderLandmarks } from '../../api/landmarks';
import type { LandmarkItem, LandmarksByCategory } from '../../types';
import { getDateStatus } from './utils';
import { generateId } from '../../utils';

export function useLandmarksData() {
    // TanStack Query hooks
    const { data, isLoading, error } = useLandmarks();
    const createMutation = useCreateLandmark();
    const updateMutation = useUpdateLandmark();
    const deleteMutation = useDeleteLandmark();
    const reorderMutation = useReorderLandmarks();

    // UI state
    const [activeItem, setActiveItem] = useState<LandmarkItem | null>(null);
    const [showAddInput, setShowAddInput] = useState<Record<string, boolean>>({});
    const [showPastEvents, setShowPastEvents] = useState(false);
    const [newItemText, setNewItemText] = useState<Record<string, string>>({});
    const [newItemDate, setNewItemDate] = useState<string>('');

    // Optimistic data fallback
    const landmarks = data ?? { orient: [], forward: [], big_things: [] };

    // Handlers
    const handleDragStart = useCallback((event: DragStartEvent) => {
        const { active } = event;
        const data = active.data.current;
        if (data?.type === 'landmarkItem') {
            setActiveItem(data.item);
        }
    }, []);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveItem(null);

        if (!over || active.id === over.id) return;

        const activeItemId = String(active.id).replace('item-', '');
        const overItemId = String(over.id).replace('item-', '');
        const activeItemData = active.data.current?.item as LandmarkItem;

        if (!activeItemData) return;

        const category = activeItemData.category as keyof LandmarksByCategory;
        // Verify category is valid for reordering (orient/big_things)
        if (category === 'forward') return;

        const rawItems = landmarks[category];
        const items = Array.isArray(rawItems) ? rawItems : [];

        const oldIndex = items.findIndex(i => i.id === activeItemId);
        const newIndex = items.findIndex(i => i.id === overItemId);

        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

        const newItems = [...items];
        const [movedItem] = newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, movedItem);

        const newItemOrder = newItems.map(item => item.id);

        // Optimistic update handled by Query cache usually, but here we trigger mutation
        // The mutation will invalidate queries and refetch
        reorderMutation.mutate({ category, itemOrder: newItemOrder });
    }, [landmarks, reorderMutation]);

    const handleAddItem = useCallback(async (category: keyof LandmarksByCategory) => {
        const text = newItemText[category]?.trim();
        if (!text) return;

        await createMutation.mutateAsync({
            id: generateId(),
            category,
            text,
            date: category === 'forward' && newItemDate ? newItemDate : undefined
        });

        setNewItemText(prev => ({ ...prev, [category]: '' }));
        setNewItemDate('');
        setShowAddInput(prev => ({ ...prev, [category]: false }));
    }, [newItemText, newItemDate, createMutation]);

    // Helpers for sorting and filtering
    const getSortedItems = useCallback((category: keyof LandmarksByCategory) => {
        const rawItems = landmarks[category] || [];
        return [...rawItems].sort((a, b) => {
            if (category === 'forward') {
                // No date items go to top, then sort by date ascending
                if (!a.date && !b.date) return 0;
                if (!a.date) return -1;
                if (!b.date) return 1;
                return a.date.localeCompare(b.date);
            }
            // Orient/Big Things: sort by position
            return (a.position ?? 0) - (b.position ?? 0);
        });
    }, [landmarks]);

    const getFilteredItems = useCallback((category: keyof LandmarksByCategory, items: LandmarkItem[]) => {
        if (category !== 'forward') return items;

        return items.filter(item => {
            const status = getDateStatus(item.date);
            if (showPastEvents) {
                return status === 'past';
            } else {
                return status !== 'past';
            }
        });
    }, [showPastEvents]);

    return {
        landmarks,
        isLoading,
        error,
        activeItem,
        showAddInput,
        showPastEvents,
        newItemText,
        newItemDate,
        // Methods
        createLandmark: createMutation.mutateAsync,
        updateLandmark: updateMutation.mutateAsync,
        deleteLandmark: deleteMutation.mutateAsync,
        handleDragStart,
        handleDragEnd,
        handleAddItem,
        setNewItemText,
        setNewItemDate,
        toggleAddInput: (cat: string) => setShowAddInput(prev => ({ ...prev, [cat]: !prev[cat] })),
        setShowAddInput, // Exposed for close on Escape
        togglePastEvents: () => setShowPastEvents(prev => !prev),
        getSortedItems,
        getFilteredItems,
    };
}
