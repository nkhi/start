import React, { useEffect, useState } from 'react';
import styles from './Daylight.module.css';
import { getSunPosition } from './utils/sun';
import { generateSentence, timeFormatter } from './utils/format';
import { useDaylight } from './DaylightContext';

import { SunDim, Moon, MoonStars, Circle } from '@phosphor-icons/react';

interface DaylightProps {
    apiBaseUrl?: string;
    workMode?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function Daylight({ apiBaseUrl: _apiBaseUrl, workMode = false }: DaylightProps) {
    const {
        userLocation,
        sunObject,
        currentTime,
        isLoading,
        isFastForward,
        themeColors,
        isV2Icons
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
    const sunStyle: React.CSSProperties = {
        bottom: `${sunPos.y}%`,
        left: `${sunPos.x}%`,
        // Ensure smooth transition for position updates
        transition: isFastForward ? 'none' : 'bottom 0.5s ease, left 0.5s ease',
    };

    const containerStyle = {
        '--theme-text-color': themeColors?.text,
        '--theme-bg-color': themeColors?.background,
        // Add a smooth transition for background color changes
        transition: isFastForward ? 'none' : 'background-color 3s ease, color 3s ease',
    } as React.CSSProperties;

    // Determine if sun (or moon) is visible.
    // With disjoint cycles, progress is always 0..1 roughly.
    const isSunVisible = cycleProgress >= 0 && cycleProgress <= 1;

    // --- Work Hour Markers (9am and 5pm) ---
    // Calculate radial angle for work hour markers (like sundial spokes)
    // Progress 0 = sunrise (0°), 0.5 = solar noon (90°), 1 = sunset (180°)
    // Allow progress outside 0-1 for times before sunrise or after sunset (below horizon)
    const getWorkHourMarker = (hour: number) => {
        const targetTime = new Date(currentTime);
        targetTime.setHours(hour, 0, 0, 0);
        const targetMs = targetTime.getTime();

        const progress = (targetMs - sunriseMs) / (sunsetMs - sunriseMs);
        // Convert progress to degrees: 0 -> 0°, 0.5 -> 90°, 1 -> 180°
        // Values < 0 or > 1 will produce angles beyond the visible arc (below horizon)
        const angleDeg = progress * 180;

        // Flag if marker is below horizon (before sunrise or after sunset)
        const isBelow = progress < 0 || progress > 1;

        return { progress, angleDeg, hour, isBelow };
    };

    const workStartMarker = workMode ? getWorkHourMarker(9) : null;
    const workEndMarker = workMode ? getWorkHourMarker(17) : null;

    // --- Sleep Marker (11pm) for Normal Mode ---
    // Only visible in "normal" mode (not work mode) and when it is night (moon visible)
    const getSleepMarker = () => {
        if (workMode || isDay) return null;

        let nightStartMs: number;
        let nightEndMs: number;
        let targetTime: Date;

        if (nowMs < sunriseMs) {
            // Pre-dawn: Night started yesterday sunset, ends today sunrise
            nightStartMs = sunObject.prevSunset.getTime();
            nightEndMs = sunObject.sunrise.getTime();
            targetTime = new Date(currentTime);
            targetTime.setDate(targetTime.getDate() - 1); // Yesterday
            targetTime.setHours(23, 0, 0, 0); // 11pm
        } else {
            // Post-sunset: Night starts today sunset, ends tomorrow sunrise
            nightStartMs = sunObject.sunset.getTime();
            nightEndMs = sunObject.nextSunrise.getTime();
            targetTime = new Date(currentTime);
            targetTime.setHours(23, 0, 0, 0); // 11pm
        }

        const targetMs = targetTime.getTime();
        const progress = (targetMs - nightStartMs) / (nightEndMs - nightStartMs);
        const angleDeg = progress * 180;

        // Hide if outside the visible night arc (though 11pm usually is visible)
        if (progress < 0 || progress > 1) return null;

        return { angleDeg };
    };

    const sleepMarker = getSleepMarker();

    // --- Icon Selection Logic (V2) ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let CurrentIcon: any = null; // null means use default circle (V1 behavior)

    if (isV2Icons) {
        // Default to Circle in V2 mode
        CurrentIcon = Circle;

        if (isDay) {
            // Day: 0.25 - 0.75 use SunDim
            if (cycleProgress > 0.25 && cycleProgress < 0.75) {
                CurrentIcon = SunDim;
            }
        } else {
            // Night
            // cycleProgress 0 -> 1 (Sunset -> Sunrise)
            // 0.0 - 0.25: Early Night (Moon)
            // 0.25 - 0.75: Deep Night (MoonStars)
            // 0.75 - 1.0: Pre-Dawn (Moon)
            if (cycleProgress >= 0.25 && cycleProgress < 0.75) {
                CurrentIcon = MoonStars;
            } else {
                CurrentIcon = Moon;
            }
        }
    }

    // Generate Sentence HTML
    const sentenceHtml = generateSentence(sunObject.daylight, sunObject.theme, messageIndex);

    return (
        <div className={`${styles.container} ${themeClass}`} style={containerStyle}>
            <div className={styles.contentWrapper}>
                {/* Main Horizon Area */}
                <div className={`${styles.horizon} ${styles.main}`}>
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
                                            transform: 'translate(-50%, 0)' // Centered horizontally, bottom aligned like the circle?
                                            // The circle is absolute, margin-left: -0.625rem (-10px), bottom: 0.
                                            // The span itself is 2.5rem wide (40px). 
                                            // The transform on PARENT moves it.
                                            // We just need to center the icon in the 40px wide span.
                                            // transform: translate(-50%, 0) with left: 50% does that.
                                        }}
                                    />
                                )}
                            </span>
                            {/* Work Hour Markers (9am / 5pm radial lines from center) */}
                            {workStartMarker && (
                                <div
                                    className={styles.workHourMarker}
                                    style={{
                                        transform: `rotate(${workStartMarker.angleDeg - 90}deg)`,
                                    }}
                                    title="9:00 AM"
                                />
                            )}
                            {workEndMarker && (
                                <div
                                    className={styles.workHourMarker}
                                    style={{
                                        transform: `rotate(${workEndMarker.angleDeg - 90}deg)`,
                                    }}
                                    title="5:00 PM"
                                />
                            )}
                            {sleepMarker && (
                                <div
                                    className={styles.workHourMarker}
                                    style={{
                                        transform: `rotate(${sleepMarker.angleDeg - 90}deg)`,
                                    }}
                                    title="11:00 PM"
                                />
                            )}
                        </div>
                    </div>
                    <div className={styles.horizonLine}>
                        <time className={styles.jsSunrise} title="Sunrise" dateTime={timeFormatter(sunObject.sunrise)}>
                            {timeFormatter(sunObject.sunrise)}
                        </time>
                        <time className={styles.jsSunset} title="Sunset" dateTime={timeFormatter(sunObject.sunset)}>
                            {timeFormatter(sunObject.sunset)}
                        </time>
                    </div>
                </div>

                {/* Sentence */}
                {/* Dangerously setting HTML because the formatted string contains spans/bold */}
                <p
                    className={styles.text}
                    dangerouslySetInnerHTML={{ __html: sentenceHtml }}
                />
            </div>
        </div>
    );
}
