import React, { useEffect, useState, useMemo } from 'react';
import styles from './Daylight.module.css';
import { getSunPosition } from './utils/sun';
import { generateSentence, timeFormatter } from './utils/format';
import { useDaylight } from './DaylightContext';
import { DaylightDebugPanel } from './DaylightDebugPanel';
import { getLineConfig, isDayPhase, type LineMarker } from './utils/lineConfig';

import { SunDim, Moon, MoonStars, Circle } from '@phosphor-icons/react';

// Toggle to show/hide the sentence text below the horizon
const SHOW_SENTENCE_TEXT = false;

interface DaylightProps {
    workMode?: boolean;
}

export function Daylight({ workMode = false }: DaylightProps) {
    const {
        userLocation,
        sunObject,
        currentTime,
        isLoading,
        isFastForward,
        themeColors,
        isV2Icons,
        isDebugPanelOpen,
        isDemoMode
    } = useDaylight();

    const [messageIndex, setMessageIndex] = useState<number | undefined>(undefined);

    // Keyboard interaction for Space (Message Toggle)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                setMessageIndex(prev => (prev === undefined ? 0 : prev + 1));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // --- Rendering Helpers ---

    if (isLoading || !userLocation || !sunObject) {
        // Just chilling while we wait for data. No biggie.
        return <div className={styles.container}></div>;
    }

    const themeClass = styles[`theme-${sunObject.theme}`] || '';

    // Calculate Sun Position
    // Calculate Sun/Moon Position based on continuous cycle
    // If it's day: Sunrise -> Sunset (0 -> 1)
    // If it's night: Sunset -> Sunrise (0 -> 1)

    const nowMs = currentTime.getTime();
    const sunriseMs = sunObject.sunrise.getTime();
    const sunsetMs = sunObject.sunset.getTime();

    let cycleProgress = 0;
    let isDay = false; // Helper to know if we are in day phase

    if (nowMs < sunriseMs) {
        // Pre-dawn night (from prevSunset to sunrise)
        const prevSunsetMs = sunObject.prevSunset.getTime();
        cycleProgress = (nowMs - prevSunsetMs) / (sunriseMs - prevSunsetMs);
    } else if (nowMs > sunsetMs) {
        // Post-sunset night (from sunset to nextSunrise)
        const nextSunriseMs = sunObject.nextSunrise.getTime();
        cycleProgress = (nowMs - sunsetMs) / (nextSunriseMs - sunsetMs);
    } else {
        // Daylight (from sunrise to sunset)
        cycleProgress = (nowMs - sunriseMs) / (sunsetMs - sunriseMs);
        isDay = true;
    }

    const sunPos = getSunPosition(cycleProgress);

    // Determine transition speed
    // If FastForward is on or Debug Panel is open (but not demo mode) -> 0s (instant)
    // If Demo mode is on -> 0.5s (short smooth transition)
    // Otherwise -> Default speeds
    const getTransition = () => {
        if (isFastForward || (isDebugPanelOpen && !isDemoMode)) return 'none';
        if (isDemoMode) return 'background-color 0.5s ease, color 0.5s ease';
        return 'background-color 3s ease, color 3s ease';
    };

    const getSunTransition = () => {
        if (isFastForward || (isDebugPanelOpen && !isDemoMode)) return 'none';
        if (isDemoMode) return 'bottom 0.5s ease, left 0.5s ease';
        return 'bottom 0.5s ease, left 0.5s ease';
    };

    const sunStyle: React.CSSProperties = {
        bottom: `${sunPos.y}%`,
        left: `${sunPos.x}%`,
        // Ensure smooth transition for position updates
        transition: getSunTransition(),
    };

    const containerStyle = {
        '--theme-text-color': themeColors?.text,
        '--theme-bg-color': themeColors?.background,
        // Add a smooth transition for background color changes
        transition: getTransition(),
    } as React.CSSProperties;

    // Determine if sun (or moon) is visible.
    // With disjoint cycles, progress is always 0..1 roughly.
    const isSunVisible = cycleProgress >= 0 && cycleProgress <= 1;

    // --- Marker Lines Configuration ---
    // Get the appropriate line config based on work mode
    const lineConfig = getLineConfig(workMode);

    // Determine if we're in a "day" cycle based on the current theme/phase
    // This ensures lines update when jumping to phases via the debug panel
    const isInDayCycle = sunObject?.theme ? isDayPhase(sunObject.theme) : isDay;

    // Get the active lines based on the current cycle
    const activeLines = isInDayCycle ? lineConfig.day : lineConfig.night;

    // Calculate marker angle for a given hour
    const getHourMarkerAngle = (marker: LineMarker): { angleDeg: number; isVisible: boolean } | null => {
        const targetTime = new Date(currentTime);
        targetTime.setHours(marker.hour, 0, 0, 0);
        const targetMs = targetTime.getTime();

        if (isInDayCycle) {
            // Day cycle: Calculate based on sunrise to sunset
            const progress = (targetMs - sunriseMs) / (sunsetMs - sunriseMs);
            const angleDeg = progress * 180;
            // Always show day markers - they'll render below horizon if outside 0-1 range
            return { angleDeg, isVisible: true };
        } else {
            // Night cycle: Calculate based on sunset to sunrise
            let nightStartMs: number;
            let nightEndMs: number;

            if (nowMs < sunriseMs) {
                // Pre-dawn night
                nightStartMs = sunObject.prevSunset.getTime();
                nightEndMs = sunObject.sunrise.getTime();

                // Adjust date for hours that belong to yesterday or today
                if (marker.hour > 12) {
                    targetTime.setDate(targetTime.getDate() - 1);
                }
                targetTime.setHours(marker.hour, 0, 0, 0);
            } else {
                // Post-sunset night
                nightStartMs = sunObject.sunset.getTime();
                nightEndMs = sunObject.nextSunrise.getTime();

                // Adjust date for hours that belong to today or tomorrow
                if (marker.hour < 12) {
                    targetTime.setDate(targetTime.getDate() + 1);
                }
                targetTime.setHours(marker.hour, 0, 0, 0);
            }

            const adjustedTargetMs = targetTime.getTime();
            const progress = (adjustedTargetMs - nightStartMs) / (nightEndMs - nightStartMs);
            const angleDeg = progress * 180;
            // Visible if within the night arc (0-1 progress)
            const isVisible = progress >= 0 && progress <= 1;
            return { angleDeg, isVisible };
        }
    };

    // Calculate all active markers
    const markerData = useMemo(() => {
        return activeLines
            .map(marker => {
                const result = getHourMarkerAngle(marker);
                if (!result || !result.isVisible) return null;
                return { ...marker, angleDeg: result.angleDeg };
            })
            .filter((m): m is LineMarker & { angleDeg: number } => m !== null);
    }, [activeLines, currentTime, sunriseMs, sunsetMs, isInDayCycle, sunObject]);

    // --- Icon Selection Logic ---
    const getIconComponent = () => {
        if (isV2Icons) {
            // V2 Logic: Dynamic icons based on cycle progress
            // Default to Circle in V2 mode if no other condition met (though conditions below cover standard ranges)

            if (isDay) {
                // Day: 0.25 - 0.75 use SunDim
                if (cycleProgress > 0.25 && cycleProgress < 0.75) {
                    return SunDim;
                }
            } else {
                // Night
                // cycleProgress 0 -> 1 (Sunset -> Sunrise)
                // 0.25 - 0.75: Deep Night (MoonStars)
                // 0.0 - 0.25, 0.75 - 1.0: Early/Late Night (Moon)
                if (cycleProgress >= 0.25 && cycleProgress < 0.75) {
                    return MoonStars;
                } else {
                    return Moon;
                }
            }
            return Circle; // Fallback for transition points 0-0.25 / 0.75-1.0 in Day
        }

        // V1 Logic: No icons, returns null (so we use default CSS circle/dot behavior logic or nothing)
        return null;
    };

    const CurrentIcon = getIconComponent();

    // --- Horizon Labels & Times ---
    let horizonStartLabel = 'Sunrise';
    let horizonEndLabel = 'Sunset';
    let horizonStartTime = sunObject.sunrise;
    let horizonEndTime = sunObject.sunset;

    if (!isDay) {
        // Night Mode: Horizon goes from Sunset -> Sunrise
        horizonStartLabel = 'Sunset';
        horizonEndLabel = 'Sunrise';

        if (nowMs < sunriseMs) {
            // Pre-dawn
            horizonStartTime = sunObject.prevSunset;
            horizonEndTime = sunObject.sunrise;
        } else {
            // Post-sunset
            horizonStartTime = sunObject.sunset;
            horizonEndTime = sunObject.nextSunrise;
        }
    }

    // Generate Sentence HTML
    const sentenceHtml = generateSentence(sunObject.daylight, sunObject.theme, messageIndex);

    return (
        <div className={`${styles.container} ${themeClass}`} style={containerStyle}>
            <div className={styles.contentWrapper}>
                {/* Main Horizon Area */}
                <div className={`${styles.horizon} ${!SHOW_SENTENCE_TEXT ? styles.horizonEnlarged : ''}`}>
                    <div className={styles.horizonSky} aria-hidden="true">
                        <div className={styles.horizonSkyWrap}>
                            <span
                                className={`${styles.horizonSun} ${isSunVisible ? styles.showTime : ''} ${CurrentIcon ? styles.v2IconMode : ''}`}
                                style={isSunVisible ? sunStyle : { display: 'none' }}
                                data-time={timeFormatter(currentTime)}
                            >
                                {CurrentIcon && (
                                    <CurrentIcon
                                        size={32}
                                        weight="fill"
                                        style={{
                                            position: 'absolute',
                                            left: '50%',
                                            bottom: 0,
                                            transform: 'translate(-50%, 0)'
                                        }}
                                    />
                                )}
                            </span>
                        </div>
                    </div>
                    {/* Hour Markers - positioned outside horizonSky to avoid overflow:hidden clipping */}
                    <div className={styles.markerContainer}>
                        {markerData.map((marker) => (
                            <div key={marker.id} className={styles.workHourMarker} style={{ transform: `rotate(${marker.angleDeg - 90}deg)` }} title={marker.label} />
                        ))}
                    </div>
                    <div className={styles.horizonLine}>
                        <time className={styles.jsSunrise} title={horizonStartLabel} dateTime={timeFormatter(horizonStartTime)}>
                            {timeFormatter(horizonStartTime)}
                        </time>
                        <time className={styles.jsSunset} title={horizonEndLabel} dateTime={timeFormatter(horizonEndTime)}>
                            {timeFormatter(horizonEndTime)}
                        </time>
                    </div>
                </div>

                {/* Sentence - controlled by SHOW_SENTENCE_TEXT constant */}
                {SHOW_SENTENCE_TEXT && (
                    <p
                        className={styles.text}
                        dangerouslySetInnerHTML={{ __html: sentenceHtml }}
                    />
                )}
            </div>
            <DaylightDebugPanel />
        </div>
    );
}
