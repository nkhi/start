/**
 * Line Configuration for Daylight Component
 * 
 * This file defines the dashed marker lines that appear on the sun/moon horizon.
 * Lines can be configured for different modes (work/regular) and cycles (day/night).
 */

export interface LineMarker {
    /** The hour (0-23) at which this line should appear */
    hour: number;
    /** Display label for the line (used in title attribute) */
    label: string;
    /** ID for this marker (useful for styling or debugging) */
    id: string;
}

export interface LineConfig {
    /** Markers that appear during the day cycle */
    day: LineMarker[];
    /** Markers that appear during the night cycle */
    night: LineMarker[];
}

/**
 * Work Mode Lines
 * - Day: 9am (work start) and 5pm (work end)
 * - Night: 11pm (sleep) and 7am (wake) - same as regular mode
 */
export const WORK_MODE_LINES: LineConfig = {
    day: [
        { hour: 9, label: '9:00 AM', id: 'work-start' },
        { hour: 17, label: '5:00 PM', id: 'work-end' },
    ],
    night: [
        { hour: 23, label: '11:00 PM', id: 'sleep-time' },
        { hour: 7, label: '7:00 AM', id: 'wake-time' },
    ],
};

/**
 * Regular Mode Lines (non-work mode)
 * - Day: None (regular mode focuses on sleep schedule)
 * - Night: 11pm (sleep time) and 7am (wake time)
 */
export const REGULAR_MODE_LINES: LineConfig = {
    day: [],
    night: [
        { hour: 23, label: '11:00 PM', id: 'sleep-time' },
        { hour: 7, label: '7:00 AM', id: 'wake-time' },
    ],
};

/**
 * Get the appropriate line configuration based on mode
 */
export function getLineConfig(workMode: boolean): LineConfig {
    return workMode ? WORK_MODE_LINES : REGULAR_MODE_LINES;
}

/**
 * Phases that are considered "day" phases for line visibility purposes.
 * When manually jumping to these phases, day lines should be shown.
 */
export const DAY_PHASES = [
    'sunrise',
    'morning',
    'noon',
    'afternoon',
    'goldenHour',
    'sunset',
] as const;

/**
 * Phases that are considered "night" phases for line visibility purposes.
 * When manually jumping to these phases, night lines should be shown.
 */
export const NIGHT_PHASES = [
    'dusk',
    'night1',
    'night2',
    'night3',
    'dawn',
] as const;

/**
 * Determine if a phase is a "day" phase
 */
export function isDayPhase(phase: string): boolean {
    return (DAY_PHASES as readonly string[]).includes(phase);
}

/**
 * Determine if a phase is a "night" phase
 */
export function isNightPhase(phase: string): boolean {
    return (NIGHT_PHASES as readonly string[]).includes(phase);
}
