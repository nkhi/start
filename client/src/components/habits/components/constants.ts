import type { Icon } from '@phosphor-icons/react';
import {
    SunHorizonIcon,
    MoonIcon,
    TreeIcon,
    BarbellIcon,
    ResizeIcon,
    AxeIcon,
    ClockIcon,
    LampIcon
} from '@phosphor-icons/react';
import type { Habit } from '../../../types';

export const GRADE_COLORS: Record<string, string> = {
    'gradeAPlus': '#10b981', 'gradeA': '#10b981', 'gradeAMinus': '#10b981',
    'gradeBPlus': '#0ea5e9', 'gradeB': '#0ea5e9', 'gradeBMinus': '#0ea5e9',
    'gradeCPlus': '#f59e0b', 'gradeC': '#f59e0b', 'gradeCMinus': '#f59e0b',
    'gradeDPlus': '#ef4444', 'gradeD': '#ef4444', 'gradeDMinus': '#ef4444',
    'gradeF': '#ef4444'
};
export const DEFAULT_SPARKLINE_COLOR = '#4b5563';
export const SPARKLINE_CONFIG = {
    bottomCenter: 99.22,
    scaleY: 0.86,
    strokeWidth: 1.5625,
    opacity: 0.55,
    maskStartColor: 'white',
    maskStopColor: 'white',
    maskStartOpacity: 0.5,
    maskStopOpacity: 0
};

export const HABIT_TRACKER_CONFIG = {
    startDate: new Date('2025-11-09T00:00:00')
};

// Distinct, high-contrast colors suitable for dark background
export const CHART_COLORS = [
    '#FF5252', // Red Accent
    '#448AFF', // Blue Accent
    '#69F0AE', // Green Accent
    '#FFD740', // Amber Accent
    '#E040FB', // Purple Accent
    '#18FFFF', // Cyan Accent
    '#FFAB40', // Orange Accent
    '#FF4081', // Pink Accent
    '#B2FF59', // Light Green Accent
    '#7C4DFF', // Deep Purple Accent
    '#64FFDA', // Teal Accent
    '#FF6E40', // Deep Orange Accent
    '#40C4FF', // Light Blue Accent
    '#EEFF41', // Lime Accent
    '#F44336', // Red
    '#2196F3', // Blue
    '#4CAF50', // Green
    '#FFC107', // Amber
    '#9C27B0', // Purple
    '#00BCD4', // Cyan
];

export const STATE_ICONS = ['·', '✓', '✕', ':)', ':|'];

// Extract the defaultTime type from the Habit interface
export type HabitDefaultTime = Habit['defaultTime'];

// Configuration for each habit time type
export interface HabitTimeConfig {
    icon: Icon | null;
    color: string;
    label: string;
    showInFilter: boolean; // Some types like 'neither' and 'weekdays' shouldn't appear in filter
}

// Centralized mapping of defaultTime to icon, color, and label
export const HABIT_TIME_CONFIG: Record<HabitDefaultTime, HabitTimeConfig> = {
    morning: {
        icon: SunHorizonIcon,
        color: 'orange',
        label: 'Morning',
        showInFilter: true,
    },
    health: {
        icon: TreeIcon,
        color: '#1ba841',
        label: 'Health',
        showInFilter: true,
    },
    exercise: {
        icon: BarbellIcon,
        color: '#f4244d',
        label: 'Exercise',
        showInFilter: true,
    },
    growth: {
        icon: ResizeIcon,
        color: '#a855f7',
        label: 'Growth',
        showInFilter: true,
    },
    quitting: {
        icon: AxeIcon,
        color: '#f42697',
        label: 'Stopping',
        showInFilter: true,
    },
    night: {
        icon: MoonIcon,
        color: '#3ddde6',
        label: 'Night',
        showInFilter: true,
    },
    routine: {
        icon: ClockIcon,
        color: '#e0f2fe',
        label: 'Routine',
        showInFilter: true,
    },
    ktlo: {
        icon: LampIcon,
        color: '#fbbf24', // Yellowish/amber for lamp
        label: 'KTLO',
        showInFilter: true,
    },
    // Types that exist but don't need filter buttons or visible icons
    neither: {
        icon: null,
        color: 'transparent',
        label: 'Other',
        showInFilter: false,
    },
    weekdays: {
        icon: null,
        color: 'transparent',
        label: 'Weekday',
        showInFilter: false,
    },
};

// Get the filter-visible time types in the order they should appear
export const FILTER_TIME_TYPES: HabitDefaultTime[] = [
    'morning',
    'health',
    'exercise',
    'growth',
    'quitting',
    'night',
    'routine',
    'ktlo',
];
