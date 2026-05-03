import type { Icon } from '@phosphor-icons/react';

export type TabType = 'habits' | 'todos' | 'journal' | 'memos' | 'next' | 'lists' | 'spending' | 'landmarks' | 'daylight' | 'vlogs' | 'memories' | 'immich' | 'cap';

export interface ThemeConfig {
    /** Background color for the navigation container */
    background?: string;
}

export interface NavItem {
    id: TabType | string;
    icon: Icon;
    label?: string;
    href?: string;
    color?: string;
    showInWorkMode: boolean;
    useDuotone?: boolean;
    onClick?: (options: { onTabChange: (tab: TabType) => void }) => void;
    isActive?: (activeTab: TabType) => boolean;
    /** Optional theme configuration for this tab */
    theme?: ThemeConfig;
}

export interface ExternalLink {
    id: string;
    href: string;
    icon: Icon;
    color: string;
    label: string;
}
