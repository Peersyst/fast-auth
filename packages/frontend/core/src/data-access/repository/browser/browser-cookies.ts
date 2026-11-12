/**
 * This is a simple wrapper around the browser's cookie API.
 * @see https://www.w3schools.com/js/js_cookies.asp
 */
export const browserCookies = {
    set(name: string, value: string, exp?: Date): void {
        let cookie = `${name}=${value}`;
        const expires = exp ? `expires=${exp.toUTCString()}` : undefined;
        if (expires) {
            cookie += `;${expires}`;
        }
        document.cookie = cookie + ";path=/";
    },
    get(name: string): string | undefined {
        const cookieName = name + "=";
        const decodedCookie = decodeURIComponent(document.cookie);
        const ca = decodedCookie.split(";");
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) == " ") {
                c = c.substring(1);
            }
            if (c.indexOf(cookieName) == 0) {
                return c.substring(cookieName.length, c.length);
            }
        }
        return undefined;
    },
    remove(name: string): void {
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/;";
    },
};
