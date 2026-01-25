export type DateStatus = 'past' | 'today' | 'future';

/**
 * Parse a YYYY-MM-DD date string as a local date (midnight in local timezone).
 * This avoids the issue where `new Date("YYYY-MM-DD")` parses as UTC midnight,
 * which can shift to the previous day in timezones behind UTC.
 */
const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed
};

// Helper to determine if a date is in the past, today, or future
export const getDateStatus = (dateStr: string | null | undefined): DateStatus => {
    if (!dateStr) return 'future'; // No date = treat as future
    const itemDate = parseLocalDate(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    itemDate.setHours(0, 0, 0, 0);

    if (itemDate < today) return 'past';
    if (itemDate.getTime() === today.getTime()) return 'today';
    return 'future';
};

// Helper to get "X days" text for a date
export const getDaysUntilText = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    const itemDate = parseLocalDate(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    itemDate.setHours(0, 0, 0, 0);

    const diffTime = itemDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0) return `${diffDays} days`;
    return `${Math.abs(diffDays)} days ago`;
};
