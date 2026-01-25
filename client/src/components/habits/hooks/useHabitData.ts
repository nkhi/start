import { useState, useCallback } from 'react';
import { getHabits, getEntries, updateEntryState } from '../../../api/habits';
import { DateUtility, generateId } from '../../../utils';
import type { Habit, HabitEntry } from '../../../types';

interface UseHabitDataProps {
  startDate: Date;
  onDeadlineToast: (habitId: string, habitName: string) => void;
}

export function useHabitData({ startDate, onDeadlineToast }: UseHabitDataProps) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<Map<string, HabitEntry>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [habitsData, entriesData] = await Promise.all([
        getHabits(),
        getEntries(
          DateUtility.formatDate(startDate),
          DateUtility.formatDate(new Date())
        )
      ]);

      setHabits(habitsData);

      const entriesMap = new Map<string, HabitEntry>();
      entriesData.forEach(entry => {
        const normalizedHabitId = entry.habitId || (entry as any).habit_id;
        const entryDate = new Date(entry.date);
        const normalizedDate = DateUtility.formatDate(entryDate);
        const key = `${normalizedDate}_${normalizedHabitId}`;
        entriesMap.set(key, {
          ...entry,
          date: normalizedDate,
          habitId: normalizedHabitId,
          state: parseInt(String(entry.state))
        });
      });
      setEntries(entriesMap);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load data:', error);
      setIsLoading(false);
    }
  }, [startDate]);

  const handleEntriesChange = useCallback((updater: (prev: Map<string, HabitEntry>) => Map<string, HabitEntry>) => {
    setEntries(prev => updater(prev));
  }, []);

  const getEntry = useCallback((date: Date, habitId: string): HabitEntry | undefined => {
    const dateStr = DateUtility.formatDate(date);
    const key = `${dateStr}_${habitId}`;
    return entries.get(key);
  }, [entries]);

  // Check if deadline has passed for a habit on a given date
  const isDeadlinePassed = useCallback((habit: Habit, date: Date): boolean => {
    if (!habit.deadlineTime) return false;
    if (!DateUtility.isToday(date)) return false;

    const [hours, minutes] = habit.deadlineTime.split(':').map(Number);
    const deadline = new Date();
    deadline.setHours(hours, minutes, 0, 0);

    return new Date() > deadline;
  }, []);

  const cycleState = useCallback(async (date: Date, habitId: string) => {
    const dateStr = DateUtility.formatDate(date);
    const key = `${dateStr}_${habitId}`;
    const current = entries.get(key);
    const currentState = current?.state || 0;
    let nextState = (currentState + 1) % 5;

    // Must find habit from current state or pass it in. 
    // We can rely on 'habits' state here.
    const habit = habits.find(h => h.id === habitId);

    if (habit && nextState === 1 && isDeadlinePassed(habit, date)) {
      nextState = 2; // Skip to X
      onDeadlineToast(habitId, habit.name);
    }

    const entryId = current?.entryId || generateId();
    const timestamp = new Date().toISOString();

    // Preserve existing comment in local state, only update state/timestamp
    const updatedEntry: HabitEntry = {
      ...current,
      entryId,
      date: dateStr,
      habitId,
      state: nextState,
      timestamp,
      comment: current?.comment ?? null  // Preserve existing comment
    };

    const newEntries = new Map(entries);
    newEntries.set(key, updatedEntry);
    setEntries(newEntries);

    try {
      // PUT only updates state-related fields, comment is untouched on backend
      await updateEntryState({
        entryId,
        date: dateStr,
        habitId,
        state: nextState,
        timestamp
      });
    } catch (error) {
      console.error('Failed to update entry state:', error);
      // Revert on failure
      setEntries(entries);
    }
  }, [entries, habits, isDeadlinePassed, onDeadlineToast]);

  return {
    habits,
    setHabits,
    entries,
    setEntries,
    getEntry,
    loadData,
    isLoading,
    handleEntriesChange,
    cycleState,
    isDeadlinePassed
  };
}
