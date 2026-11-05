import { IStorage } from "../storage";
import { browserCookies } from "./browser-cookies";

export const browserCookieStorage: IStorage = {
    setItem(key: string, value: any): void {
        return browserCookies.set(key, JSON.stringify(value));
    },
    getItem(key: string): any {
        return JSON.stringify(browserCookies.get(key));
    },
    removeItem(key: string): void {
        return browserCookies.remove(key);
    },
};
