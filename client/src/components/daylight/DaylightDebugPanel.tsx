import styles from './Daylight.module.css';
import { useDaylight } from './DaylightContext';
import { THEME_COLORS_V2, type ThemeNameV2 } from './utils/themeConfigV2';
import {
    Sun,
    SunDim,
    SunHorizon,
    Moon,
    MoonStars,
    CloudMoon,
    CloudSun
} from '@phosphor-icons/react';

// Phase configuration with icons and angular positions
// 0° = top (noon), 90° = right (dusk), 180° = bottom (midnight), 270° = left (dawn)
// Clockwise from noon: afternoon → sunset → night → dawn → morning → noon
const PHASE_CONFIG: Record<ThemeNameV2, { icon: React.ElementType; angle: number; label: string }> = {
    'noon': { icon: Sun, angle: 0, label: 'Noon' },
    'afternoon': { icon: Sun, angle: 30, label: 'Afternoon' },
    'goldenHour': { icon: CloudSun, angle: 55, label: 'Golden Hour' },
    'sunset': { icon: SunHorizon, angle: 80, label: 'Sunset' },
    'dusk': { icon: CloudMoon, angle: 105, label: 'Dusk' },
    'night1': { icon: CloudMoon, angle: 135, label: 'Early Night' },
    'night2': { icon: MoonStars, angle: 180, label: 'Midnight' },
    'night3': { icon: Moon, angle: 225, label: 'Late Night' },
    'dawn': { icon: SunHorizon, angle: 260, label: 'Dawn' },
    'sunrise': { icon: SunDim, angle: 290, label: 'Sunrise' },
    'morning': { icon: SunDim, angle: 325, label: 'Morning' },
};

const phaseOrder: ThemeNameV2[] = [
    'noon', 'afternoon', 'goldenHour', 'sunset', 'dusk',
    'night1', 'night2', 'night3', 'dawn', 'sunrise', 'morning'
];

export function DaylightDebugPanel() {
    const {
        isDebugPanelOpen,
        jumpToPhase,
        setManualVariantIndex,
        sunObject,
        themeColors
    } = useDaylight();

    if (!isDebugPanelOpen || !sunObject) return null;

    const currentTheme = sunObject.theme as ThemeNameV2;
    const variants = THEME_COLORS_V2[currentTheme] || [];

    const isVariantActive = (variant: typeof variants[0]) => {
        return themeColors?.background === variant.background &&
            themeColors?.text === variant.text;
    };

    const handlePhaseClick = (phase: ThemeNameV2) => {
        jumpToPhase(phase);
    };

    const handleVariantClick = (index: number) => {
        setManualVariantIndex(index);
    };

    // Calculate position on the compass circle
    const getPosition = (angle: number, radius: number) => {
        const rad = (angle - 90) * (Math.PI / 180);
        return {
            x: Math.cos(rad) * radius,
            y: Math.sin(rad) * radius,
        };
    };

    const compassRadius = 110;
    const currentConfig = PHASE_CONFIG[currentTheme];

    return (
        <div className={styles.debugPanel}>

            {/* Compass Phase Selector */}
            <div className={styles.compassContainer}>
                <div className={styles.compassRing}>
                    {/* Compass rose crosshairs */}
                    <div className={styles.compassCrosshairs} />

                    {/* Animated ring */}
                    <div className={styles.compassAnimatedRing} />

                    {/* Current phase indicator in center */}
                    <div className={styles.compassCenter}>
                        {currentConfig && (
                            <>
                                <currentConfig.icon size={32} weight="fill" />
                                <span className={styles.compassCenterLabel}>
                                    {currentConfig.label}
                                </span>
                            </>
                        )}
                    </div>

                    {/* Phase buttons around the compass */}
                    {phaseOrder.map((phase) => {
                        const config = PHASE_CONFIG[phase];
                        const pos = getPosition(config.angle, compassRadius);
                        const isActive = currentTheme === phase;
                        const IconComponent = config.icon;

                        return (
                            <button
                                key={phase}
                                className={`${styles.compassPhaseBtn} ${isActive ? styles.active : ''}`}
                                onClick={() => handlePhaseClick(phase)}
                                style={{
                                    transform: `translate(${pos.x}px, ${pos.y}px)`,
                                }}
                                title={config.label}
                            >
                                <IconComponent size={20} weight={isActive ? 'fill' : 'regular'} />
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Theme Variants */}
            <div className={styles.debugSection}>
                <div className={styles.sectionLabel}>Color Palette</div>
                <div className={styles.variantGrid}>
                    {variants.map((variant, index) => {
                        const isActive = isVariantActive(variant);
                        return (
                            <button
                                key={variant.id || index}
                                className={`${styles.variantBtn} ${isActive ? styles.active : ''}`}
                                onClick={() => handleVariantClick(index)}
                            >
                                <div
                                    className={styles.variantPreview}
                                    style={{
                                        backgroundColor: variant.background,
                                        color: variant.text,
                                    }}
                                >
                                    <span style={{ color: variant.text }}>Aa</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
