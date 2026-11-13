import { IStorage } from "../storage";

export const browserLocalStorage: IStorage = {
    setItem(key: string, value: any): void {
        return localStorage.setItem(key, JSON.stringify(value));
    },
    getItem(key: string): any {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : undefined;
    },
    removeItem(key: string): void {
        return localStorage.removeItem(key);
    },
};
