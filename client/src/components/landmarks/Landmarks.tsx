import React, { type CSSProperties } from 'react';
import { Ghost, Plus } from '@phosphor-icons/react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, pointerWithin } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { LandmarkItem } from '../../types';
import styles from './Landmarks.module.css';
import { getDateStatus, getDaysUntilText } from './utils';
import { useLandmarksData } from './useLandmarksData';
import { ForwardItemCard } from './ForwardItemCard';
import { LandmarkBadge } from './LandmarkBadge';

// --- Shared Internal Components ---

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

    const style: CSSProperties = {
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

// --- Card Components ---

interface CardProps {
    items: LandmarkItem[];
    showAddInput: boolean;
    newItemText: string;
    onToggleAddInput: () => void;
    onSetNewItemText: (text: string) => void;
    onAddItem: () => void;
    onCloseAddInput: () => void;
    onDelete: (id: string) => void;
}

const OrientAroundCard: React.FC<CardProps> = ({
    items,
    showAddInput,
    newItemText,
    onToggleAddInput,
    onSetNewItemText,
    onAddItem,
    onCloseAddInput,
    onDelete
}) => {
    return (
        <div className={`${styles.column} ${styles.column_orient}`}>
            <div className={styles.columnHeader}>
                <h2 className={styles.columnTitle}>Orient Around</h2>
                <div className={styles.headerButtons}>
                    <button className={styles.addBtn} onClick={onToggleAddInput}>
                        <Plus size={18} weight="bold" />
                    </button>
                </div>
            </div>

            <SortableContext
                items={items.map(i => `item-${i.id}`)}
                strategy={verticalListSortingStrategy}
            >
                <div className={`${styles.itemsList} ${styles.bulletList}`}>
                    {items.map(item => (
                        <SortableLandmarkItem key={item.id} item={item}>
                            <LandmarkBadge
                                item={item}
                                onDelete={() => onDelete(item.id)}
                            />
                        </SortableLandmarkItem>
                    ))}
                </div>
            </SortableContext>

            {showAddInput && (
                <div className={styles.addItemContainer}>
                    <input
                        className={styles.addItemInput}
                        placeholder="Add new item..."
                        value={newItemText}
                        onChange={(e) => onSetNewItemText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onAddItem();
                            if (e.key === 'Escape') onCloseAddInput();
                        }}
                        autoFocus
                    />
                </div>
            )}
        </div>
    );
};

const BigThingsCard: React.FC<CardProps> = ({
    items,
    showAddInput,
    newItemText,
    onToggleAddInput,
    onSetNewItemText,
    onAddItem,
    onCloseAddInput,
    onDelete
}) => {
    return (
        <div className={`${styles.column} ${styles.column_big_things}`}>
            <div className={styles.columnHeader}>
                <h2 className={styles.columnTitle}>Big Things</h2>
                <div className={styles.headerButtons}>
                    <button className={styles.addBtn} onClick={onToggleAddInput}>
                        <Plus size={18} weight="bold" />
                    </button>
                </div>
            </div>

            <SortableContext
                items={items.map(i => `item-${i.id}`)}
                strategy={verticalListSortingStrategy}
            >
                <div className={`${styles.itemsList} ${styles.bulletList}`}>
                    {items.map(item => (
                        <SortableLandmarkItem key={item.id} item={item}>
                            <LandmarkBadge
                                item={item}
                                onDelete={() => onDelete(item.id)}
                            />
                        </SortableLandmarkItem>
                    ))}
                </div>
            </SortableContext>

            {showAddInput && (
                <div className={styles.addItemContainer}>
                    <input
                        className={styles.addItemInput}
                        placeholder="Add new item..."
                        value={newItemText}
                        onChange={(e) => onSetNewItemText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onAddItem();
                            if (e.key === 'Escape') onCloseAddInput();
                        }}
                        autoFocus
                    />
                </div>
            )}
        </div>
    );
};

interface LookingForwardToCardProps extends CardProps {
    newItemDate: string;
    showPastEvents: boolean;
    onSetNewItemDate: (date: string) => void;
    onTogglePastEvents: () => void;
    onUpdateItem: (id: string, updates: { text?: string; date?: string | null }) => void;
}

const LookingForwardToCard: React.FC<LookingForwardToCardProps> = ({
    items,
    showAddInput,
    newItemText,
    newItemDate,
    showPastEvents,
    onToggleAddInput,
    onSetNewItemText,
    onSetNewItemDate,
    onTogglePastEvents,
    onAddItem,
    onCloseAddInput,
    onDelete,
    onUpdateItem
}) => {
    return (
        <div className={`${styles.column} ${styles.column_forward}`}>
            <div className={styles.columnHeader}>
                <h2 className={styles.columnTitle}>Looking Forward To</h2>
                <div className={styles.headerButtons}>
                    <button
                        className={`${styles.ghostBtn} ${showPastEvents ? styles.active : ''}`}
                        onClick={onTogglePastEvents}
                        title={showPastEvents ? "Hide past events" : "Show past events"}
                    >
                        <Ghost size={18} weight="duotone" />
                    </button>
                    <button className={styles.addBtn} onClick={onToggleAddInput}>
                        <Plus size={18} weight="bold" />
                    </button>
                </div>
            </div>

            <div className={styles.itemsList}>
                {items.map(item => (
                    <ForwardItemCard
                        key={item.id}
                        item={item}
                        daysUntilText={getDaysUntilText(item.date)}
                        isToday={getDateStatus(item.date) === 'today'}
                        onTextChange={(text) => onUpdateItem(item.id, { text })}
                        onDateChange={(date) => onUpdateItem(item.id, { date })}
                        onDelete={() => onDelete(item.id)}
                    />
                ))}
            </div>

            {showAddInput && (
                <div className={styles.addItemContainer}>
                    <input
                        className={styles.addItemInput}
                        placeholder="Add new item..."
                        value={newItemText}
                        onChange={(e) => onSetNewItemText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onAddItem();
                            if (e.key === 'Escape') onCloseAddInput();
                        }}
                        autoFocus
                    />
                    <input
                        type="date"
                        className={styles.addDateInput}
                        value={newItemDate}
                        onChange={(e) => onSetNewItemDate(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onAddItem();
                            if (e.key === 'Escape') onCloseAddInput();
                        }}
                        placeholder="Optional date"
                    />
                </div>
            )}
        </div>
    );
};

// --- Main Component ---

export const Landmarks: React.FC = () => {
    const {
        activeItem,
        showAddInput,
        showPastEvents,
        newItemText,
        newItemDate,
        handleDragStart,
        handleDragEnd,
        handleAddItem,
        updateLandmark,
        deleteLandmark,
        setNewItemText,
        setNewItemDate,
        toggleAddInput,
        setShowAddInput,
        togglePastEvents,
        getSortedItems,
        getFilteredItems,
    } = useLandmarksData();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Prepare data for each card
    const orientItems = getSortedItems('orient');
    const bigThingsItems = getSortedItems('big_things');
    const forwardItems = getFilteredItems('forward', getSortedItems('forward'));

    const handleNewItemText = (category: string) => (text: string) =>
        setNewItemText(prev => ({ ...prev, [category]: text }));

    const handleCloseAdd = (category: string) => () =>
        setShowAddInput(prev => ({ ...prev, [category]: false }));

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className={styles.landmarksContainer}>
                <OrientAroundCard
                    items={orientItems}
                    showAddInput={!!showAddInput['orient']}
                    newItemText={newItemText['orient'] || ''}
                    onToggleAddInput={() => toggleAddInput('orient')}
                    onSetNewItemText={handleNewItemText('orient')}
                    onAddItem={() => handleAddItem('orient')}
                    onCloseAddInput={handleCloseAdd('orient')}
                    onDelete={deleteLandmark}
                />

                <BigThingsCard
                    items={bigThingsItems}
                    showAddInput={!!showAddInput['big_things']}
                    newItemText={newItemText['big_things'] || ''}
                    onToggleAddInput={() => toggleAddInput('big_things')}
                    onSetNewItemText={handleNewItemText('big_things')}
                    onAddItem={() => handleAddItem('big_things')}
                    onCloseAddInput={handleCloseAdd('big_things')}
                    onDelete={deleteLandmark}
                />

                <LookingForwardToCard
                    items={forwardItems}
                    showAddInput={!!showAddInput['forward']}
                    newItemText={newItemText['forward'] || ''}
                    newItemDate={newItemDate}
                    showPastEvents={showPastEvents}
                    onToggleAddInput={() => toggleAddInput('forward')}
                    onSetNewItemText={handleNewItemText('forward')}
                    onSetNewItemDate={setNewItemDate}
                    onTogglePastEvents={togglePastEvents}
                    onAddItem={() => handleAddItem('forward')}
                    onCloseAddInput={handleCloseAdd('forward')}
                    onDelete={deleteLandmark}
                    onUpdateItem={(id, updates) => updateLandmark({ id, updates })}
                />
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
