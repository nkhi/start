import { useApiError } from './ApiErrorContext';
import styles from './ApiErrorToast.module.css';

export function ApiErrorToast() {
    const { errors, dismissError } = useApiError();

    if (errors.length === 0) return null;

    return (
        <div className={styles.toastContainer}>
            {errors.map((error) => (
                <div
                    key={error.id}
                    className={styles.toast}
                    onClick={() => dismissError(error.id)}
                >
                    <div className={styles.iconWrapper}>
                        <svg
                            className={styles.icon}
                            viewBox="0 0 16 16"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M8 5V8.5M8 11H8.005M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8Z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                    <div className={styles.content}>
                        <span className={styles.code}>{error.statusCode === 0 ? 'offline' : error.statusCode}</span>
                        <span className={styles.separator}>;</span>
                        <span className={styles.route}>{error.route}</span>
                        <span className={styles.message}>{error.statusCode === 0 ? '' : 'failed'}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
