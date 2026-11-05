import { PropsWithChildren, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BrowserErrorEvent } from "@frontend/core/ui/error/browser";
import { ConsoleAuthErrors } from "@frontend/console-auth/domain/errors";
import { consoleAuthQueryKeys } from "@frontend/console-auth/ui/queries";
import { MeDto } from "@shared/console";

export const ErrorHandler = ({ children }: PropsWithChildren): React.JSX.Element => {
    const queryClient = useQueryClient();

    useEffect(() => {
        const handleUiError = (event: BrowserErrorEvent): void => {
            if (event.error.message === ConsoleAuthErrors.EMAIL_NOT_VERIFIED) {
                queryClient.setQueryData<MeDto>(consoleAuthQueryKeys.me(), (me) => me && { ...me, emailVerified: false });
            }
        };

        BrowserErrorEvent.addListener(handleUiError);

        return () => {
            BrowserErrorEvent.removeListener(handleUiError);
        };
    }, [queryClient]);

    return <>{children}</>;
};
