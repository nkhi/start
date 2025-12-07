import React, { useEffect, useState, useRef } from 'react';
import { Trash, RocketLaunch } from '@phosphor-icons/react';
import { CARD_COLORS } from '../../constants/colors';
import { HabitAPI } from '../../api';
import type { Note } from '../../types';
import './Next.css';

interface NextProps {
    apiBaseUrl: string;
}

export const Next: React.FC<NextProps> = ({ apiBaseUrl }) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const api = useRef(new HabitAPI(apiBaseUrl)).current;

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        try {
            const data = await api.getNotes();
            setNotes(data);
        } catch (error) {
            console.error('Error fetching notes:', error);
        }
    };

    const updateNote = async (id: string, updates: Partial<Note>) => {
        // Optimistic update
        setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));

        try {
            await api.updateNote(id, updates);
        } catch (error) {
            console.error('Error updating note:', error);
            // Revert on failure (could be improved)
            fetchNotes();
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        updateNote(id, { deletedAt: new Date().toISOString() });
        setNotes(prev => prev.filter(n => n.id !== id));
    };

    const handleStart = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        updateNote(id, { startedAt: new Date().toISOString() });
        setNotes(prev => prev.filter(n => n.id !== id));
    };

    const handleCreate = async () => {
        const sizes: Note['size'][] = ['small', 'medium', 'large', 'wide', 'tall'];
        const randomSize = sizes[Math.floor(Math.random() * sizes.length)];

        const randomColor = CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)];

        const newNote: Partial<Note> = {
            id: crypto.randomUUID(),
            title: 'New Idea',
            content: 'Click to edit...',
            color: randomColor,
            size: randomSize,
        };

        try {
            const savedNote = await api.createNote(newNote);
            setNotes(prev => [...prev, savedNote]);
        } catch (error) {
            console.error('Error creating note:', error);
        }
    };

    return (
        <div className="next-container">
            <div className="next-grid">
                {notes.map((note) => (
                    <div
                        key={note.id}
                        className={`note-card ${note.size}`}
                        style={{ backgroundColor: note.color }}
                    >
                        <input
                            className="note-title-input"
                            value={note.title}
                            placeholder="Title"
                            onChange={(e) => setNotes(prev => prev.map(n => n.id === note.id ? { ...n, title: e.target.value } : n))}
                            onBlur={(e) => updateNote(note.id, { title: e.target.value })}
                        />
                        <textarea
                            className="note-content-input"
                            value={note.content}
                            placeholder="Take a note..."
                            onChange={(e) => setNotes(prev => prev.map(n => n.id === note.id ? { ...n, content: e.target.value } : n))}
                            onBlur={(e) => updateNote(note.id, { content: e.target.value })}
                        />

                        <div className="note-actions">
                            <button
                                className="action-btn start-btn"
                                onClick={(e) => handleStart(e, note.id)}
                                title="Start this project"
                            >
                                <RocketLaunch size={18} weight="duotone" />
                            </button>
                            <button
                                className="action-btn delete-btn"
                                onClick={(e) => handleDelete(e, note.id)}
                                title="Move to trash"
                            >
                                <Trash size={18} weight="duotone" />
                            </button>
                        </div>
                    </div>
                ))}
                {/* Add a "New Note" placeholder */}
                <div className="note-card new-note" onClick={handleCreate}>
                    <div className="plus-icon">+</div>
                </div>
            </div>
        </div>
    );
};
