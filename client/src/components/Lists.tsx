import React, { useEffect, useState } from 'react';
import { Plus, Trash, Check } from '@phosphor-icons/react';
import { CARD_COLORS } from '../constants/colors';
import './Lists.css';

const API_BASE_URL = 'http://localhost:3000';

interface ListItem {
    id: string;
    text: string;
    completed: boolean;
    createdAt: string;
}

interface List {
    id: string;
    title: string;
    createdAt: string;
    items: ListItem[];
    color?: string;
}

export const Lists: React.FC = () => {
    const [lists, setLists] = useState<List[]>([]);
    const [newItemText, setNewItemText] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchLists();
    }, []);

    const fetchLists = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/lists`);
            const data = await res.json();
            setLists(data);
        } catch (error) {
            console.error('Error fetching lists:', error);
        }
    };

    const updateList = async (id: string, updates: Partial<List>) => {
        // Optimistic update
        setLists(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));

        try {
            await fetch(`${API_BASE_URL}/lists/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
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

        const newList = {
            id: crypto.randomUUID(),
            title: 'New List',
            color: randomColor,
        };

        try {
            const res = await fetch(`${API_BASE_URL}/lists`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newList),
            });
            const savedList = await res.json();
            setLists(prev => [...prev, savedList]);
        } catch (error) {
            console.error('Error creating list:', error);
        }
    };

    const handleDeleteList = async (id: string) => {
        if (!confirm('Are you sure you want to delete this list?')) return;

        setLists(prev => prev.filter(l => l.id !== id));
        try {
            await fetch(`${API_BASE_URL}/lists/${id}`, {
                method: 'DELETE',
            });
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
        // We don't want to sync to server on every keystroke, so we just update local state here
        // and maybe sync on blur? Or just sync on every keystroke for simplicity if performance allows.
        // For now, let's sync on blur or just rely on the fact that updateList does optimistic update + fetch.
        // Actually, updateList triggers a fetch. Doing this on every keystroke is bad.
        // Let's just update local state here and have a separate onBlur handler for syncing.

        // Wait, updateList does optimistic update AND fetch.
        // So we should NOT call updateList on change.

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
        <div className="lists-container">
            {lists.map(list => (
                <div
                    key={list.id}
                    className="list-column"
                    style={{ backgroundColor: list.color || '#2D2D2D' }}
                >
                    <div className="list-header">
                        <input
                            className="list-title"
                            value={list.title}
                            onChange={(e) => updateList(list.id, { title: e.target.value })}
                        />
                        <button
                            className="item-delete-btn"
                            onClick={() => handleDeleteList(list.id)}
                            title="Delete List"
                        >
                            <Trash size={16} />
                        </button>
                    </div>

                    <div className="list-items">
                        {list.items.map(item => (
                            <div key={item.id} className="list-item">
                                <div
                                    className={`item-checkbox ${item.completed ? 'checked' : ''}`}
                                    onClick={() => handleToggleItem(list.id, item.id)}
                                >
                                    {item.completed && <Check size={12} weight="bold" color="#151515" />}
                                </div>
                                <input
                                    className={`item-text ${item.completed ? 'completed' : ''}`}
                                    value={item.text}
                                    onChange={(e) => handleUpdateItemText(list.id, item.id, e.target.value)}
                                    onBlur={() => handleItemBlur(list.id)}
                                />
                                <button
                                    className="item-delete-btn"
                                    onClick={() => handleDeleteItem(list.id, item.id)}
                                >
                                    <Trash size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="add-item-container">
                        <input
                            className="add-item-input"
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

            <button className="add-list-btn" onClick={handleAddList}>
                <Plus size={20} />
                Add New List
            </button>
        </div>
    );
};
