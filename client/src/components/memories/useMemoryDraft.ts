import { useState, useEffect } from 'react';

const DRAFT_KEY = 'goodMoments_draft';

export function useMemoryDraft(initialText: string = '') {
    const [text, setText] = useState(initialText);

    // Load draft from localStorage on mount
    useEffect(() => {
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) {
            setText(draft);
        }
    }, []);

    // Save draft to localStorage whenever text changes
    useEffect(() => {
        if (text) {
            localStorage.setItem(DRAFT_KEY, text);
        } else {
            localStorage.removeItem(DRAFT_KEY);
        }
    }, [text]);

    const clearDraft = () => {
        setText('');
        localStorage.removeItem(DRAFT_KEY);
    };

    return {
        text,
        setText,
        clearDraft
    };
}
