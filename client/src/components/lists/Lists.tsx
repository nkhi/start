import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash, Check } from '@phosphor-icons/react';
import { CARD_COLORS } from '../../constants/colors';
import { getLists, createList, updateList as apiUpdateList, deleteList, reorderLists, reorderListItems } from '../../api/lists';
import type { List, ListItem } from '../../types';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable, pointerWithin, type DragStartEvent, type DragEndEvent, type DragOverEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './Lists.module.css';

interface ListsProps {
    apiBaseUrl: string;
}

/**
 * Convert a hex color to rgba with specified opacity
 */
function hexToRgba(hex: string, opacity: number): string {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// Draggable list column (non-sortable, just draggable)
function DraggableListColumn({ list, children }: { list: List; children: React.ReactNode }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: `list-${list.id}`,
        data: { type: 'list', list }
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
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

// Drop zone between lists - shows a line when dragging over
function ListDropZone({ position, isActive }: { position: number; isActive: boolean }) {
    const { setNodeRef, isOver } = useDroppable({
        id: `drop-zone-${position}`,
        data: { type: 'listDropZone', position }
    });

    const showActive = isOver || isActive;

    return (
        <div
            ref={setNodeRef}
            className={styles.listDropZoneWrapper}
        >
            <div className={`${styles.listDropZone} ${showActive ? styles.listDropZoneActive : ''}`} />
        </div>
    );
}

// Sortable wrapper for list items
function SortableListItem({ item, listId, children }: { item: ListItem; listId: string; children: React.ReactNode }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: `item-${item.id}`,
        data: { type: 'listItem', item, listId }
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        zIndex: isDragging ? 1000 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`${styles.draggableListItem} ${isDragging ? styles.draggingItem : ''}`}
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

    // Track what's being dragged
    const [activeList, setActiveList] = useState<List | null>(null);
    const [activeItem, setActiveItem] = useState<{ item: ListItem; listId: string } | null>(null);

    // Track which drop zone is being hovered
    const [activeDropZone, setActiveDropZone] = useState<number | null>(null);

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
            setLists(data.sort((a, b) => parseInt(a.order || '0', 10) - parseInt(b.order || '0', 10)));
        } catch (error) {
            console.error('Error fetching lists:', error);
        }
    };

    const updateList = useCallback(async (id: string, updates: Partial<List>) => {
        setLists(prev => {
            const updated = prev.map(l => l.id === id ? { ...l, ...updates } : l);
            return updated.sort((a, b) => parseInt(a.order || '0', 10) - parseInt(b.order || '0', 10));
        });

        try {
            await apiUpdateList(apiBaseUrl, id, updates);
        } catch (error) {
            console.error('Error updating list:', error);
            fetchLists();
        }
    }, [apiBaseUrl]);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const { active } = event;
        const data = active.data.current;
        if (!data) return;

        if (data.type === 'list') {
            setActiveList(data.list);
            setActiveItem(null);
        } else if (data.type === 'listItem') {
            setActiveItem({ item: data.item, listId: data.listId });
            setActiveList(null);
        }
    }, []);

    const handleDragOver = useCallback((event: DragOverEvent) => {
        const { over } = event;

        if (over?.data.current?.type === 'listDropZone') {
            setActiveDropZone(over.data.current.position);
        } else {
            setActiveDropZone(null);
        }
    }, []);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;

        // Reset states
        const draggedList = activeList;
        setActiveList(null);
        setActiveItem(null);
        setActiveDropZone(null);

        if (!over) return;

        const activeType = active.data.current?.type;

        if (activeType === 'list' && over.data.current?.type === 'listDropZone') {
            // Handle list drop on a drop zone
            if (!draggedList) return;

            const dropPosition = over.data.current.position;

            // Current sorted lists
            const currentSorted = [...lists].sort((a, b) =>
                parseInt(a.order || '0', 10) - parseInt(b.order || '0', 10)
            );

            // Find current index of dragged list
            const currentIndex = currentSorted.findIndex(l => l.id === draggedList.id);
            if (currentIndex === -1) return;

            // Calculate target index
            // dropPosition 0 = before first list, dropPosition 1 = after first list, etc.
            let targetIndex = dropPosition;

            // If dropping after current position, adjust for removal
            if (currentIndex < dropPosition) {
                targetIndex = dropPosition - 1;
            }

            // If same position, no change needed
            if (currentIndex === targetIndex) return;

            // Reorder
            const newLists = [...currentSorted];
            const [movedList] = newLists.splice(currentIndex, 1);
            newLists.splice(targetIndex, 0, movedList);

            const newListOrder = newLists.map(l => l.id);

            // Optimistic update
            setLists(newLists.map((l, i) => ({ ...l, order: String(i) })));

            try {
                await reorderLists(apiBaseUrl, newListOrder);
            } catch (error) {
                console.error('Failed to reorder lists:', error);
                fetchLists();
            }

        } else if (activeType === 'listItem') {
            // Handle item reordering
            if (active.id === over.id) return;

            const activeItemId = String(active.id).replace('item-', '');
            const overItemId = String(over.id).replace('item-', '');
            const listId = active.data.current?.listId;

            if (!listId) return;

            const list = lists.find(l => l.id === listId);
            if (!list) return;

            const sortedItems = [...list.items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
            const oldIndex = sortedItems.findIndex(i => i.id === activeItemId);
            const newIndex = sortedItems.findIndex(i => i.id === overItemId);

            if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

            const newItems = [...sortedItems];
            const [movedItem] = newItems.splice(oldIndex, 1);
            newItems.splice(newIndex, 0, movedItem);

            const newItemOrder = newItems.map(item => item.id);

            setLists(prev => prev.map(l => {
                if (l.id !== listId) return l;

                const reorderedItems: ListItem[] = [];
                for (let i = 0; i < newItemOrder.length; i++) {
                    const item = l.items.find(it => it.id === newItemOrder[i]);
                    if (item) {
                        reorderedItems.push({ ...item, position: i });
                    }
                }

                return { ...l, items: reorderedItems };
            }));

            try {
                await reorderListItems(apiBaseUrl, listId, newItemOrder);
            } catch (error) {
                console.error('Error reordering list items:', error);
                fetchLists();
            }
        }
    }, [lists, apiBaseUrl, activeList]);

    const handleDragCancel = useCallback(() => {
        setActiveList(null);
        setActiveItem(null);
        setActiveDropZone(null);
    }, []);

    const handleAddList = async () => {
        const currentSorted = [...lists].sort((a, b) => parseInt(a.order || '0', 10) - parseInt(b.order || '0', 10));
        const lastColor = currentSorted.length > 0 ? currentSorted[currentSorted.length - 1].color : null;
        const lastOrder = currentSorted.length > 0 ? parseInt(currentSorted[currentSorted.length - 1].order || '0', 10) : -1;
        const newOrder = String(lastOrder + 1);

        const availableColors = lastColor
            ? CARD_COLORS.filter(c => c !== lastColor)
            : CARD_COLORS;

        const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)];

        const newList: Partial<List> = {
            id: crypto.randomUUID(),
            title: 'New List',
            color: randomColor,
            order: newOrder,
        };

        try {
            const savedList = await createList(apiBaseUrl, newList);
            setLists(prev => {
                const updated = [...prev, savedList];
                return updated.sort((a, b) => parseInt(a.order || '0', 10) - parseInt(b.order || '0', 10));
            });
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
        setLists(prev => prev.map(l => {
            if (l.id !== listId) return l;
            return {
                ...l,
                items: l.items.map(item =>
                    item.id === itemId ? { ...item, text: newText } : item
                )
            };
        }));
    };

    const handleItemBlur = (listId: string) => {
        const list = lists.find(l => l.id === listId);
        if (list) {
            updateList(listId, { items: list.items });
        }
    };

    const handleAddItem = (listId: string) => {
        const text = newItemText[listId]?.trim();
        if (!text) return;

        const list = lists.find(l => l.id === listId);
        if (!list) return;

        const newItem: ListItem = {
            id: crypto.randomUUID(),
            text,
            completed: false,
            createdAt: new Date().toISOString(),
            position: list.items.length,
        };

        const updatedItems = [...list.items, newItem];
        updateList(listId, { items: updatedItems });
        setNewItemText(prev => ({ ...prev, [listId]: '' }));
    };

    const sortedLists = [...lists].sort((a, b) =>
        parseInt(a.order || '0', 10) - parseInt(b.order || '0', 10)
    );

    // Only show drop zones when dragging a list
    const isDraggingList = activeList !== null;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <div className={styles.listsContainer}>
                {/* Drop zone before first list */}
                {isDraggingList && (
                    <ListDropZone position={0} isActive={activeDropZone === 0} />
                )}

                {sortedLists.map((list, index) => {
                    const sortedItems = [...list.items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

                    return (
                        <React.Fragment key={list.id}>
                            <DraggableListColumn list={list}>
                                <div
                                    className={styles.listColumn}
                                    style={{ backgroundColor: hexToRgba(list.color || '#2D2D2D', 0.33) }}
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

                                    <SortableContext
                                        items={sortedItems.map(i => `item-${i.id}`)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className={styles.listItems} onPointerDown={(e) => e.stopPropagation()}>
                                            {sortedItems.map(item => (
                                                <SortableListItem key={item.id} item={item} listId={list.id}>
                                                    <div className={styles.listItem}>
                                                        <div
                                                            className={`${styles.itemCheckbox} ${item.completed ? styles.checked : ''}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleToggleItem(list.id, item.id);
                                                            }}
                                                            onPointerDown={(e) => e.stopPropagation()}
                                                        >
                                                            {item.completed && <Check size={12} weight="bold" color="#151515" />}
                                                        </div>
                                                        <textarea
                                                            ref={(el) => {
                                                                if (el) {
                                                                    el.style.height = 'auto';
                                                                    el.style.height = el.scrollHeight + 'px';
                                                                }
                                                            }}
                                                            className={`${styles.itemText} ${item.completed ? styles.completed : ''}`}
                                                            value={item.text}
                                                            onChange={(e) => handleUpdateItemText(list.id, item.id, e.target.value)}
                                                            onBlur={() => handleItemBlur(list.id)}
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
                                                            className={styles.itemDeleteBtn}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteItem(list.id, item.id);
                                                            }}
                                                            onPointerDown={(e) => e.stopPropagation()}
                                                        >
                                                            <Trash size={14} />
                                                        </button>
                                                    </div>
                                                </SortableListItem>
                                            ))}
                                        </div>
                                    </SortableContext>

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
                            </DraggableListColumn>

                            {/* Drop zone after each list */}
                            {isDraggingList && (
                                <ListDropZone position={index + 1} isActive={activeDropZone === index + 1} />
                            )}
                        </React.Fragment>
                    );
                })}

                <button className={styles.addListBtn} onClick={handleAddList}>
                    <Plus size={16} />
                    New
                </button>
            </div>

            <DragOverlay>
                {activeList ? (
                    <div
                        className={styles.listDragOverlay}
                        style={{ backgroundColor: hexToRgba(activeList.color || '#2D2D2D', 0.33) }}
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
                ) : activeItem ? (
                    <div className={styles.listItemDragOverlay}>
                        <div className={styles.listItem}>
                            <div className={`${styles.itemCheckbox} ${activeItem.item.completed ? styles.checked : ''}`}>
                                {activeItem.item.completed && <Check size={12} weight="bold" color="#151515" />}
                            </div>
                            <span className={`${styles.itemText} ${activeItem.item.completed ? styles.completed : ''}`}>
                                {activeItem.item.text}
                            </span>
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};
