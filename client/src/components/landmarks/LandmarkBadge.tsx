import React from 'react';
import type { LandmarkItem } from '../../types';
import styles from './Landmarks.module.css';

interface LandmarkBadgeProps {
    item: LandmarkItem;
    onDelete: () => void;
}

export function LandmarkBadge({ item, onDelete }: LandmarkBadgeProps) {
    return (
        <div className={styles.bulletItem}>
            <span className={styles.bulletText}>
                {item.text}
            </span>
            <button
                className={styles.bulletDeleteBtn}
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                onPointerDown={(e) => e.stopPropagation()}
            >
                ×
            </button>
        </div>
    );
}
