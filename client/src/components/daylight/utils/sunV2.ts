import SunCalc from 'suncalc';
import { THEME_PHASES_V2, type ThemeNameV2 } from './themeConfigV2';
import type { SunObject } from './sun';

const _daylight = (sunObject: any) =>
    (sunObject.sunset.getTime() - sunObject.sunriseEnd.getTime()) / 60000;

const _daylightDiff = (x: number, y: number) => Math.abs(Math.round(x - y));

function getThemeV2(date: Date, sun: any): ThemeNameV2 {
    const now = date.getTime();

    // --- Noon / Afternoon Logic ---
    const solarNoon = sun.solarNoon.getTime();
    const goldenHour = sun.goldenHour.getTime();

    if (now >= solarNoon && now < goldenHour) {
        const twoHours = 2 * 60 * 60 * 1000;
        if (now < solarNoon + twoHours) {
            return 'noon';
        } else {
            return 'afternoon';
        }
    }

    const dusk = sun.dusk.getTime();
    const nightEnd = sun.nightEnd.getTime();

    if (now < nightEnd) {
        const threeHours = 3 * 60 * 60 * 1000;
        if (now > nightEnd - threeHours) {
            return 'night3';
        }
        return 'night2';
    }

    // Check for PM Night (After Dusk)
    if (now > dusk) {
        const threeHours = 3 * 60 * 60 * 1000;
        if (now < dusk + threeHours) {
            return 'night1';
        }
        return 'night2';
    }


    for (const phase of THEME_PHASES_V2) {
        if (phase.name === 'noon' || phase.name.startsWith('night')) continue;

        const start = sun[phase.startKey].getTime();
        const end = sun[phase.endKey].getTime();



        if (now >= start && now <= end) {
            return phase.name;
        }
    }

    return 'night2';
}

export function getDayV2(date: Date, location: { latitude: number; longitude: number }): SunObject {
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
        theme: getThemeV2(date, days.date),
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
