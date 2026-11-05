import { Button } from "@frontend/design-system-react/button";
import { Callout } from "@frontend/design-system-react/callout";
import { useTranslate } from "@frontend/locale/react";
import { useErrorMessage } from "../../../hooks/use-error-message";

export type LoadErrorProps = {
    title: string;
    error: unknown;
    onRetry: () => void;
    retrying: boolean;
};

export const bootClassName = "mx-auto my-16 grid max-w-[480px] justify-items-start gap-4 px-4 py-0";

export function LoadError({ title, error, onRetry, retrying }: LoadErrorProps): React.JSX.Element {
    const translate = useTranslate();
    const message = useErrorMessage(error);
    return (
        <div className={bootClassName}>
            <Callout tone="error" title={title}>
                <p>{message}</p>
            </Callout>
            <Button variant="secondary" loading={retrying} onClick={onRetry}>
                {translate("tryAgain")}
            </Button>
        </div>
    );
}

export type RefreshErrorProps = {
    error: unknown;
};

export function RefreshError({ error }: RefreshErrorProps): React.JSX.Element {
    const translate = useTranslate();
    const message = useErrorMessage(error);
    return (
        <Callout tone="warning" title={translate("refreshError")}>
            <p>{message}</p>
        </Callout>
    );
}
