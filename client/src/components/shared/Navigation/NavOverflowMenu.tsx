import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, DotsNine, Tray } from '@phosphor-icons/react';
import navStyles from './Navigation.module.css';
import styles from './NavOverflowMenu.module.css';
import type { ExternalLink, NavItem, TabType } from './types';

interface NavOverflowMenuProps {
    tabs: NavItem[];
    externalLinks?: ExternalLink[];
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    isMemoryPanelOpen: boolean;
    onOpenMemories: () => void;
}

/**
 * Compact popover menu for secondary navigation apps, Good Moments, and external links.
 */
export function NavOverflowMenu({
    tabs,
    externalLinks = [],
    activeTab,
    onTabChange,
    isMemoryPanelOpen,
    onOpenMemories,
}: NavOverflowMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const isOverflowTabActive = tabs.some((tab) =>
        tab.isActive ? tab.isActive(activeTab) : tab.id === activeTab
    );

    useEffect(() => {
        if (!isOpen) return;

        const handleOutsideMouseDown = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideMouseDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleOutsideMouseDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const handleTabSelect = (tab: NavItem) => {
        if (tab.onClick) {
            tab.onClick({ onTabChange });
        } else {
            onTabChange(tab.id as TabType);
        }
        setIsOpen(false);
    };

    const handleMemoriesSelect = () => {
        setIsOpen(false);
        onOpenMemories();
    };

    const isTriggerHighlighted = isOpen || isOverflowTabActive || isMemoryPanelOpen;

    return (
        <div className={styles.overflowWrap} ref={containerRef}>
            <button
                type="button"
                className={`${navStyles.tabBtn} ${styles.triggerBtn} ${isTriggerHighlighted ? navStyles.active : ''} ${isOpen ? styles.triggerOpen : ''}`}
                onClick={() => setIsOpen((prev) => !prev)}
                aria-label="More apps"
                aria-expanded={isOpen}
                aria-haspopup="menu"
                title="More apps"
            >
                <DotsNine
                    size={24}
                    weight={isTriggerHighlighted ? 'bold' : 'regular'}
                    className={navStyles.navIcon}
                />
            </button>

            {isOpen && (
                <div className={styles.overflowMenu} role="menu" aria-label="Secondary apps">
                    {tabs.map((tab, index) => {
                        const Icon = tab.icon;
                        const isActive = tab.isActive ? tab.isActive(activeTab) : activeTab === tab.id;

                        return (
                            <React.Fragment key={tab.id}>
                                <button
                                    type="button"
                                    className={`${styles.menuItem} ${isActive ? styles.activeItem : ''}`}
                                    onClick={() => handleTabSelect(tab)}
                                    role="menuitem"
                                >
                                    <span className={styles.itemIcon}>
                                        <Icon
                                            size={16}
                                            weight={isActive ? (tab.useDuotone ? 'duotone' : 'bold') : 'regular'}
                                        />
                                    </span>
                                    <span className={styles.itemTitle}>{tab.label ?? tab.id}</span>
                                </button>
                                {tab.dividerAfter && index < tabs.length - 1 && (
                                    <div className={styles.menuDivider} role="separator" />
                                )}
                            </React.Fragment>
                        );
                    })}

                    <div className={styles.menuDivider} role="separator" />

                    <button
                        type="button"
                        className={`${styles.menuItem} ${isMemoryPanelOpen ? styles.activeItem : ''}`}
                        onClick={handleMemoriesSelect}
                        role="menuitem"
                    >
                        <span className={styles.itemIcon}>
                            <Tray size={16} weight={isMemoryPanelOpen ? 'duotone' : 'regular'} />
                        </span>
                        <span className={styles.itemTitle}>Memories</span>
                    </button>

                    {externalLinks.length > 0 && (
                        <>
                            <div className={styles.menuDivider} role="separator" />
                            {externalLinks.map((link) => {
                                const Icon = link.icon;
                                return (
                                    <a
                                        key={link.id}
                                        href={link.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.menuItem}
                                        onClick={() => setIsOpen(false)}
                                        role="menuitem"
                                    >
                                        <span className={styles.itemIcon}>
                                            <Icon size={16} weight="regular" />
                                        </span>
                                        <span className={styles.itemTitle}>{link.label}</span>
                                        <span className={styles.itemExternalIcon} aria-hidden="true">
                                            <ArrowUpRight size={12} />
                                        </span>
                                    </a>
                                );
                            })}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

