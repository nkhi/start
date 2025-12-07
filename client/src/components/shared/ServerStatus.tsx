import { useState, useEffect } from 'react';

export const ServerStatus = ({ apiBaseUrl }: { apiBaseUrl: string }) => {
    const [isOnline, setIsOnline] = useState<boolean | null>(null); // null = initial check

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch(`${apiBaseUrl}/health`);
                if (res.ok) {
                    setIsOnline(true);
                } else {
                    setIsOnline(false);
                }
            } catch (e) {
                setIsOnline(false);
            }
        };

        // Check immediately
        checkStatus();

        // Then every 2 seconds
        const interval = setInterval(checkStatus, 2000);

        return () => clearInterval(interval);
    }, [apiBaseUrl]);

    // Only show when definitely offline
    if (isOnline !== false) {
        return null;
    }

    // Styles for the indicator
    const indicatorStyle: React.CSSProperties = {
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        // Premium "bead" look with radial gradient for shine
        background: 'radial-gradient(circle at 35% 35%, #ff8787, #e03131)',
        // Layered shadows: subtle ring + diffuse glow
        boxShadow: '0 0 0 1px rgba(0,0,0,0.2), 0 0 12px rgba(224, 49, 49, 0.8)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        transition: 'all 0.3s ease',
        cursor: 'help',
    };

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 12px',
        height: '100%',
        animation: 'fadeIn 0.3s ease-in-out',
    };

    return (
        <div style={containerStyle} title="Server Offline (Reconnecting...)">
            <div style={indicatorStyle} />
        </div>
    );
};
