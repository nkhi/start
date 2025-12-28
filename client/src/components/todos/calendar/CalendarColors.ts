export interface ColorVariant {
    bg: string;
    hover: string;
    border: string;
    text: string;
    fade: string;
}

export const CalendarColors = {
    variants: [
        { // Graphite
            bg: 'rgba(60, 60, 67, 0.65)',
            hover: 'rgba(60, 60, 67, 0.85)',
            border: 'rgba(235, 235, 245, 0.15)',
            text: '#F2F2F7',
            fade: 'rgba(235, 235, 245, 0.6)'
        },
        { // Red
            bg: 'rgba(180, 50, 40, 0.65)',
            hover: 'rgba(200, 60, 50, 0.85)',
            border: 'rgba(255, 100, 90, 0.2)',
            text: '#FFE5E5',
            fade: 'rgba(255, 229, 229, 0.7)'
        },
        { // Blue
            bg: 'rgba(30, 80, 180, 0.65)',
            hover: 'rgba(40, 100, 210, 0.85)',
            border: 'rgba(100, 150, 255, 0.2)',
            text: '#E0F0FF',
            fade: 'rgba(224, 240, 255, 0.7)'
        },
        { // Green
            bg: 'rgba(40, 100, 60, 0.65)',
            hover: 'rgba(50, 130, 80, 0.85)',
            border: 'rgba(100, 200, 120, 0.2)',
            text: '#E5FFE5',
            fade: 'rgba(229, 255, 229, 0.7)'
        },
        { // Orange
            bg: 'rgba(180, 100, 20, 0.65)',
            hover: 'rgba(210, 120, 30, 0.85)',
            border: 'rgba(255, 180, 80, 0.2)',
            text: '#FFF5E0',
            fade: 'rgba(255, 245, 224, 0.7)'
        },
        { // Purple
            bg: 'rgba(90, 40, 160, 0.65)',
            hover: 'rgba(110, 50, 190, 0.85)',
            border: 'rgba(180, 120, 255, 0.2)',
            text: '#F5E5FF',
            fade: 'rgba(245, 229, 255, 0.7)'
        },
    ] as ColorVariant[]
};

export function getEventColor(eventId: string, index: number): ColorVariant {
    const lastChar = eventId.charCodeAt(eventId.length - 1);
    const variantIndex = (lastChar + index) % CalendarColors.variants.length;
    return CalendarColors.variants[variantIndex];
}
