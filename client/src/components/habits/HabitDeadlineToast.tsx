import { Clock } from '@phosphor-icons/react';
import styles from './HabitDeadlineToast.module.css';

interface DeadlineToast {
    id: string;
    habitId: string;
    habitName: string;
    message: string;
    timestamp: number;
}

interface HabitDeadlineToastProps {
    toasts: DeadlineToast[];
    onDismiss: (id: string) => void;
}

export function HabitDeadlineToast({ toasts, onDismiss }: HabitDeadlineToastProps) {
    if (toasts.length === 0) return null;

    return (
        <div className={styles.toastContainer}>
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={styles.toast}
                    onClick={() => onDismiss(toast.id)}
                >
                    <div className={styles.iconWrapper}>
                        <Clock className={styles.icon} weight="duotone" />
                    </div>
                    <div className={styles.content}>
                        <span className={styles.habitName}>{toast.habitName}</span>
                        <span className={styles.message}>{toast.message}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
