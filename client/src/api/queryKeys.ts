/**
 * Query Key Factory
 *
 * Centralized query keys for type-safe cache invalidation.
 * Pattern: entity.scope(params) => ['entity', 'scope', ...params]
 *
 * Usage:
 *   queryKeys.tasks.all          // invalidate all tasks
 *   queryKeys.tasks.list(true)   // specific workMode query
 */

export const queryKeys = {
    tasks: {
        all: ['tasks'] as const,
        list: (workMode: boolean) => [...queryKeys.tasks.all, { workMode }] as const,
        week: (start: string, end: string) => [...queryKeys.tasks.all, 'week', start, end] as const,
        grouped: (category?: string) => [...queryKeys.tasks.all, 'grouped', category] as const,
        counts: (category?: string) => [...queryKeys.tasks.all, 'counts', category] as const,
        graveyard: (workMode: boolean) => [...queryKeys.tasks.all, 'graveyard', { workMode }] as const,
    },
    habits: {
        all: ['habits'] as const,
        list: () => [...queryKeys.habits.all, 'list'] as const,
        entries: (from: string, to: string) => [...queryKeys.habits.all, 'entries', from, to] as const,
    },
    diary: {
        all: ['diary'] as const,
        questions: () => [...queryKeys.diary.all, 'questions'] as const,
        entries: () => [...queryKeys.diary.all, 'entries'] as const,
        byQuestion: () => [...queryKeys.diary.all, 'byQuestion'] as const,
    },
    lists: {
        all: ['lists'] as const,
    },
    landmarks: {
        all: ['landmarks'] as const,
    },
    calendar: {
        all: ['calendar'] as const,
        events: (date: string) => [...queryKeys.calendar.all, 'events', date] as const,
        range: (start: string, end: string) => [...queryKeys.calendar.all, 'range', start, end] as const,
    },
    vlogs: {
        all: ['vlogs'] as const,
        single: (weekStart: string) => [...queryKeys.vlogs.all, 'single', weekStart] as const,
        batch: (weeks: string[]) => [...queryKeys.vlogs.all, 'batch', ...weeks] as const,
    },
    notes: {
        all: ['notes'] as const,
    },
};
