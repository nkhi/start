
interface Location {
    latitude: number;
    longitude: number;
}

interface UserLocation {
    city: string | null;
    country: string | null;
    location: Location;
}

const Store = {
    get: (key: string): UserLocation | null => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Storage read fail. The vault is locked.', error);
            return null;
        }
    },
    set: (key: string, value: any): void => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
        }
    }
};

export default Store;
export type { UserLocation, Location };
