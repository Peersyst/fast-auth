import { Auth0Provider } from "react-native-auth0";
import { ReactNativeProvider } from "./provider";
import { ReactNativeProviderOptions } from "./types";
import { FAST_AUTH_AUTH0_DEFAULTS } from "@shared/core";

export type ReactNativeProviderConfig = {
    provider: ReactNativeProvider;
    reactProvider: (children: React.ReactNode) => React.ReactElement;
};

/**
 * Configures the ReactNativeProvider.
 * @param opts The options for the ReactNativeProvider.
 * @returns The configuration for the ReactNativeProvider.
 */
export function reactNativeProviderConfig(opts: ReactNativeProviderOptions): ReactNativeProviderConfig {
    const domain = opts.domain ?? FAST_AUTH_AUTH0_DEFAULTS[opts.network].domain;
    return {
        provider: new ReactNativeProvider(opts),
        reactProvider: (children: React.ReactNode) => (
            <Auth0Provider domain={domain} clientId={opts.clientId}>
                {children}
            </Auth0Provider>
        ),
    };
}
