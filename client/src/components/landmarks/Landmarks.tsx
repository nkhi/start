import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash, Ghost } from '@phosphor-icons/react';
import { getLandmarks, createLandmark, updateLandmark as apiUpdateLandmark, deleteLandmark, reorderLandmarks } from '../../api/landmarks';
import type { LandmarksByCategory, LandmarkItem } from '../../types';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, pointerWithin, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './Landmarks.module.css';

// Sortable wrapper for landmark items
function SortableLandmarkItem({ item, children }: { item: LandmarkItem; children: React.ReactNode }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: `item-${item.id}`,
        data: { type: 'landmarkItem', item }
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`${styles.draggableItem} ${isDragging ? styles.draggingItem : ''}`}
            {...attributes}
            {...listeners}
        >
            {children}
        </div>
    );
}

// Helper to determine if a date is in the past, today, or future
const getDateStatus = (dateStr: string | null | undefined): 'past' | 'today' | 'future' => {
    if (!dateStr) return 'future'; // No date = treat as future
    const itemDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    itemDate.setHours(0, 0, 0, 0);

    if (itemDate < today) return 'past';
    if (itemDate.getTime() === today.getTime()) return 'today';
    return 'future';
};

export const Landmarks: React.FC = () => {
    const [landmarks, setLandmarks] = useState<LandmarksByCategory>({ orient: [], forward: [], big_things: [] });
    const [newItemText, setNewItemText] = useState<Record<string, string>>({ orient: '', forward: '', big_things: '' });
    const [newItemDate, setNewItemDate] = useState<string>('');
    const [activeItem, setActiveItem] = useState<LandmarkItem | null>(null);
    const [showAddInput, setShowAddInput] = useState<Record<string, boolean>>({ orient: false, forward: false, big_things: false });
    const [showPastEvents, setShowPastEvents] = useState<boolean>(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    useEffect(() => {
        fetchLandmarks();
    }, []);

    const fetchLandmarks = async () => {
        try {
            const data = await getLandmarks();
            console.log('🔍 API Response:', data);
            console.log('🔍 big_things from API:', data.big_things);
            setLandmarks({
                orient: data.orient || [],
                forward: data.forward || [],
                big_things: data.big_things || []
            });
        } catch (error) {
            console.error('Error fetching landmarks:', error);
        }
    };

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const { active } = event;
        const data = active.data.current;
        if (data?.type === 'landmarkItem') {
            setActiveItem(data.item);
        }
    }, []);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveItem(null);

        if (!over || active.id === over.id) return;

        const activeItemId = String(active.id).replace('item-', '');
        const overItemId = String(over.id).replace('item-', '');
        const activeItemData = active.data.current?.item as LandmarkItem;

        if (!activeItemData) return;

        const category = activeItemData.category;
        const rawItems = landmarks[category as keyof LandmarksByCategory];
        const items = Array.isArray(rawItems) ? rawItems : [];

        const oldIndex = items.findIndex(i => i.id === activeItemId);
        const newIndex = items.findIndex(i => i.id === overItemId);

        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

        const newItems = [...items];
        const [movedItem] = newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, movedItem);

        const newItemOrder = newItems.map(item => item.id);

        // Optimistic update
        setLandmarks(prev => ({
            ...prev,
            [category]: newItems.map((item, i) => ({ ...item, position: i }))
        }));

        try {
            await reorderLandmarks({ category, itemOrder: newItemOrder });
        } catch (error) {
            console.error('Error reordering landmarks:', error);
            fetchLandmarks();
        }
    }, [landmarks]);

    const handleAddItem = async (category: keyof LandmarksByCategory) => {
        const text = newItemText[category]?.trim();
        if (!text) return;

        const newItem = {
            id: crypto.randomUUID(),
            category,
            text,
            date: category === 'forward' && newItemDate ? newItemDate : undefined
        };

        try {
            const savedItem = await createLandmark(newItem);
            setLandmarks(prev => {
                if (!prev) return { orient: [], forward: [], big_things: [] };
                const prevCategoryItems = prev[category];
                const safeItems = Array.isArray(prevCategoryItems) ? prevCategoryItems : [];
                return {
                    ...prev,
                    [category]: [...safeItems, savedItem]
                };
            });
            setNewItemText(prev => ({ ...prev, [category]: '' }));
            setNewItemDate('');
            setShowAddInput(prev => ({ ...prev, [category]: false }));
        } catch (error) {
            console.error('Error creating landmark:', error);
        }
    };

    const handleUpdateItem = async (id: string, category: keyof LandmarksByCategory, text: string) => {
        // Optimistic update
        setLandmarks(prev => {
            const prevItems = Array.isArray(prev[category]) ? prev[category] : [];
            return {
                ...prev,
                [category]: prevItems.map(item =>
                    item.id === id ? { ...item, text } : item
                )
            };
        });

        try {
            await apiUpdateLandmark(id, { text });
        } catch (error) {
            console.error('Error updating landmark:', error);
            fetchLandmarks();
        }
    };

    const handleUpdateDate = async (id: string, date: string | null) => {
        // Optimistic update
        setLandmarks(prev => {
            const prevItems = Array.isArray(prev.forward) ? prev.forward : [];
            return {
                ...prev,
                forward: prevItems.map(item =>
                    item.id === id ? { ...item, date } : item
                )
            };
        });

        try {
            await apiUpdateLandmark(id, { date });
        } catch (error) {
            console.error('Error updating landmark date:', error);
            fetchLandmarks();
        }
    };

    const handleDeleteItem = async (id: string, category: keyof LandmarksByCategory) => {
        if (!confirm('Are you sure you want to delete this landmark?')) return;

        setLandmarks(prev => {
            const prevItems = Array.isArray(prev[category]) ? prev[category] : [];
            return {
                ...prev,
                [category]: prevItems.filter(item => item.id !== id)
            };
        });

        try {
            await deleteLandmark(id);
        } catch (error) {
            console.error('Error deleting landmark:', error);
            fetchLandmarks();
        }
    };

    const renderColumn = (category: keyof LandmarksByCategory, title: string) => {
        const rawItems = landmarks[category];
        const items = Array.isArray(rawItems) ? rawItems : [];
        // For 'forward' category, sort by date (no date = top, then ascending by date)
        // For 'orient' and 'big_things' category, sort by position
        const sortedItems = [...items].sort((a, b) => {
            if (category === 'forward') {
                // No date items go to top, then sort by date ascending
                if (!a.date && !b.date) return 0; // Keep original order for no-date items
                if (!a.date) return -1;
                if (!b.date) return 1;
                // Sort by date ascending
                return a.date.localeCompare(b.date);
            }
            // Orient/Big Things category: sort by position (with fallback to 0 for null positions)
            return (a.position ?? 0) - (b.position ?? 0);
        });

        // For 'forward' category, filter by date status
        // Ghost OFF: show today + future (hide past)
        // Ghost ON: show ONLY past (hide today + future)
        const visibleItems = category === 'forward'
            ? sortedItems.filter(item => {
                const status = getDateStatus(item.date);
                if (showPastEvents) {
                    // Ghost is ON: show only past events
                    return status === 'past';
                } else {
                    // Ghost is OFF: show today + future
                    return status !== 'past';
                }
            })
            : sortedItems;

        return (
            <div className={`${styles.column} ${styles[`column_${category}`]}`}>
                <div className={styles.columnHeader}>
                    <h2 className={styles.columnTitle}>{title}</h2>
                    <div className={styles.headerButtons}>
                        {category === 'forward' && (
                            <button
                                className={`${styles.ghostBtn} ${showPastEvents ? styles.active : ''}`}
                                onClick={() => setShowPastEvents(!showPastEvents)}
                                title={showPastEvents ? "Hide past events" : "Show past events"}
                            >
                                <Ghost size={18} weight="duotone" />
                            </button>
                        )}
                        <button
                            className={styles.addBtn}
                            onClick={() => setShowAddInput(prev => ({ ...prev, [category]: !prev[category] }))}
                        >
                            <Plus size={18} weight="bold" />
                        </button>
                    </div>
                </div>

                <SortableContext
                    items={visibleItems.map(i => `item-${i.id}`)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className={`${styles.itemsList} ${category !== 'forward' ? styles.bulletList : ''}`}>
                        {visibleItems.map(item => (
                            <SortableLandmarkItem key={item.id} item={item}>
                                {category !== 'forward' ? (
                                    // Bullet point style for orient
                                    <div className={styles.bulletItem}>
                                        <span className={styles.bullet}>•</span>
                                        <textarea
                                            ref={(el) => {
                                                if (el) {
                                                    el.style.height = 'auto';
                                                    el.style.height = el.scrollHeight + 'px';
                                                }
                                            }}
                                            className={styles.bulletText}
                                            value={item.text}
                                            onChange={(e) => handleUpdateItem(item.id, category, e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            rows={1}
                                            onInput={(e) => {
                                                const target = e.target as HTMLTextAreaElement;
                                                target.style.height = 'auto';
                                                target.style.height = target.scrollHeight + 'px';
                                            }}
                                        />
                                        <button
                                            className={styles.bulletDeleteBtn}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteItem(item.id, category);
                                            }}
                                            onPointerDown={(e) => e.stopPropagation()}
                                        >
                                            <Trash size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    // Card style for forward
                                    <div className={`${styles.item} ${getDateStatus(item.date) === 'today' ? styles.itemToday : ''}`}>
                                        <textarea
                                            ref={(el) => {
                                                if (el) {
                                                    el.style.height = 'auto';
                                                    el.style.height = el.scrollHeight + 'px';
                                                }
                                            }}
                                            className={styles.itemText}
                                            value={item.text}
                                            onChange={(e) => handleUpdateItem(item.id, category, e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            rows={1}
                                            onInput={(e) => {
                                                const target = e.target as HTMLTextAreaElement;
                                                target.style.height = 'auto';
                                                target.style.height = target.scrollHeight + 'px';
                                            }}
                                        />
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteItem(item.id, category);
                                            }}
                                            onPointerDown={(e) => e.stopPropagation()}
                                        >
                                            <Trash size={14} />
                                        </button>
                                        <input
                                            type="date"
                                            className={styles.dateInput}
                                            value={item.date || ''}
                                            onChange={(e) => handleUpdateDate(item.id, e.target.value || null)}
                                            onClick={(e) => e.stopPropagation()}
                                            onPointerDown={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                )}
                            </SortableLandmarkItem>
                        ))}
                    </div>
                </SortableContext>

                {showAddInput[category] && (
                    <div className={styles.addItemContainer}>
                        <input
                            className={styles.addItemInput}
                            placeholder="Add new item..."
                            value={newItemText[category] || ''}
                            onChange={(e) => setNewItemText(prev => ({ ...prev, [category]: e.target.value }))}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddItem(category);
                                if (e.key === 'Escape') setShowAddInput(prev => ({ ...prev, [category]: false }));
                            }}
                            autoFocus
                        />
                        {category === 'forward' && (
                            <input
                                type="date"
                                className={styles.addDateInput}
                                value={newItemDate}
                                onChange={(e) => setNewItemDate(e.target.value)}
                                placeholder="Optional date"
                            />
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className={styles.landmarksContainer}>
                {renderColumn('orient', 'Orient Around')}
                {renderColumn('big_things', 'Big Things')}
                {renderColumn('forward', 'Looking Forward To')}
            </div>

            <DragOverlay>
                {activeItem ? (
                    <div className={styles.dragOverlay}>
                        <div className={styles.item}>
                            <span className={styles.itemText}>{activeItem.text}</span>
                            {activeItem.date && (
                                <span className={styles.dateBadge}>{activeItem.date}</span>
                            )}
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};
