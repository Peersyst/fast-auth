import { useSyncExternalStore } from "react";
import { Button } from "@frontend/design-system-react/button";
import { MoonIcon, SunIcon } from "@frontend/design-system-react/icons";
import { useUpdateSettingsTheme } from "@frontend/settings/ui/query";
import { useSettingsState } from "@frontend/settings/ui/state";
import { useTranslate } from "@frontend/locale/react";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * The browser's color-scheme media query, or `null` where the browser has none.
 * @returns The media query list.
 */
function darkQuery(): MediaQueryList | null {
    return typeof window.matchMedia === "function" ? window.matchMedia(DARK_QUERY) : null;
}

/**
 * Listens for changes to the browser's color scheme.
 * @param onChange Called when the scheme changes.
 * @returns The unsubscribe function.
 */
function subscribe(onChange: () => void): () => void {
    const query = darkQuery();
    query?.addEventListener("change", onChange);
    return () => query?.removeEventListener("change", onChange);
}

/**
 * Whether the browser prefers a dark color scheme.
 * @returns Whether it does.
 */
function prefersDark(): boolean {
    return darkQuery()?.matches === true;
}

export type ThemeToggleProps = {
    className?: string;
};

/**
 * Switches between the light and dark themes. Until one is chosen, the console follows the browser's color scheme.
 * @param props The toggle's props.
 * @param props.className The button's extra class name.
 * @returns The toggle.
 */
export function ThemeToggle({ className }: ThemeToggleProps): React.JSX.Element {
    const translate = useTranslate();
    const { theme = "system" } = useSettingsState();
    const { mutate: setTheme } = useUpdateSettingsTheme();
    const systemDark = useSyncExternalStore(subscribe, prefersDark);
    const dark = theme === "dark" || (theme === "system" && systemDark);

    return (
        <Button
            variant="secondary"
            size="small"
            className={className}
            aria-label={translate(dark ? "theme.toLight" : "theme.toDark")}
            title={translate(dark ? "theme.toLight" : "theme.toDark")}
            onClick={() => setTheme(dark ? "light" : "dark")}
        >
            {dark ? <SunIcon /> : <MoonIcon />}
        </Button>
    );
}
