import { useState } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LabelList
} from 'recharts';
import type { Habit } from '../../types';

interface ChartModalProps {
    data: any[];
    habits: Habit[];
    onClose: () => void;
}

// Distinct, high-contrast colors suitable for dark background
const COLORS = [
    '#FF5252', // Red Accent
    '#448AFF', // Blue Accent
    '#69F0AE', // Green Accent
    '#FFD740', // Amber Accent
    '#E040FB', // Purple Accent
    '#18FFFF', // Cyan Accent
    '#FFAB40', // Orange Accent
    '#FF4081', // Pink Accent
    '#B2FF59', // Light Green Accent
    '#7C4DFF', // Deep Purple Accent
    '#64FFDA', // Teal Accent
    '#FF6E40', // Deep Orange Accent
    '#40C4FF', // Light Blue Accent
    '#EEFF41', // Lime Accent
    '#F44336', // Red
    '#2196F3', // Blue
    '#4CAF50', // Green
    '#FFC107', // Amber
    '#9C27B0', // Purple
    '#00BCD4', // Cyan
];

export default function ChartModal({ data, habits, onClose }: ChartModalProps) {
    const [highlightedHabitId, setHighlightedHabitId] = useState<string | null>(null);

    const handleHabitClick = (habitId: string) => {
        setHighlightedHabitId(prev => prev === habitId ? null : habitId);
    };

    // Custom label renderer to place text to the left of the first data point
    const renderCustomLabel = (props: any, habitName: string, isDimmed: boolean) => {
        const { x, y, index } = props;
        // Only render for the first data point (index 0)
        if (index === 0) {
            return (
                <text
                    x={x - 12}
                    y={y}
                    dy={4}
                    textAnchor="end"
                    fill="#e5e5e5"
                    fontSize={12}
                    fontWeight={500}
                    opacity={isDimmed ? 0.1 : 1}
                    style={{ transition: 'opacity 0.3s ease' }}
                >
                    {habitName}
                </text>
            );
        }
        return null;
    };

    return (
        <div className="vlog-modal-overlay" onClick={onClose}>
            <div
                className="vlog-modal-content"
                onClick={(e) => {
                    e.stopPropagation();
                    // Optional: Clicking background could clear selection, but let's keep it sticky for now
                    // setHighlightedHabitId(null); 
                }}
                style={{
                    height: '85vh',
                    width: '95vw',
                    maxWidth: '1400px',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#111',
                    border: '1px solid #333',
                    boxShadow: '0 0 40px rgba(0,0,0,0.5)'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '0 10px' }}>
                    <div>
                        <h2 style={{ color: 'white', margin: 0, fontSize: '1.5rem' }}>Weekly Habit Trends</h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#888',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#222'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        ✕
                    </button>
                </div>

                <div style={{ flex: 1, minHeight: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={data}
                            margin={{
                                top: 20,
                                right: 50,
                                left: 150, // Increased left margin to accommodate labels
                                bottom: 20,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                            <XAxis
                                dataKey="name"
                                stroke="#666"
                                tick={{ fill: '#666' }}
                                axisLine={{ stroke: '#333' }}
                                tickLine={{ stroke: '#333' }}
                                dy={10}
                            />
                            <YAxis
                                stroke="#666"
                                domain={[0, 100]}
                                tick={{ fill: '#666' }}
                                unit="%"
                                axisLine={{ stroke: '#333' }}
                                tickLine={{ stroke: '#333' }}
                                dx={-10}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(20, 20, 20, 0.95)',
                                    border: '1px solid #333',
                                    color: '#fff',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                                }}
                                itemStyle={{ color: '#ccc', padding: '2px 0' }}
                                cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                            />
                            <Legend
                                wrapperStyle={{ paddingTop: '20px' }}
                                onClick={(e) => handleHabitClick(e.dataKey as string)}
                                cursor="pointer"
                                iconType="circle"
                            />
                            {habits.map((habit, index) => {
                                const color = COLORS[index % COLORS.length];
                                const isHighlighted = highlightedHabitId === habit.id;
                                const isDimmed = highlightedHabitId !== null && !isHighlighted;

                                return (
                                    <Line
                                        key={habit.id}
                                        type="monotone"
                                        dataKey={habit.id}
                                        name={habit.name}
                                        stroke={color}
                                        strokeWidth={isHighlighted ? 4 : 2}
                                        strokeOpacity={isDimmed ? 0.1 : 1}
                                        dot={isHighlighted ? { r: 6, strokeWidth: 2, fill: '#111' } : { r: 0 }}
                                        activeDot={{ r: 8, strokeWidth: 0 }}
                                        connectNulls
                                        onClick={() => handleHabitClick(habit.id)}
                                        style={{ cursor: 'pointer' }}
                                        animationDuration={300}
                                    >
                                        <LabelList
                                            dataKey={habit.id}
                                            content={(props) => renderCustomLabel(props, habit.name, isDimmed)}
                                        />
                                    </Line>
                                );
                            })}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
