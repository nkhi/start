

export type ThemeNameV2 =
    | 'night1'
    | 'night2'
    | 'night3'
    | 'dawn'
    | 'sunrise'
    | 'morning'
    | 'noon'
    | 'afternoon'
    | 'goldenHour'
    | 'sunset'
    | 'dusk';

export const THEME_COLORS_V2: Record<ThemeNameV2, { text: string; background: string }> = {
    night1: { background: '#0b1026', text: '#6b7db3' },
    night2: { background: '#030508', text: '#405060' },
    night3: { background: '#101d36', text: '#80d0f3' },
    dawn: { background: '#3b2e5a', text: '#ffbe76' },
    sunrise: { background: '#FFD700', text: '#FF4500' },
    morning: { background: '#E6F4F1', text: '#008B8B' },
    noon: { background: '#0074e4', text: '#FFFFFF' },
    afternoon: { background: '#FFEFD5', text: '#D2691E' },
    goldenHour: { background: '#FFA500', text: '#800000' },
    sunset: { background: '#FF6F61', text: '#5D2E46' },
    dusk: { background: '#2c1e4a', text: '#e0b0ff' },
};

export const THEME_PHASES_V2 = [
    {
        name: 'night' as ThemeNameV2,
        startKey: 'night',
        endKey: 'nightEnd',
        isNight: true,
    },
    {
        name: 'dawn' as ThemeNameV2,
        startKey: 'nightEnd',
        endKey: 'sunrise',
    },
    {
        name: 'sunrise' as ThemeNameV2,
        startKey: 'sunrise',
        endKey: 'sunriseEnd',
    },
    {
        name: 'morning' as ThemeNameV2,
        startKey: 'sunriseEnd',
        endKey: 'solarNoon',
    },
    {
        name: 'noon' as ThemeNameV2,
        startKey: 'solarNoon',
        endKey: 'goldenHour',
    },
    {
        name: 'goldenHour' as ThemeNameV2,
        startKey: 'goldenHour',
        endKey: 'sunsetStart',
    },
    {
        name: 'sunset' as ThemeNameV2,
        startKey: 'sunsetStart',
        endKey: 'sunset',
    },
    {
        name: 'dusk' as ThemeNameV2,
        startKey: 'sunset',
        endKey: 'dusk',
    }
];

// Re-export specific items if needed
