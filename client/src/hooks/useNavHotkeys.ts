/**
 * useNavHotkeys Hook
 * 
 * Adds keyboard shortcuts for navigation between tabs.
 * Press 1-6 to quickly switch between tabs.
 * 
 * ## Key Mappings:
 * - 1 → habits
 * - 2 → todos
 * - 3 → journal
 * - 4 → memos
 * - 5 → lists
 * - 6 → next
 * 
 * ## Usage:
 * ```tsx
 * useNavHotkeys({ onTabChange, workMode });
 * ```
 */

import { useEffect, useCallback } from 'react';
import { NAV_TABS } from '../components/shared/Navigation/constants';
import type { TabType } from '../components/shared/Navigation';

export interface UseNavHotkeysOptions {
    onTabChange: (tab: TabType) => void;
    workMode?: boolean;
}

const TAB_HOTKEYS: Record<string, TabType> = {
    '1': 'habits',
    '2': 'todos',
    '3': 'journal',
    '4': 'memos',
    '5': 'lists',
    '6': 'next',
};

// Tabs available in work mode
const WORK_MODE_TABS = NAV_TABS.filter(tab => tab.showInWorkMode).map(tab => tab.id);


export function useNavHotkeys({ onTabChange, workMode = false }: UseNavHotkeysOptions): void {
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        // Ignore if user is typing in an input, textarea, or contenteditable
        const target = event.target as HTMLElement;
        if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
        ) {
            return;
        }

        // Ignore if modifier keys are pressed
        if (event.ctrlKey || event.metaKey || event.altKey) {
            return;
        }

        const tab = TAB_HOTKEYS[event.key];
        if (!tab) return;

        // In work mode, only allow tabs that are available
        if (workMode && !WORK_MODE_TABS.includes(tab)) {
            return;
        }

        event.preventDefault();
        onTabChange(tab);
    }, [onTabChange, workMode]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}
