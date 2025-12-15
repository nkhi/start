import { CalendarCheck, ListChecks, TipJarIcon, LightbulbIcon, ListDashes, TreeIcon, HeartbeatIcon, CarrotIcon, SunDim } from '@phosphor-icons/react';
import { ServerStatus } from './ServerStatus';
import styles from './Navigation.module.css';
import { useDaylight } from '../daylight/DaylightContext';

type TabType = 'habits' | 'todos' | 'logs' | 'memos' | 'next' | 'lists' | 'daylight';

interface NavigationProps {
    activeTab: TabType;
    lastTab?: TabType;
    onTabChange: (tab: TabType) => void;
    apiBaseUrl: string;
    workMode?: boolean;
}

export function Navigation({ activeTab, lastTab, onTabChange, apiBaseUrl, workMode = false }: NavigationProps) {
    const { themeColors } = useDaylight();

    const navStyle = (activeTab === 'daylight' && themeColors) ? {
        '--daylight-text-color': themeColors.text
    } as React.CSSProperties : {};

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
                <button onClick={handleDaylightClick} className={styles.tabBtn}>
                    <SunDim size={20} weight="duotone" />
                </button>

                <ServerStatus apiBaseUrl={apiBaseUrl} />
            </div>

            <div className={styles.tabSwitcher}>
                {!workMode && (
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'habits' ? styles.active : ''}`}
                        onClick={() => onTabChange('habits')}
                    >
                        <CalendarCheck size={20} weight={activeTab === 'habits' ? 'duotone' : 'regular'} className={styles.navIcon} />
                        <span className={styles.navText}>Habits</span>
                    </button>
                )}
                <button
                    className={`${styles.tabBtn} ${activeTab === 'todos' ? styles.active : ''}`}
                    onClick={() => onTabChange('todos')}
                >
                    <ListChecks size={20} weight={activeTab === 'todos' ? 'bold' : 'regular'} className={styles.navIcon} />
                    <span className={styles.navText}>Todos</span>
                </button>
                {!workMode && (
                    <>
                        <button
                            className={`${styles.tabBtn} ${activeTab === 'memos' ? styles.active : ''}`}
                            onClick={() => onTabChange('memos')}
                        >
                            <LightbulbIcon size={20} weight={activeTab === 'memos' ? 'duotone' : 'regular'} className={styles.navIcon} />
                            <span className={styles.navText}>Memos</span>
                        </button>
                        <button
                            className={`${styles.tabBtn} ${activeTab === 'logs' ? styles.active : ''}`}
                            onClick={() => onTabChange('logs')}
                        >
                            <HeartbeatIcon size={20} weight={activeTab === 'logs' ? 'duotone' : 'regular'} className={styles.navIcon} />
                            <span className={styles.navText}>Journal</span>
                        </button>
                        <button
                            className={`${styles.tabBtn} ${activeTab === 'lists' ? styles.active : ''}`}
                            onClick={() => onTabChange('lists')}
                        >
                            <ListDashes size={20} weight={activeTab === 'lists' ? 'duotone' : 'regular'} className={styles.navIcon} />
                            <span className={styles.navText}>Lists</span>
                        </button>
                        <button
                            className={`${styles.tabBtn} ${activeTab === 'next' ? styles.active : ''}`}
                            onClick={() => onTabChange('next')}
                        >
                            <TreeIcon size={20} weight={activeTab === 'next' ? 'duotone' : 'regular'} className={styles.navIcon} />
                            <span className={styles.navText}>Grow</span>
                        </button>
                    </>
                )}
            </div>

            {!workMode && (
                <div className={styles.rightLinks}>
                    <a href="https://central.karat.io/interviewer/dashboard" target="_blank" rel="noreferrer" className={styles.iconLink}>
                        <CarrotIcon size={20} weight="duotone" />
                    </a>
                    <a href="https://app.monarchmoney.com/accounts?chartType=performance&dateRange=6M&timeframe=month" target="_blank" rel="noreferrer" className={styles.iconLink}>
                        <TipJarIcon size={20} weight="duotone" />
                    </a>
                </div>
            )}
            {workMode && <div className={styles.rightLinks} />}
        </div>
    );
}

