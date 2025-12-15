import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { UserLocation, Location } from './utils/store';
import Store from './utils/store';
import { getDay, type SunObject } from './utils/sun';
import { getDayV2 } from './utils/sunV2';
import { THEME_COLORS, type ThemeName } from './utils/themeConfig';
import { THEME_COLORS_V2, type ThemeNameV2 } from './utils/themeConfigV2';
import SunCalc from 'suncalc';

const USE_V2_THEME = true;
const USE_V2_ICONS = true;

interface DaylightContextType {
    userLocation: UserLocation | null;
    sunObject: SunObject | null;
    currentTime: Date;
    isLoading: boolean;
    isFastForward: boolean;
    toggleFastForward: () => void;
    themeColors: { text: string; background: string } | undefined;
    isV2: boolean;
    isV2Icons: boolean;
}

const DaylightContext = createContext<DaylightContextType | undefined>(undefined);

interface DaylightProviderProps {
    children: ReactNode;
}


const MANUAL_TIME: Date | null = null;
const getCurrentTime = () => MANUAL_TIME || new Date();

export function DaylightProvider({ children }: DaylightProviderProps) {
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [sunObject, setSunObject] = useState<SunObject | null>(null);
    const [currentTime, setCurrentTime] = useState(getCurrentTime());
    const [isLoading, setIsLoading] = useState(true);
    const [isFastForward, setIsFastForward] = useState(false);


    const reverseGeocode = async (location: Location): Promise<UserLocation> => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}&addressdetails=1`
            );
            const data = await response.json();
            return {
                location,
                city: data.address.city || data.address.town || data.address.village || null,
                country: data.address.country || null,
            };
        } catch (error) {
            console.warn("Reverse geocode failed", error);
            return {
                location,
                city: null,
                country: null,
            };
        }
    };

    const getUserLocation = useCallback(async (): Promise<UserLocation> => {
        const stored = Store.get('userLocation');
        if (stored) return stored;

        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject('Geolocation not supported');
                return;
            }
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const loc = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    const fullLocation = await reverseGeocode(loc);
                    Store.set('userLocation', fullLocation);
                    resolve(fullLocation);
                },
                (error) => {
                    reject(error);
                },
                { enableHighAccuracy: false }
            );
        });
    }, []);


    useEffect(() => {
        let mounted = true;

        const init = async () => {
            try {
                const location = await getUserLocation();
                if (!mounted) return;
                setUserLocation(location);

                const now = getCurrentTime();
                const sunData = USE_V2_THEME
                    ? getDayV2(now, location.location)
                    : getDay(now, location.location);
                setSunObject(sunData);
                setIsLoading(false);
            } catch (error) {
                console.error("Daylight init failed", error);
                setIsLoading(false);
            }
        };

        init();

        return () => {
            mounted = false;
        };
    }, [getUserLocation]);

    useEffect(() => {
        if (!userLocation) return;

        const calculateSun = (date: Date) => {
            return USE_V2_THEME
                ? getDayV2(date, userLocation.location)
                : getDay(date, userLocation.location);
        };

        if (isFastForward) {
            let lastNow = performance.now();
            const simState = { time: currentTime.getTime() }; // Start from current displayed time

            let frameId: number;

            const loop = (now: number) => {
                const dt = now - lastNow;
                lastNow = now;

                simState.time += dt * 3000;

                const nextDate = new Date(simState.time);
                setCurrentTime(nextDate);
                setSunObject(calculateSun(nextDate));

                frameId = requestAnimationFrame(loop);
            };
            frameId = requestAnimationFrame(loop);

            return () => cancelAnimationFrame(frameId);
        } else {
            const sync = () => {
                const now = getCurrentTime();
                setCurrentTime(now);
                setSunObject(calculateSun(now));
            };

            sync();

            const now = new Date();
            const delay = (60 - now.getSeconds()) * 1000;

            let intervalId: ReturnType<typeof setInterval>;
            const timeoutId = setTimeout(() => {
                sync();
                intervalId = setInterval(sync, 60000);
            }, delay);

            return () => {
                clearTimeout(timeoutId);
                if (intervalId) clearInterval(intervalId);
            };
        }
    }, [userLocation, isFastForward]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 'g' || e.key === 'G') && !MANUAL_TIME) {
                setIsFastForward(prev => !prev);
            }

            if (e.key === 't' || e.key === 'T') {
                if (isFastForward) return;
                if (!userLocation) return;



                const times = SunCalc.getTimes(currentTime, userLocation.location.latitude, userLocation.location.longitude);

                const testPoints: { name: string, time: number }[] = [
                    { name: 'night3 (pre-dawn)', time: times.nightEnd.getTime() - 2 * 3600000 },
                    { name: 'dawn', time: times.nightEnd.getTime() + 60000 },
                    { name: 'sunrise', time: times.sunrise.getTime() + 60000 },
                    { name: 'morning', time: times.sunriseEnd.getTime() + 60000 },
                    { name: 'noon', time: times.solarNoon.getTime() + 60000 },
                    { name: 'afternoon', time: times.solarNoon.getTime() + 2.5 * 3600000 },
                    { name: 'goldenHour', time: times.goldenHour.getTime() + 60000 },
                    { name: 'sunset', time: times.sunsetStart.getTime() + 60000 },
                    { name: 'dusk', time: times.sunset.getTime() + 60000 },
                    { name: 'night1 (early)', time: times.dusk.getTime() + 60000 },
                    { name: 'night2 (midnight)', time: times.dusk.getTime() + 4 * 3600000 },
                ].sort((a, b) => a.time - b.time);

                const currentMs = currentTime.getTime();
                let nextPoint = testPoints.find(p => p.time > currentMs + 5000);

                if (!nextPoint) {
                    nextPoint = testPoints[0];
                }

                console.log(`[Debug] Jumping to ${nextPoint.name}`);
                const nextDate = new Date(nextPoint.time);
                setCurrentTime(nextDate);

                const nextSun = USE_V2_THEME
                    ? getDayV2(nextDate, userLocation.location)
                    : getDay(nextDate, userLocation.location);
                setSunObject(nextSun);
            }

            if (e.key === 'Escape') {
                setIsFastForward(false);
                const now = getCurrentTime();
                setCurrentTime(now);
                if (userLocation) {
                    setSunObject(USE_V2_THEME
                        ? getDayV2(now, userLocation.location)
                        : getDay(now, userLocation.location));
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFastForward, userLocation, currentTime]);

    const toggleFastForward = useCallback(() => {
        setIsFastForward(prev => !prev);
    }, []);

    let themeColors;
    if (sunObject) {
        if (USE_V2_THEME) {
            themeColors = THEME_COLORS_V2[sunObject.theme as ThemeNameV2];
        } else {
            themeColors = THEME_COLORS[sunObject.theme as ThemeName];
        }
    }

    return (
        <DaylightContext.Provider value={{
            userLocation,
            sunObject,
            currentTime,
            isLoading,
            isFastForward,
            toggleFastForward,
            themeColors,
            isV2: USE_V2_THEME,
            isV2Icons: USE_V2_ICONS
        }}>
            {children}
        </DaylightContext.Provider>
    );
}

export function useDaylight() {
    const context = useContext(DaylightContext);
    if (context === undefined) {
        throw new Error('useDaylight must be used within a DaylightProvider');
    }
    return context;
}
