export type ThemeName = 'sunrise' | 'daylight' | 'sunset' | 'twilight' | 'night';

export const THEMES: Record<ThemeName, ThemeName> = {
    sunrise: 'sunrise',
    daylight: 'daylight',
    sunset: 'sunset',
    twilight: 'twilight',
    night: 'night',
};

export const THEME_COLORS: Record<ThemeName, { text: string; background: string }> = {
    sunrise: {
        text: '#ea5700',
        background: '#ffed9e',
    },
    daylight: {
        text: '#ab4621',
        background: '#ffdc9c',
    },
    sunset: {
        text: '#ab4621',
        background: '#ffc3ad',
    },
    twilight: {
        text: '#3c57a0',
        background: '#d0e5ff',
    },
    night: {
        text: '#80d0f3',
        background: '#031320',
    },
};

export const THEME_PHASES = [
    {
        name: THEMES.sunrise,
        startKey: 'sunrise',
        endKey: 'sunriseEnd',
    },
    {
        name: THEMES.daylight,
        startKey: 'sunriseEnd',
        endKey: 'sunsetStart',
    },
    {
        name: THEMES.sunset,
        startKey: 'sunsetStart',
        endKey: 'sunset',
    },
    {
        name: THEMES.night,
        startKey: 'night',
        endKey: 'nightEnd',
        isNight: true,
    },

];
