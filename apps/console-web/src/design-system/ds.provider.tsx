import { PropsWithChildren } from "react";
import { DSProvider as DSProviderRoot } from "@frontend/design-system-react/core";
import { useSettingsState } from "@frontend/settings/ui/state";

export function DSProvider({ children }: PropsWithChildren): React.JSX.Element {
    const { theme = "system" } = useSettingsState();

    return <DSProviderRoot themeMode={theme}>{children}</DSProviderRoot>;
}
