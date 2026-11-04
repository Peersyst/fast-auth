const THEMES = ["system", "light", "dark"] as const;
type Theme = (typeof THEMES)[number];

const STORAGE_KEY = "console.theme";

export function isTheme(value: unknown): value is Theme {
    return THEMES.some((theme) => theme === value);
}

export function readStoredTheme(): Theme {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return isTheme(stored) ? stored : "system";
    } catch {
        return "system";
    }
}

export function applyTheme(theme: Theme) {
    if (theme === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
}
