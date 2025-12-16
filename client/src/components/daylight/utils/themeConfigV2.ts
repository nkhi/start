

export type ThemeNameV2 =
    | 'night1'
    | 'night2'
    | 'night3'
    | 'dawn'
    | 'sunrise'
    | 'morning'
    | 'noon'
    | 'afternoon'
    | 'goldenHour'
    | 'sunset'
    | 'dusk';

export interface ThemeColors {
    text: string;
    background: string;
    id: string;
}

export const THEME_COLORS_V2: Record<ThemeNameV2, ThemeColors[]> = {
    night1: [
        { id: 'night1-1', background: '#1e293b', text: '#94a3b8' }, // Midnight Slate
        { id: 'night1-2', background: '#022c22', text: '#6ee7b7' }, // Deep Forest
        { id: 'night1-3', background: '#0f0f1b', text: '#533483' }, // Royal Void
        { id: 'night1-4', background: '#000000', text: '#55ffff' }, // CGA Night
        { id: 'night1-5', background: '#0f380f', text: '#8bac0f' }, // Gameboy Dark
        { id: 'night1-6', background: '#0d0221', text: '#ff00ff' }, // Synthwave
        { id: 'night1-7', background: '#0a0a0f', text: '#ff6b6b' }, // Blade Runner
        { id: 'night1-8', background: '#1a1a2e', text: '#c9b1ff' }, // Ghibli
        { id: 'night1-9', background: '#0f0028', text: '#ff1493' }, // Outrun
        { id: 'night1-10', background: '#1c2833', text: '#f4d03f' } // Wes Anderson
    ],
    night2: [
        { id: 'night2-1', background: '#2c3e50', text: '#bdc3c7' }, // Moonlit Cloud
        { id: 'night2-2', background: '#191919', text: '#cdb4db' }, // Dream Haze
        { id: 'night2-3', background: '#0b0c10', text: '#66fcf1' }, // Starlight
        { id: 'night2-4', background: '#240046', text: '#9d4edd' }, // Deep Space
        { id: 'night2-5', background: '#0c0c0c', text: '#cccccc' }, // Terminal
        { id: 'night2-6', background: '#1a0a2e', text: '#00ffff' }, // Synthwave
        { id: 'night2-7', background: '#0d1117', text: '#58a6ff' }, // Blade Runner
        { id: 'night2-8', background: '#2d2d44', text: '#a8dadc' }, // Ghibli
        { id: 'night2-9', background: '#1a0036', text: '#00ced1' }, // Outrun
        { id: 'night2-10', background: '#2c3e50', text: '#e74c3c' } // Wes Anderson
    ],
    night3: [
        { id: 'night3-1', background: '#1e1b4b', text: '#a78bfa' }, // Electric Indigo
        { id: 'night3-2', background: '#050505', text: '#ff00ff' }, // Neon Noir
        { id: 'night3-3', background: '#001100', text: '#39ff14' }, // Phosphor
        { id: 'night3-4', background: '#10002b', text: '#e0aaff' }, // Ultraviolet
        { id: 'night3-5', background: '#020617', text: '#38bdf8' }, // Spirit
        { id: 'night3-6', background: '#16001e', text: '#ff6ec7' }, // Synthwave
        { id: 'night3-7', background: '#0b0b12', text: '#f78166' }, // Blade Runner
        { id: 'night3-8', background: '#1e3a5f', text: '#ffd6ba' }, // Ghibli
        { id: 'night3-9', background: '#120024', text: '#f39c12' }, // Outrun
        { id: 'night3-10', background: '#17202a', text: '#85c1e9' } // Wes Anderson
    ],
    dawn: [
        { id: 'dawn-1', background: '#f0f8ff', text: '#457b9d' }, // Arctic
        { id: 'dawn-2', background: '#fdf2f8', text: '#db2777' }, // First Blush
        { id: 'dawn-3', background: '#faf5ff', text: '#6b21a8' }, // Lavender Mist
        { id: 'dawn-4', background: '#e0f2f1', text: '#004d40' }, // Iceberg
        { id: 'dawn-5', background: '#fff1f2', text: '#fb7185' }, // Sherbet
        { id: 'dawn-6', background: '#2e1065', text: '#ffd700' }, // Synthwave
        { id: 'dawn-7', background: '#1a1a25', text: '#79c0ff' }, // Blade Runner
        { id: 'dawn-8', background: '#e8d6cf', text: '#7b2d26' }, // Ghibli
        { id: 'dawn-9', background: '#3d1a50', text: '#ffd700' }, // Outrun
        { id: 'dawn-10', background: '#fad6a5', text: '#8b4513' } // Wes Anderson
    ],
    sunrise: [
        { id: 'sunrise-1', background: '#fff1e6', text: '#e07a5f' }, // Peach Fuzz
        { id: 'sunrise-2', background: '#fff7ed', text: '#c2410c' }, // Solar Flare
        { id: 'sunrise-3', background: '#fefce8', text: '#854d0e' }, // Goldenrod
        { id: 'sunrise-4', background: '#eff6ff', text: '#1e40af' }, // Morning Blue
        { id: 'sunrise-5', background: '#ffcc00', text: '#cc0000' }, // Pixel Sun
        { id: 'sunrise-6', background: '#ff6b35', text: '#1a0533' }, // Synthwave
        { id: 'sunrise-7', background: '#2d2d3d', text: '#ffa657' }, // Blade Runner
        { id: 'sunrise-8', background: '#ffeaa7', text: '#d35400' }, // Ghibli
        { id: 'sunrise-9', background: '#ff4500', text: '#ffffff' }, // Outrun
        { id: 'sunrise-10', background: '#f8b500', text: '#a52a2a' } // Wes Anderson
    ],
    morning: [
        { id: 'morning-1', background: '#ecfdf5', text: '#047857' }, // Mint Chip
        { id: 'morning-2', background: '#e0f2fe', text: '#0284c7' }, // Sky High
        { id: 'morning-3', background: '#fafafa', text: '#525252' }, // Cotton
        { id: 'morning-4', background: '#fffbeb', text: '#b45309' }, // Paper
        { id: 'morning-5', background: '#9bbc0f', text: '#306230' }, // Gameboy Light
        { id: 'morning-6', background: '#ff9500', text: '#2a0845' }, // Synthwave
        { id: 'morning-7', background: '#3d3d4d', text: '#adbac7' }, // Blade Runner
        { id: 'morning-8', background: '#dfe6e9', text: '#2d3436' }, // Ghibli
        { id: 'morning-9', background: '#ff6b35', text: '#0d0019' }, // Outrun
        { id: 'morning-10', background: '#fef3c7', text: '#d35400' } // Wes Anderson
    ],
    noon: [
        { id: 'noon-1', background: '#f5f5f4', text: '#1c1917' }, // Sandstone
        { id: 'noon-2', background: '#f0f9ff', text: '#0c4a6e' }, // Azure Mist
        { id: 'noon-3', background: '#f0fdfa', text: '#0d9488' }, // Cool Mint
        { id: 'noon-4', background: '#f8fafc', text: '#334155' }, // Glacial
        { id: 'noon-5', background: '#eff6ff', text: '#3b82f6' }, // Cerulean
        { id: 'noon-6', background: '#ffecd2', text: '#be3455' }, // Synthwave
        { id: 'noon-7', background: '#4d4d5d', text: '#f0f6fc' }, // Blade Runner
        { id: 'noon-8', background: '#f5f6fa', text: '#353b48' }, // Ghibli
        { id: 'noon-9', background: '#ff8c42', text: '#1a0033' }, // Outrun
        { id: 'noon-10', background: '#fff9e6', text: '#5d4037' } // Wes Anderson
    ],
    afternoon: [
        { id: 'afternoon-1', background: '#f5f5f4', text: '#57534e' }, // Oat Milk
        { id: 'afternoon-2', background: '#ecfccb', text: '#3f6212' }, // Sage
        { id: 'afternoon-3', background: '#f0fdf4', text: '#16a34a' }, // Pistachio
        { id: 'afternoon-4', background: '#f5f5f5', text: '#3e2723' }, // Espresso
        { id: 'afternoon-5', background: '#dcfce7', text: '#166534' }, // Matcha
        { id: 'afternoon-6', background: '#ffb7b2', text: '#6b2d5c' }, // Synthwave
        { id: 'afternoon-7', background: '#3a3a4a', text: '#d4a373' }, // Blade Runner
        { id: 'afternoon-8', background: '#ffefd5', text: '#6b4423' }, // Ghibli
        { id: 'afternoon-9', background: '#e85d04', text: '#15002b' }, // Outrun
        { id: 'afternoon-10', background: '#e6d3b3', text: '#6d4c41' } // Wes Anderson
    ],
    goldenHour: [
        { id: 'goldenHour-1', background: '#f59e0b', text: '#451a03' }, // Honey
        { id: 'goldenHour-2', background: '#4c1d95', text: '#fbbf24' }, // Violet Sun
        { id: 'goldenHour-3', background: '#d97706', text: '#fff1f2' }, // Retro Gold
        { id: 'goldenHour-4', background: '#7c2d12', text: '#ffedd5' }, // Cinematic
        { id: 'goldenHour-5', background: '#581c87', text: '#e9d5ff' }, // Lilac Hour
        { id: 'goldenHour-6', background: '#ff0080', text: '#ffffff' }, // Synthwave
        { id: 'goldenHour-7', background: '#2a1f3d', text: '#f72585' }, // Blade Runner
        { id: 'goldenHour-8', background: '#fab1a0', text: '#6c3461' }, // Ghibli
        { id: 'goldenHour-9', background: '#d00070', text: '#8a185bff' }, // Outrun
        { id: 'goldenHour-10', background: '#f4a261', text: '#264653' } // Wes Anderson
    ],
    sunset: [
        { id: 'sunset-1', background: '#4c1d95', text: '#22d3ee' }, // Aura
        { id: 'sunset-2', background: '#3a0ca3', text: '#f72585' }, // Synth
        { id: 'sunset-3', background: '#fcd34d', text: '#be185d' }, // California
        { id: 'sunset-4', background: '#ffe4e6', text: '#e11d48' }, // Flamingo
        { id: 'sunset-5', background: '#fff1f2', text: '#be185d' }, // Blush
        { id: 'sunset-6', background: '#9d4edd', text: '#00ffff' }, // Synthwave
        { id: 'sunset-7', background: '#1a0a24', text: '#7209b7' }, // Blade Runner
        { id: 'sunset-8', background: '#fdcb6e', text: '#6c5ce7' }, // Ghibli
        { id: 'sunset-9', background: '#7b2cbf', text: '#580550ff' }, // Outrun
        { id: 'sunset-10', background: '#e76f51', text: '#f6e5b8' } // Wes Anderson
    ],
    dusk: [
        { id: 'dusk-1', background: '#312e81', text: '#e0e7ff' }, // Velvet
        { id: 'dusk-2', background: '#0f172a', text: '#38bdf8' }, // Deep Sea
        { id: 'dusk-3', background: '#581c87', text: '#f3e8ff' }, // Amethyst
        { id: 'dusk-4', background: '#000000', text: '#00FFFF' }, // VVVVVV
        { id: 'dusk-5', background: '#1e1b4b', text: '#c084fc' }, // Midnight Purple
        { id: 'dusk-6', background: '#3c096c', text: '#ff00ff' }, // Synthwave
        { id: 'dusk-7', background: '#0d0d17', text: '#4cc9f0' }, // Blade Runner
        { id: 'dusk-8', background: '#6c5ce7', text: '#ffeaa7' }, // Ghibli
        { id: 'dusk-9', background: '#2d0068', text: '#ff00ff' }, // Outrun
        { id: 'dusk-10', background: '#264653', text: '#e9c46a' } // Wes Anderson
    ],
};

export const THEME_PHASES_V2 = [
    {
        name: 'night' as ThemeNameV2,
        startKey: 'night',
        endKey: 'nightEnd',
        isNight: true,
    },
    {
        name: 'dawn' as ThemeNameV2,
        startKey: 'nightEnd',
        endKey: 'sunrise',
    },
    {
        name: 'sunrise' as ThemeNameV2,
        startKey: 'sunrise',
        endKey: 'sunriseEnd',
    },
    {
        name: 'morning' as ThemeNameV2,
        startKey: 'sunriseEnd',
        endKey: 'solarNoon',
    },
    {
        name: 'noon' as ThemeNameV2,
        startKey: 'solarNoon',
        endKey: 'goldenHour',
    },
    {
        name: 'goldenHour' as ThemeNameV2,
        startKey: 'goldenHour',
        endKey: 'sunsetStart',
    },
    {
        name: 'sunset' as ThemeNameV2,
        startKey: 'sunsetStart',
        endKey: 'sunset',
    },
    {
        name: 'dusk' as ThemeNameV2,
        startKey: 'sunset',
        endKey: 'dusk',
    }
];

// Re-export specific items if needed
