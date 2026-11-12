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
        insights: (days: number) => [...queryKeys.habits.all, 'insights', days] as const,
        trend: (days: number) => [...queryKeys.habits.all, 'trend', days] as const,
    },
    journal: {
        all: ['journal'] as const,
        graph: () => [...queryKeys.journal.all, 'graph'] as const,
        suggest: (excludeId?: string) => [...queryKeys.journal.all, 'suggest', excludeId] as const,
        summaries: (limit?: number) => [...queryKeys.journal.all, 'summaries', limit] as const,
        entries: (limit?: number) => [...queryKeys.journal.all, 'entries', limit] as const,
        entry: (id: string) => [...queryKeys.journal.all, 'entry', id] as const,
        nodeHistory: (id: string) => [...queryKeys.journal.all, 'nodeHistory', id] as const,
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
