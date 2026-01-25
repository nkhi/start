import { useRef, useEffect, useState } from 'react';
import { Tray, ArrowRight } from '@phosphor-icons/react';
import { createMemory } from '../../api/memories';
import { useMemoryDraft } from './useMemoryDraft';
import styles from './MemoryPanel.module.css';

interface MemoryPanelProps {
    onClose: () => void;
}

export function MemoryPanel({ onClose }: MemoryPanelProps) {
    const { text, setText, clearDraft } = useMemoryDraft();
    const [isSaving, setIsSaving] = useState(false);
    const [selectedDate, setSelectedDate] = useState(() => {
        // Default to today
        return new Date().toISOString().split('T')[0];
    });
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Auto-focus textarea on mount
    useEffect(() => {
        if (textareaRef.current) {
            setTimeout(() => {
                textareaRef.current?.focus();
                // Move cursor to end if there's existing text
                if (text) {
                    textareaRef.current?.setSelectionRange(text.length, text.length);
                }
            }, 100);
        }
    }, []);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                onClose();
            }
        }
        // Delay adding listener to avoid immediate close from the triggering click
        const timeout = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);
        return () => {
            clearTimeout(timeout);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    // Handle keyboard shortcuts
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }

            // Enter to submit (Shift+Enter for new line)
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
            }
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [text, onClose]);

    const handleSubmit = async () => {
        if (!text.trim() || isSaving) return;

        setIsSaving(true);
        try {
            await createMemory({
                id: `memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                text: text.trim(),
                date: selectedDate,
                createdAt: new Date().toISOString()
            });
            clearDraft();
            onClose();
        } catch (error) {
            console.error('Failed to save memory:', error);
            // Error toast will be shown automatically by error reporter
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div ref={panelRef} className={styles.panel}>
            <div className={styles.header}>
                <span className={styles.title}>
                    <Tray size={16} weight="duotone" />
                    Good Moments
                </span>
            </div>

            <div className={styles.textareaContainer}>
                <textarea
                    ref={textareaRef}
                    className={styles.textarea}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="What made today special?"
                    rows={4}
                />
                <input
                    type="date"
                    className={styles.datePicker}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    title="Select date for this memory"
                />
                <button
                    className={styles.submitBtn}
                    onClick={handleSubmit}
                    disabled={!text.trim() || isSaving}
                    title="Save moment (Enter)"
                >
                    <ArrowRight size={16} weight="bold" />
                </button>
            </div>
        </div>
    );
}
