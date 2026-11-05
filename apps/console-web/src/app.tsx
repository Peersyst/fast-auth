// Set up data access
import "./core/data-access/setup";

// Set up domain
import "./core/domain/setup";

// Load locale
import "./locale";

import Providers from "./providers";
import { useInit } from "./modules/common/hooks/use-init";
import Router from "./router/router";
import { StartError } from "./modules/common/containers/start-error/start-error";

export default function App(): React.JSX.Element | null {
    const { isLoading, isError } = useInit();

    if (isLoading) return null;

    return <Providers>{isError ? <StartError /> : <Router />}</Providers>;
}
