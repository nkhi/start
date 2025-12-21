import { useRef, useEffect, useState } from 'react';
import { X } from '@phosphor-icons/react';
import styles from './CommentPanel.module.css';

interface CommentPanelProps {
    isOpen: boolean;
    habitName: string;
    dateStr: string;
    initialComment: string | null;
    onSave: (comment: string) => void;
    onClose: () => void;
}

export function CommentPanel({
    isOpen,
    habitName,
    dateStr,
    initialComment,
    onSave,
    onClose
}: CommentPanelProps) {
    const [comment, setComment] = useState(initialComment || '');
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setComment(initialComment || '');
    }, [initialComment, isOpen]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            }, 100);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }

            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSave(comment);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, comment, onSave, onClose]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr + 'T12:00:00');
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className={`${styles.commentPanel} ${isOpen ? styles.open : ''}`}>
            <button className={styles.closeBtn} onClick={onClose} title="Close">
                <X size={14} />
            </button>

            <div className={styles.header}>
                <span className={styles.habitName}>{habitName}</span>
                <span className={styles.date}>{formatDate(dateStr)}</span>
            </div>

            <textarea
                ref={inputRef}
                className={styles.input}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
            />

            <div className={styles.hint}>
                Press <kbd>Enter</kbd> to save, <kbd>Esc</kbd> to cancel
            </div>
        </div>
    );
}
