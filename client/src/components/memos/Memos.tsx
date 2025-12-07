import React from 'react';

export const Memos: React.FC = () => {
    return (
        <div className="memos-container">
            <div className="memos-loading-overlay" />
            <iframe
                src="http://localhost:5230/"
                className="memos-frame"
                title="Memos"
            />
        </div>
    );
};
