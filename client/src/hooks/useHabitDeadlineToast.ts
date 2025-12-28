import { useState, useCallback, useEffect } from 'react';
import { DateUtility } from '../utils';

interface DeadlineToast {
    id: string;
    habitId: string;
    habitName: string;
    message: string;
    timestamp: number;
}

const AUTO_DISMISS_MS = 4000;

/**
 * Hook for managing habit deadline toast notifications.
 * Tracks which habits have shown toasts today to prevent duplicates.
 */
export function useHabitDeadlineToast() {
    const [toasts, setToasts] = useState<DeadlineToast[]>([]);

    // Check if toast was already shown for this habit today
    const wasToastShownToday = useCallback((habitId: string): boolean => {
        const todayKey = `habit-deadline-toast:${habitId}:${DateUtility.formatDate(new Date())}`;
        return localStorage.getItem(todayKey) === 'shown';
    }, []);

    // Mark toast as shown for this habit today
    const markToastShown = useCallback((habitId: string): void => {
        const todayKey = `habit-deadline-toast:${habitId}:${DateUtility.formatDate(new Date())}`;
        localStorage.setItem(todayKey, 'shown');
    }, []);

    // Show a deadline missed toast (only once per habit per day)
    const showDeadlineToast = useCallback((habitId: string, habitName: string): boolean => {
        if (wasToastShownToday(habitId)) {
            return false;
        }

        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const newToast: DeadlineToast = {
            id,
            habitId,
            habitName,
            message: 'You missed, try again tomorrow',
            timestamp: Date.now(),
        };

        setToasts((prev) => [...prev, newToast]);
        markToastShown(habitId);

        // Auto-dismiss after timeout
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, AUTO_DISMISS_MS);

        return true;
    }, [wasToastShownToday, markToastShown]);

    // Dismiss a specific toast
    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    // Cleanup old localStorage entries (older than today)
    useEffect(() => {
        const today = DateUtility.formatDate(new Date());
        const keysToRemove: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('habit-deadline-toast:')) {
                const datePart = key.split(':')[2];
                if (datePart && datePart !== today) {
                    keysToRemove.push(key);
                }
            }
        }

        keysToRemove.forEach(key => localStorage.removeItem(key));
    }, []);

    return {
        toasts,
        showDeadlineToast,
        dismissToast,
    };
}
