import { useState, useEffect } from 'react';
import { getMemories } from '../../api/memories';
import type { Memory } from '../../types';

// Toggle this to false when ready to use real data
const USE_MOCK_DATA = false;

// Generate mock memories for development
function generateMockMemories(count: number, year: number): Memory[] {
    const memories: Memory[] = [];
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const daySpan = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < count; i++) {
        const randomDayOffset = Math.floor(Math.random() * daySpan);
        const memoryDate = new Date(startDate);
        memoryDate.setDate(memoryDate.getDate() + randomDayOffset);

        memories.push({
            id: `mock-memory-${i}`,
            text: `This is a placeholder memory #${i + 1}. It represents a good moment from the year.`,
            date: memoryDate.toISOString().split('T')[0],
            createdAt: memoryDate.toISOString(),
        });
    }

    // Sort by date ascending
    return memories.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function useMemories() {
    const [memories, setMemories] = useState<Memory[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Determine date range - current year
    const currentYear = new Date().getFullYear();
    const fromDate = `${currentYear}-01-01`;
    const toDate = `${currentYear}-12-31`;

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (USE_MOCK_DATA) {
                    // Use 30 mock memories for development
                    const mockData = generateMockMemories(30, currentYear);
                    setMemories(mockData);
                } else {
                    const data = await getMemories(fromDate, toDate);
                    // Sort by date ascending (oldest first at top)
                    const sorted = [...data].sort((a, b) =>
                        new Date(a.date).getTime() - new Date(b.date).getTime()
                    );
                    setMemories(sorted);
                }
            } catch (error) {
                console.error('Failed to fetch memories:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [fromDate, toDate, currentYear]);

    return { memories, isLoading, currentYear };
}
