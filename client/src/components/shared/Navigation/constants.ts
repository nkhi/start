import {
    CalendarCheck,
    ListChecks,
    HeartbeatIcon,
    LightbulbIcon,
    ListDashes,
    TreeIcon,
    ImageIcon,
    VideoCameraIcon,
    ButterflyIcon,
    CalendarIcon,
    LadderSimpleIcon,
    NotebookIcon,
} from '@phosphor-icons/react';
import { API_BASE_URL } from '../../../config';
import type { NavItem, ExternalLink } from './types';

export const NAV_TABS: NavItem[] = [
    {
        id: 'habits',
        icon: CalendarCheck,
        showInWorkMode: false,
        useDuotone: true
    },
    {
        id: 'todos',
        icon: ListChecks,
        showInWorkMode: true,
        useDuotone: false // Todos uses 'bold' when active
    },
    {
        id: 'journal',
        icon: NotebookIcon,
        showInWorkMode: false,
        useDuotone: true
    },
    {
        id: 'memos',
        icon: LightbulbIcon,
        showInWorkMode: false,
        useDuotone: true,
        // dividerAfter: true,
        theme: {
            background: '#151618'
        }
    },
    {
        id: 'landmarks',
        label: 'Landmarks',
        icon: LadderSimpleIcon,
        showInWorkMode: false,
        useDuotone: true,
        overflow: true
    },
    {
        id: 'lists',
        label: 'Lists',
        icon: ListDashes,
        showInWorkMode: false,
        useDuotone: true,
        overflow: true
    },
    {
        id: 'next',
        label: 'Next',
        icon: TreeIcon,
        showInWorkMode: false,
        useDuotone: true,
        dividerAfter: true,
        overflow: true
    },
    {
        id: 'cap',
        label: 'Cap',
        icon: VideoCameraIcon,
        showInWorkMode: false,
        useDuotone: true,
        overflow: true,
        onClick: ({ onTabChange }) => {
            fetch(`${API_BASE_URL}/api/services/cap/start`, { method: 'POST' }).catch(console.error);
            onTabChange('cap');
        },
        theme: {
            background: '#111111'
        }
    },
    {
        id: 'immich',
        label: 'Immich',
        icon: ImageIcon,
        showInWorkMode: false,
        useDuotone: true,
        overflow: true,
        isActive: (activeTab) => activeTab === 'immich' || activeTab === 'vlogs',
        theme: {
            background: '#000000'
        }
    },

    // {
    //     id: 'memories',
    //     icon: TreeIcon, // Placeholder - not shown in nav, but needed for theme
    //     showInWorkMode: false,
    //     useDuotone: true,
    //     theme: {
    //         background: '#000000'
    //     }
    // }
];

export const EXTERNAL_LINKS: ExternalLink[] = [
    {
        id: 'monarch',
        href: 'https://app.monarchmoney.com/accounts?chartType=performance&dateRange=6M&timeframe=month',
        icon: ButterflyIcon,
        color: '#f97316',
        label: 'Monarch'
    },
    {
        id: 'calendar',
        href: 'https://calendar.google.com/calendar/u/0/r#main_7',
        icon: CalendarIcon,
        color: '#3B82F6',
        label: 'Calendar'
    }
];
