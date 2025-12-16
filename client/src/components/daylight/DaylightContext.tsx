import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
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
    isDebugPanelOpen: boolean;
    setIsDebugPanelOpen: (isOpen: boolean) => void;
    jumpToPhase: (phase: ThemeNameV2) => void;
    setManualVariantIndex: (index: number | null) => void;
    isDemoMode: boolean;
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


    // --- V1 vs V2 Logic Helpers ---

    const calculateSunData = useCallback((date: Date, location: Location) => {
        if (USE_V2_THEME) {
            // V2 Logic: Uses updated phases and calculations
            return getDayV2(date, location);
        } else {
            // V1 Logic: Legacy calculations
            return getDay(date, location);
        }
    }, []);




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
                const sunData = calculateSunData(now, location.location);
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
    }, [getUserLocation, calculateSunData]);

    useEffect(() => {
        if (!userLocation) return;

        if (isFastForward) {
            let lastNow = performance.now();
            const simState = { time: currentTime.getTime() }; // Start from current displayed time

            let frameId: number;

            const loop = (now: number) => {
                const dt = now - lastNow;
                lastNow = now;

                simState.time += dt * 18000;

                const nextDate = new Date(simState.time);
                setCurrentTime(nextDate);
                setSunObject(calculateSunData(nextDate, userLocation.location));

                frameId = requestAnimationFrame(loop);
            };
            frameId = requestAnimationFrame(loop);

            return () => cancelAnimationFrame(frameId);
        } else {
            const sync = () => {
                const now = getCurrentTime();
                setCurrentTime(now);
                setSunObject(calculateSunData(now, userLocation.location));
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
    }, [userLocation, isFastForward, calculateSunData]);

    // Debug Panel State
    const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);

    // Theme Color Selection State - moved up for use in advanceDemo
    const [themeColors, setThemeColors] = useState<{ text: string; background: string } | undefined>(undefined);
    const [manualVariantIndex, setManualVariantIndex] = useState<number | null>(null);

    // Helper to jump to a specific phase
    const jumpToPhase = useCallback((phaseName: ThemeNameV2) => {
        if (!userLocation) return;
        const times = SunCalc.getTimes(currentTime, userLocation.location.latitude, userLocation.location.longitude);

        let targetTime: number | null = null;

        // Map phases to their start times (adding a small buffer)
        // Note: Using the same logic as the previous 't' key debug test
        switch (phaseName) {
            case 'night1': targetTime = times.dusk.getTime() + 60000; break; // Night 1 is after dusk
            case 'night2': targetTime = times.dusk.getTime() + 4 * 3600000; break; // Night 2 is deep night
            case 'night3': targetTime = times.nightEnd.getTime() - 2 * 3600000; break; // Night 3 is pre-dawn
            case 'dawn': targetTime = times.nightEnd.getTime() + 60000; break;
            case 'sunrise': targetTime = times.sunrise.getTime() + 60000; break;
            case 'morning': targetTime = times.sunriseEnd.getTime() + 60000; break;
            case 'noon': targetTime = times.solarNoon.getTime() + 60000; break;
            case 'afternoon': targetTime = times.solarNoon.getTime() + 2.5 * 3600000; break;
            case 'goldenHour': targetTime = times.goldenHour.getTime() + 60000; break;
            case 'sunset': targetTime = times.sunsetStart.getTime() + 60000; break;
            case 'dusk': targetTime = times.sunset.getTime() + 60000; break;
        }

        if (targetTime) {
            const nextDate = new Date(targetTime);
            setCurrentTime(nextDate);
            setSunObject(calculateSunData(nextDate, userLocation.location));
        }
    }, [userLocation, currentTime, calculateSunData]);

    // Demo mode phase order: starts at sunrise, cycles through all phases
    const DEMO_PHASE_ORDER: ThemeNameV2[] = [
        'sunrise', 'morning', 'noon', 'afternoon', 'goldenHour', 'sunset',
        'dusk', 'night1', 'night2', 'night3', 'dawn'
    ];
    const MAX_VARIANTS = 9; // Number of color paths to cycle through

    // Demo mode cycling logic - auto-plays through color paths
    const demoStepRef = useRef<{ phaseIndex: number; variantIndex: number } | null>(null);
    const demoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopDemo = useCallback(() => {
        if (demoIntervalRef.current) {
            clearInterval(demoIntervalRef.current);
            demoIntervalRef.current = null;
        }
        setIsDemoMode(false);
        demoStepRef.current = null;
    }, []);

    const advanceDemoStep = useCallback(() => {
        if (!userLocation) return;

        // Initialize demo state if needed
        if (!demoStepRef.current) {
            demoStepRef.current = { phaseIndex: 0, variantIndex: 0 };
        }

        const { phaseIndex, variantIndex } = demoStepRef.current;
        const currentPhase = DEMO_PHASE_ORDER[phaseIndex];

        // Jump to phase and set variant
        jumpToPhase(currentPhase);
        setManualVariantIndex(variantIndex);

        // Calculate next step: cycle through all phases for current variant, then next variant
        const nextPhaseIndex = phaseIndex + 1;
        if (nextPhaseIndex >= DEMO_PHASE_ORDER.length) {
            // Finished all phases for this variant, move to next variant
            const nextVariantIndex = variantIndex + 1;
            if (nextVariantIndex >= MAX_VARIANTS) {
                // Done with all variants, stop demo
                stopDemo();
                return;
            }
            demoStepRef.current = { phaseIndex: 0, variantIndex: nextVariantIndex };
        } else {
            // Continue to next phase in current variant path
            demoStepRef.current = { phaseIndex: nextPhaseIndex, variantIndex };
        }
    }, [userLocation, jumpToPhase, setManualVariantIndex, stopDemo]);

    const startDemo = useCallback(() => {
        if (!userLocation) return;

        // Reset and start fresh
        demoStepRef.current = { phaseIndex: 0, variantIndex: 0 };
        setIsDemoMode(true);

        // Run first step immediately
        advanceDemoStep();

        // Auto-advance every 2000ms (2 seconds)
        demoIntervalRef.current = setInterval(() => {
            advanceDemoStep();
        }, 1000);
    }, [userLocation, advanceDemoStep]);

    const toggleDemo = useCallback(() => {
        if (isDemoMode) {
            stopDemo();
        } else {
            startDemo();
        }
    }, [isDemoMode, stopDemo, startDemo]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (demoIntervalRef.current) {
                clearInterval(demoIntervalRef.current);
            }
        };
    }, []);

    // Keyboard listener for debug panel toggle and demo mode
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsDebugPanelOpen(prev => !prev);
                stopDemo();
            }
            if (e.key === 't' || e.key === 'T') {
                toggleDemo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleDemo, stopDemo]);

    const toggleFastForward = useCallback(() => {
        setIsFastForward(prev => !prev);
    }, []);

    // Theme Color Selection State
    const [baseVariantIndex, setBaseVariantIndex] = useState<number>(0);

    // Update base variant when theme changes
    useEffect(() => {
        if (!sunObject || !USE_V2_THEME) return;

        const variants = THEME_COLORS_V2[sunObject.theme as ThemeNameV2];
        if (variants && variants.length > 0) {
            // Pick a new random base index when the phase changes
            setBaseVariantIndex(Math.floor(Math.random() * variants.length));
            // Reset any manual override
            setManualVariantIndex(null);
        }
    }, [sunObject?.theme]);

    // Compute final effective theme colors
    useEffect(() => {
        if (!sunObject) return;

        if (USE_V2_THEME) {
            const variants = THEME_COLORS_V2[sunObject.theme as ThemeNameV2];
            if (variants && variants.length > 0) {
                const index = manualVariantIndex !== null ? manualVariantIndex : baseVariantIndex;
                // Ensure index is within bounds (safety fallback)
                const safeIndex = index % variants.length;
                setThemeColors(variants[safeIndex]);
            } else {
                setThemeColors(undefined);
            }
        } else {
            // V1 Logic
            setThemeColors(THEME_COLORS[sunObject.theme as ThemeName]);
        }
    }, [sunObject?.theme, manualVariantIndex, baseVariantIndex]);

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
            isV2Icons: USE_V2_ICONS,
            isDebugPanelOpen,
            setIsDebugPanelOpen,
            jumpToPhase,
            setManualVariantIndex,
            isDemoMode
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
