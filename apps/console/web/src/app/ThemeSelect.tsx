import { useState } from "react";
import { applyTheme, isTheme, readStoredTheme } from "./theme";

export function ThemeSelect({ className }: { className?: string }) {
    const [theme, setTheme] = useState(readStoredTheme);
    return (
        <label className={className}>
            Theme
            <select
                value={theme}
                onChange={(event) => {
                    if (!isTheme(event.target.value)) return;
                    setTheme(event.target.value);
                    applyTheme(event.target.value);
                }}
            >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
            </select>
        </label>
    );
}
