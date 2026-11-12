import { PropsWithChildren } from "react";
import { DSProvider } from "./design-system/ds.provider";
import { QueryClientProvider } from "./query/query-client.provider";
import { ErrorHandler } from "./modules/common/components/feedback/error-handler/error-handler";

export default function Providers({ children }: PropsWithChildren): React.JSX.Element {
    return (
        <DSProvider>
            <QueryClientProvider>
                <ErrorHandler>{children}</ErrorHandler>
            </QueryClientProvider>
        </DSProvider>
    );
}
