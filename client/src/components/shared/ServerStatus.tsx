import { useState, useEffect } from 'react';
import styles from './ServerStatus.module.css';
import { API_BASE_URL } from '../../config';

export const ServerStatus = () => {
    const [isOnline, setIsOnline] = useState<boolean | null>(null);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/health`);
                if (res.ok) {
                    setIsOnline(true);
                } else {
                    setIsOnline(false);
                }
            } catch (e) {
                setIsOnline(false);
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 2000);

        return () => clearInterval(interval);
    }, []);

    if (isOnline !== false) {
        return null;
    }

    return (
        <div className={styles.container} title="Server Offline (Reconnecting...)">
            <div className={styles.indicator} />
        </div>
    );
};
