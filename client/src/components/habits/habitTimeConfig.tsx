import type { Icon } from '@phosphor-icons/react';
import {
    SunHorizonIcon,
    MoonIcon,
    TreeIcon,
    BarbellIcon,
    ResizeIcon,
    AxeIcon,
    BlueprintIcon
} from '@phosphor-icons/react';
import type { Habit } from '../../types';

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
        label: 'Morning habits',
        showInFilter: true,
    },
    health: {
        icon: TreeIcon,
        color: '#1ba841',
        label: 'Health habits',
        showInFilter: true,
    },
    exercise: {
        icon: BarbellIcon,
        color: '#f4244d',
        label: 'Exercise habits',
        showInFilter: true,
    },
    growth: {
        icon: ResizeIcon,
        color: '#a855f7',
        label: 'Growth habits',
        showInFilter: true,
    },
    quitting: {
        icon: AxeIcon,
        color: '#f42697',
        label: 'Stopping habits',
        showInFilter: true,
    },
    night: {
        icon: MoonIcon,
        color: '#3ddde6',
        label: 'Night habits',
        showInFilter: true,
    },
    routine: {
        icon: BlueprintIcon,
        color: '#3ddde6',
        label: 'Routine habits',
        showInFilter: true,
    },
    // Types that exist but don't need filter buttons or visible icons
    neither: {
        icon: null,
        color: 'transparent',
        label: 'Other habits',
        showInFilter: false,
    },
    weekdays: {
        icon: null,
        color: 'transparent',
        label: 'Weekday habits',
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
];

// Helper component to render the icon for a given defaultTime
interface HabitTimeIconProps {
    defaultTime: HabitDefaultTime;
    size?: number;
}

export function HabitTimeIcon({ defaultTime, size = 20 }: HabitTimeIconProps) {
    const config = HABIT_TIME_CONFIG[defaultTime];
    if (!config || !config.icon) return null;

    const IconComponent = config.icon;
    return <IconComponent size={size} weight="duotone" color={config.color} />;
}
