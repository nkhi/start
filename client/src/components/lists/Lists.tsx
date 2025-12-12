import React, { useEffect, useState } from 'react';
import { Plus, Trash, Check } from '@phosphor-icons/react';
import { CARD_COLORS } from '../../constants/colors';
import { getLists, createList, updateList as apiUpdateList, deleteList } from '../../api/lists';
import type { List, ListItem } from '../../types';
import styles from './Lists.module.css';

interface ListsProps {
    apiBaseUrl: string;
}

export const Lists: React.FC<ListsProps> = ({ apiBaseUrl }) => {
    const [lists, setLists] = useState<List[]>([]);
    const [newItemText, setNewItemText] = useState<Record<string, string>>({});


    useEffect(() => {
        fetchLists();
    }, []);

    const fetchLists = async () => {
        try {
            const data = await getLists(apiBaseUrl);
            setLists(data);
        } catch (error) {
            console.error('Error fetching lists:', error);
        }
    };

    const updateList = async (id: string, updates: Partial<List>) => {
        // Optimistic update
        setLists(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));

        try {
            await apiUpdateList(apiBaseUrl, id, updates);
        } catch (error) {
            console.error('Error updating list:', error);
            fetchLists();
        }
    };

    const handleAddList = async () => {
        // Get the last list's color to avoid repetition
        const lastColor = lists.length > 0 ? lists[lists.length - 1].color : null;

        // Filter out the last color if possible
        const availableColors = lastColor
            ? CARD_COLORS.filter(c => c !== lastColor)
            : CARD_COLORS;

        const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)];

        const newList: Partial<List> = {
            id: crypto.randomUUID(),
            title: 'New List',
            color: randomColor,
        };

        try {
            const savedList = await createList(apiBaseUrl, newList);
            setLists(prev => [...prev, savedList]);
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

    return (
        <div className={styles.listsContainer}>
            {lists.map(list => (
                <div
                    key={list.id}
                    className={styles.listColumn}
                    style={{ backgroundColor: list.color || '#2D2D2D' }}
                >
                    <div className={styles.listHeader}>
                        <input
                            className={styles.listTitle}
                            value={list.title}
                            onChange={(e) => updateList(list.id, { title: e.target.value })}
                        />
                        <button
                            className={styles.itemDeleteBtn}
                            onClick={() => handleDeleteList(list.id)}
                            title="Delete List"
                        >
                            <Trash size={16} />
                        </button>
                    </div>

                    <div className={styles.listItems}>
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

                    <div className={styles.addItemContainer}>
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
            ))}

            <button className={styles.addListBtn} onClick={handleAddList}>
                <Plus size={20} />
                Add New List
            </button>
        </div>
    );
};
