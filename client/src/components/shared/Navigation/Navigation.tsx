import React from 'react';
import { SunDim } from '@phosphor-icons/react';
import { ServerStatus } from '../ServerStatus';
import styles from './Navigation.module.css';
import { useDaylight } from '../../daylight/DaylightContext';
import { NookButton } from '../../nook/NookButton';
import { MemoryButton } from '../../memories/MemoryButton';
import { useNavHotkeys } from '../../../hooks/useNavHotkeys';
import { useCalendarEventsContext } from '../../../contexts/CalendarEventsContext';
import { useApiError } from '../ApiErrorContext';

import { NAV_TABS, EXTERNAL_LINKS } from './constants';
import { HoldButton } from './HoldButton';
import { HoldLink } from './HoldLink';
import type { TabType } from './types';

interface NavigationProps {
    activeTab: TabType;
    lastTab?: TabType;
    onTabChange: (tab: TabType) => void;
    workMode?: boolean;
}

export function Navigation({ activeTab, lastTab, onTabChange, workMode = false }: NavigationProps) {
    const { themeColors } = useDaylight();
    useNavHotkeys({ onTabChange, workMode });
    const [isMemoryPanelOpen, setIsMemoryPanelOpen] = React.useState(false);
    const calendarContext = useCalendarEventsContext();
    const { addError } = useApiError();

    // Prefetch calendar events on mount (±7 days)
    React.useEffect(() => {
        if (!calendarContext) return;
        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() - 7);
        const end = new Date(today);
        end.setDate(today.getDate() + 7);
        calendarContext.prefetchDateRange(start, end);
    }, [calendarContext]);

    // Find the active tab's theme configuration
    const activeTabConfig = NAV_TABS.find(tab => {
        if (tab.isActive) {
            return tab.isActive(activeTab);
        }
        return tab.id === activeTab;
    });

    // Build dynamic nav styles based on active tab theme or daylight
    const navStyle = React.useMemo(() => {
        const styles: React.CSSProperties = {};

        // Daylight mode takes precedence for immersive experience
        if (activeTab === 'daylight' && themeColors) {
            styles['--nav-text-color' as any] = themeColors.text;
            return styles;
        }

        // Apply background from tab configuration
        if (activeTabConfig?.theme?.background) {
            styles['background' as any] = activeTabConfig.theme.background;
        }

        return styles;
    }, [activeTab, activeTabConfig, themeColors]);

    const handleDaylightClick = () => {
        if (activeTab === 'daylight' && lastTab) {
            onTabChange(lastTab);
        } else {
            onTabChange('daylight');
        }
    };

    return (
        <div
            className={`${styles.navContainer} ${activeTab === 'daylight' ? styles.immersive : ''}`}
            style={navStyle}
        >
            <div className={styles.leftSection}>
                <HoldButton
                    onClick={handleDaylightClick}
                    className={styles.tabBtn}
                    color="#f59e0b"
                    label="Opening Daylight"
                >
                    <SunDim size={20} weight="duotone" />
                </HoldButton>

                <NookButton />

                <ServerStatus />
            </div>

            <div className={styles.tabSwitcher}>
                {NAV_TABS.filter(tab => !workMode || tab.showInWorkMode).map((tab) => {
                    const Icon = tab.icon;
                    const isActive = tab.isActive ? tab.isActive(activeTab) : activeTab === tab.id;

                    const handleClick = () => {
                        if (tab.onClick) {
                            tab.onClick({ onTabChange });
                        } else {
                            onTabChange(tab.id as TabType);
                        }
                    };

                    return (
                        <button
                            key={tab.id}
                            className={`${styles.tabBtn} ${isActive ? styles.active : ''}`}
                            onClick={handleClick}
                        >
                            <Icon
                                size={24}
                                weight={isActive ? (tab.useDuotone ? 'duotone' : 'bold') : 'regular'}
                                className={styles.navIcon}
                            />
                        </button>
                    );
                })}

                {!workMode && (
                    <MemoryButton
                        isPanelOpen={isMemoryPanelOpen}
                        onToggle={() => setIsMemoryPanelOpen(!isMemoryPanelOpen)}
                        onTimelineOpen={() => {
                            const today = new Date();
                            // Month is 0-indexed (11 is December).
                            // Last 4 days are 28, 29, 30, 31.
                            const isEndOfYear =
                                today.getMonth() === 11 &&
                                today.getDate() >= 28;

                            if (isEndOfYear) {
                                setIsMemoryPanelOpen(false);
                                onTabChange('memories');
                            } else {
                                addError(425, 'memories', "It is not time to look back yet.");
                            }
                        }}
                        className={`${styles.tabBtn} ${isMemoryPanelOpen ? styles.active : ''}`}
                    />
                )}
            </div>

            {!workMode && (
                <div className={styles.rightLinks}>
                    {EXTERNAL_LINKS.map((link) => {
                        const Icon = link.icon;
                        return (
                            <HoldLink
                                key={link.id}
                                href={link.href}
                                className={styles.iconLink}
                                color={link.color}
                                label={link.label}
                            >
                                <Icon size={20} weight="duotone" />
                            </HoldLink>
                        );
                    })}
                </div>
            )}
            {workMode && <div className={styles.rightLinks} />}
        </div>
    );
}
