import { useLayoutEffect } from "react";
import { DSProviderProps } from "./ds.types";

/**
 * Applies the theme mode to the document: `system` follows the browser's color scheme, the others force one.
 * @param props The theme mode and the app.
 * @returns The app.
 */
export function DSProvider({ themeMode, children }: DSProviderProps): React.JSX.Element {
    useLayoutEffect(() => {
        if (themeMode === "system") document.documentElement.removeAttribute("data-theme");
        else document.documentElement.setAttribute("data-theme", themeMode);
    }, [themeMode]);

    return <>{children}</>;
}
