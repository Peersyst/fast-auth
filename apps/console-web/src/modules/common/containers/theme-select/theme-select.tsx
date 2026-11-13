import { Theme } from "@frontend/settings";
import { useUpdateSettingsTheme } from "@frontend/settings/ui/query";
import { useSettingsState } from "@frontend/settings/ui/state";
import { useTranslate } from "@frontend/locale/react";

const THEMES: Theme[] = ["system", "light", "dark"];

/**
 * Narrows a select's value to a theme.
 * @param value The value.
 * @returns Whether it is a theme.
 */
function isTheme(value: string): value is Theme {
    return THEMES.some((theme) => theme === value);
}

export type ThemeSelectProps = {
    className?: string;
};

export function ThemeSelect({ className }: ThemeSelectProps): React.JSX.Element {
    const translate = useTranslate();
    const { theme = "system" } = useSettingsState();
    const { mutate: setTheme } = useUpdateSettingsTheme();

    return (
        <label className={className}>
            {translate("theme.label")}
            <select
                value={theme}
                onChange={(event) => {
                    if (isTheme(event.target.value)) setTheme(event.target.value);
                }}
            >
                {THEMES.map((option) => (
                    <option key={option} value={option}>
                        {translate(`theme.${option}`)}
                    </option>
                ))}
            </select>
        </label>
    );
}
