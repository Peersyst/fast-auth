import { Auth0Provider } from "react-native-auth0";
import { ReactNativeProvider } from "./provider";
import { ReactNativeProviderOptions } from "./types";

/**
 * Configures the ReactNativeProvider.
 * @param opts The options for the ReactNativeProvider.
 * @returns The configuration for the ReactNativeProvider.
 */
export function reactNativeProviderConfig(opts: ReactNativeProviderOptions) {
    return {
        provider: new ReactNativeProvider(opts),
        reactProvider: (children: React.ReactNode) => (
            <Auth0Provider domain={opts.domain} clientId={opts.clientId}>
                {children}
            </Auth0Provider>
        ),
    };
}
