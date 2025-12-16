import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash, Check } from '@phosphor-icons/react';
import { CARD_COLORS } from '../../constants/colors';
import { getLists, createList, updateList as apiUpdateList, deleteList, reorderList } from '../../api/lists';
import { getOrderAfter, sortByOrder, getOrderBetween } from '../../utils/orderUtils';
import type { List, ListItem } from '../../types';
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './Lists.module.css';

interface ListsProps {
    apiBaseUrl: string;
}

// Sortable wrapper for list columns
interface SortableListColumnProps {
    list: List;
    children: React.ReactNode;
}

function SortableListColumn({ list, children }: SortableListColumnProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: list.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`${styles.sortableListWrapper} ${isDragging ? styles.dragging : ''}`}
            {...attributes}
            {...listeners}
        >
            {children}
        </div>
    );
}

export const Lists: React.FC<ListsProps> = ({ apiBaseUrl }) => {
    const [lists, setLists] = useState<List[]>([]);
    const [newItemText, setNewItemText] = useState<Record<string, string>>({});
    const [activeList, setActiveList] = useState<List | null>(null);

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    useEffect(() => {
        fetchLists();
    }, []);

    const fetchLists = async () => {
        try {
            const data = await getLists(apiBaseUrl);
            setLists(sortByOrder(data));
        } catch (error) {
            console.error('Error fetching lists:', error);
        }
    };

    const updateList = async (id: string, updates: Partial<List>) => {
        // Optimistic update
        setLists(prev => sortByOrder(prev.map(l => l.id === id ? { ...l, ...updates } : l)));

        try {
            await apiUpdateList(apiBaseUrl, id, updates);
        } catch (error) {
            console.error('Error updating list:', error);
            fetchLists();
        }
    };

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const { active } = event;
        const listId = String(active.id);
        const list = lists.find(l => l.id === listId);
        if (list) {
            setActiveList(list);
        }
    }, [lists]);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;

        setActiveList(null);

        if (!over || active.id === over.id) return;

        const activeId = String(active.id);
        const overId = String(over.id);

        const sortedLists = sortByOrder(lists);
        const oldIndex = sortedLists.findIndex(l => l.id === activeId);
        const newIndex = sortedLists.findIndex(l => l.id === overId);

        if (oldIndex === -1 || newIndex === -1) return;

        // Calculate new order
        // First, filter to only lists that have valid orders for proper index calculation
        const listsWithoutActive = sortedLists.filter(l => l.id !== activeId);

        // Determine the target position based on the over element
        const targetIndex = listsWithoutActive.findIndex(l => l.id === overId);

        // Get the orders of neighboring items at the target position
        let beforeOrder: string | null = null;
        let afterOrder: string | null = null;

        if (targetIndex > 0) {
            beforeOrder = listsWithoutActive[targetIndex - 1]?.order ?? null;
        }
        if (targetIndex < listsWithoutActive.length) {
            afterOrder = listsWithoutActive[targetIndex]?.order ?? null;
        }

        // If we're moving to a position where items don't have orders yet, generate fresh
        let newOrder: string;
        if (beforeOrder === null && afterOrder === null) {
            // No orders exist yet, start fresh
            newOrder = getOrderAfter(null);
        } else if (beforeOrder === null) {
            // Moving to first position
            newOrder = getOrderBetween(null, afterOrder);
        } else if (afterOrder === null) {
            // Moving to last position or after items without order
            newOrder = getOrderAfter(beforeOrder);
        } else {
            // Moving between two items with orders
            newOrder = getOrderBetween(beforeOrder, afterOrder);
        }

        // Optimistic update
        setLists(prev => {
            const updated = prev.map(l =>
                l.id === activeId ? { ...l, order: newOrder } : l
            );
            return sortByOrder(updated);
        });

        // API call
        try {
            await reorderList(apiBaseUrl, activeId, newOrder);
        } catch (error) {
            console.error('Failed to reorder list:', error);
            fetchLists();
        }
    }, [lists, apiBaseUrl]);

    const handleDragCancel = useCallback(() => {
        setActiveList(null);
    }, []);

    const handleAddList = async () => {
        // Get the last list's color to avoid repetition
        const sortedLists = sortByOrder(lists);
        const lastColor = sortedLists.length > 0 ? sortedLists[sortedLists.length - 1].color : null;
        const lastOrder = sortedLists.length > 0 ? (sortedLists[sortedLists.length - 1].order ?? null) : null;

        // Filter out the last color if possible
        const availableColors = lastColor
            ? CARD_COLORS.filter(c => c !== lastColor)
            : CARD_COLORS;

        const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)];
        const newOrder = getOrderAfter(lastOrder);

        const newList: Partial<List> = {
            id: crypto.randomUUID(),
            title: 'New List',
            color: randomColor,
            order: newOrder,
        };

        try {
            const savedList = await createList(apiBaseUrl, newList);
            setLists(prev => sortByOrder([...prev, savedList]));
        } catch (error) {
            console.error('Error creating list:', error);
        }
    };

    const handleDeleteList = async (id: string) => {
        if (!confirm('Are you sure you want to delete this list?')) return;

        setLists(prev => prev.filter(l => l.id !== id));
        try {
            await deleteList(apiBaseUrl, id);
        } catch (error) {
            console.error('Error deleting list:', error);
            fetchLists();
        }
    };

    const handleAddItem = async (listId: string) => {
        const text = newItemText[listId]?.trim();
        if (!text) return;

        const list = lists.find(l => l.id === listId);
        if (!list) return;

        const newItem: ListItem = {
            id: crypto.randomUUID(),
            text,
            completed: false,
            createdAt: new Date().toISOString(),
        };

        const updatedItems = [...list.items, newItem];
        updateList(listId, { items: updatedItems });
        setNewItemText(prev => ({ ...prev, [listId]: '' }));
    };

    const handleToggleItem = (listId: string, itemId: string) => {
        const list = lists.find(l => l.id === listId);
        if (!list) return;

        const updatedItems = list.items.map(item =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        updateList(listId, { items: updatedItems });
    };

    const handleDeleteItem = (listId: string, itemId: string) => {
        const list = lists.find(l => l.id === listId);
        if (!list) return;

        const updatedItems = list.items.filter(item => item.id !== itemId);
        updateList(listId, { items: updatedItems });
    };

    const handleUpdateItemText = (listId: string, itemId: string, newText: string) => {
        const list = lists.find(l => l.id === listId);
        if (!list) return;

        const updatedItems = list.items.map(item =>
            item.id === itemId ? { ...item, text: newText } : item
        );

        setLists(prev => prev.map(l => l.id === listId ? { ...l, items: updatedItems } : l));
    };

    const handleItemBlur = (listId: string) => {
        const list = lists.find(l => l.id === listId);
        if (list) {
            // Sync the current state of items to the server
            updateList(listId, { items: list.items });
        }
    }

    const sortedLists = sortByOrder(lists);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <div className={styles.listsContainer}>
                <SortableContext items={sortedLists.map(l => l.id)} strategy={horizontalListSortingStrategy}>
                    {sortedLists.map(list => (
                        <SortableListColumn key={list.id} list={list}>
                            <div
                                className={styles.listColumn}
                                style={{ backgroundColor: list.color || '#2D2D2D' }}
                            >
                                <div className={styles.listHeader}>
                                    <input
                                        className={styles.listTitle}
                                        value={list.title}
                                        onChange={(e) => updateList(list.id, { title: e.target.value })}
                                        onClick={(e) => e.stopPropagation()}
                                        onPointerDown={(e) => e.stopPropagation()}
                                    />
                                    <button
                                        className={styles.itemDeleteBtn}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteList(list.id);
                                        }}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        title="Delete List"
                                    >
                                        <Trash size={16} />
                                    </button>
                                </div>

                                <div className={styles.listItems} onPointerDown={(e) => e.stopPropagation()}>
                                    {list.items.map(item => (
                                        <div key={item.id} className={styles.listItem}>
                                            <div
                                                className={`${styles.itemCheckbox} ${item.completed ? styles.checked : ''}`}
                                                onClick={() => handleToggleItem(list.id, item.id)}
                                            >
                                                {item.completed && <Check size={12} weight="bold" color="#151515" />}
                                            </div>
                                            <input
                                                className={`${styles.itemText} ${item.completed ? styles.completed : ''}`}
                                                value={item.text}
                                                onChange={(e) => handleUpdateItemText(list.id, item.id, e.target.value)}
                                                onBlur={() => handleItemBlur(list.id)}
                                            />
                                            <button
                                                className={styles.itemDeleteBtn}
                                                onClick={() => handleDeleteItem(list.id, item.id)}
                                            >
                                                <Trash size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className={styles.addItemContainer} onPointerDown={(e) => e.stopPropagation()}>
                                    <input
                                        className={styles.addItemInput}
                                        placeholder="+ Add a task"
                                        value={newItemText[list.id] || ''}
                                        onChange={(e) => setNewItemText(prev => ({ ...prev, [list.id]: e.target.value }))}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleAddItem(list.id);
                                        }}
                                    />
                                </div>
                            </div>
                        </SortableListColumn>
                    ))}
                </SortableContext>

                <button className={styles.addListBtn} onClick={handleAddList}>
                    <Plus size={20} />
                    Add New List
                </button>
            </div>
            <DragOverlay>
                {activeList ? (
                    <div
                        className={styles.listDragOverlay}
                        style={{ backgroundColor: activeList.color || '#2D2D2D' }}
                    >
                        <div className={styles.listHeader}>
                            <span className={styles.listTitle}>{activeList.title}</span>
                        </div>
                        <div className={styles.listItems}>
                            {activeList.items.slice(0, 3).map(item => (
                                <div key={item.id} className={styles.listItem}>
                                    <div className={`${styles.itemCheckbox} ${item.completed ? styles.checked : ''}`}>
                                        {item.completed && <Check size={12} weight="bold" color="#151515" />}
                                    </div>
                                    <span className={`${styles.itemText} ${item.completed ? styles.completed : ''}`}>
                                        {item.text}
                                    </span>
                                </div>
                            ))}
                            {activeList.items.length > 3 && (
                                <div className={styles.moreItems}>
                                    +{activeList.items.length - 3} more
                                </div>
                            )}
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};
