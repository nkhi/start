import SunCalc from 'suncalc';

interface SunObject {
    theme: string;
    sunrise: Date;
    sunset: Date;
    prevSunset: Date;
    nextSunrise: Date;
    daylight: {
        today: {
            minutes: number;
            positive: boolean;
        };
        tomorrow: {
            minutes: number;
            positive: boolean;
        };
    };
}

const _daylight = (sunObject: any) =>
    (sunObject.sunset.getTime() - sunObject.sunriseEnd.getTime()) / 60000;

const _daylightDiff = (x: number, y: number) => Math.abs(Math.round(x - y));

import { THEME_PHASES, THEMES } from './themeConfig';

function getTheme(date: Date, sun: any) {
    for (const phase of THEME_PHASES) {
        const start = sun[phase.startKey];
        const end = sun[phase.endKey];

        if (phase.isNight) {
            if (date >= start || date <= end) {
                return phase.name;
            }
        } else {
            if (date >= start && date <= end) {
                return phase.name;
            }
        }
    }
    return THEMES.twilight;
}

function getDay(date: Date, location: { latitude: number; longitude: number }): SunObject {
    const { latitude, longitude } = location;

    const yesterday = new Date(date);
    yesterday.setDate(date.getDate() - 1);

    const tomorrow = new Date(date);
    tomorrow.setDate(date.getDate() + 1);

    const days = {
        yesterday: SunCalc.getTimes(yesterday, latitude, longitude),
        date: SunCalc.getTimes(date, latitude, longitude),
        tomorrow: SunCalc.getTimes(tomorrow, latitude, longitude),
    };

    const daylight = {
        yesterday: _daylight(days.yesterday),
        date: _daylight(days.date),
        tomorrow: _daylight(days.tomorrow),
    };

    return {
        theme: getTheme(date, days.date),
        sunrise: days.date.sunrise,
        sunset: days.date.sunset,
        prevSunset: days.yesterday.sunset,
        nextSunrise: days.tomorrow.sunrise,
        daylight: {
            today: {
                minutes: _daylightDiff(daylight.yesterday, daylight.date),
                positive: daylight.date > daylight.yesterday,
            },
            tomorrow: {
                minutes: _daylightDiff(daylight.tomorrow, daylight.date),
                positive: daylight.tomorrow > daylight.date,
            },
        },
    };
}

const getSunPosition = (progress: number) => {
    const position = Math.PI + progress * Math.PI;
    let x = 0;
    let y = 0;

    if (progress > 1 || progress < 0) {
        return { x, y };
    }

    x = 50 + Math.cos(position) * 50;
    y = Math.abs(Math.sin(position) * 100);
    return { x, y };
};

export { getSunPosition, getDay };
export type { SunObject };
