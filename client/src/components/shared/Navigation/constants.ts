import {
    CalendarCheck,
    ListChecks,
    HeartbeatIcon,
    LightbulbIcon,
    ListDashes,
    CoffeeBeanIcon,
    TreeIcon,
    ImageIcon,
    VideoCameraIcon,
    ButterflyIcon,
    CalendarIcon,
    LadderIcon,
    LadderSimpleIcon,
} from '@phosphor-icons/react';
import { API_BASE_URL } from '../../../config';
import type { NavItem, ExternalLink, TabType } from './types';

export const NAV_TABS: NavItem[] = [
    {
        id: 'habits',
        icon: CalendarCheck,
        showInWorkMode: false,
        useDuotone: true
    },
    {
        id: 'landmarks',
        icon: LadderSimpleIcon,
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
        icon: HeartbeatIcon,
        showInWorkMode: false,
        useDuotone: true
    },
    {
        id: 'memos',
        icon: LightbulbIcon,
        showInWorkMode: false,
        useDuotone: true,
        theme: {
            background: '#151618'
        }
    },
    {
        id: 'lists',
        icon: ListDashes,
        showInWorkMode: false,
        useDuotone: true
    },
    {
        id: 'next',
        icon: TreeIcon,
        showInWorkMode: false,
        useDuotone: true
    },
    {
        id: 'immich',
        icon: ImageIcon,
        showInWorkMode: false,
        useDuotone: true,
        isActive: (activeTab) => activeTab === 'immich' || activeTab === 'vlogs',
        theme: {
            background: '#000000'
        }
    },
    {
        id: 'cap',
        icon: VideoCameraIcon,
        showInWorkMode: false,
        useDuotone: true,
        onClick: ({ onTabChange }) => {
            fetch(`${API_BASE_URL}/api/services/cap/start`, { method: 'POST' }).catch(console.error);
            onTabChange('cap');
        },
        theme: {
            background: '#111111'
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
        label: 'Opening Monarch'
    },
    {
        id: 'calendar',
        href: 'https://calendar.google.com/calendar/u/0/r#main_7',
        icon: CalendarIcon,
        color: '#3B82F6',
        label: 'Opening Calendar'
    }
];
