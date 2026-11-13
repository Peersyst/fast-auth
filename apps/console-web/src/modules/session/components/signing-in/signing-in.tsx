import { useId } from "react";
import { Button } from "@frontend/design-system-react/button";
import { Callout } from "@frontend/design-system-react/callout";
import { Spinner } from "@frontend/design-system-react/spinner";
import { useTranslate } from "@frontend/locale/react";
import { SessionCard, sessionCardClassNames } from "../session-card/session-card";

export type SigningInProps = {
    popupBlocked: boolean;
    onRetryPopup: () => void;
    onContinueInTab: () => void;
};

export function SigningIn({ popupBlocked, onRetryPopup, onContinueInTab }: SigningInProps): React.JSX.Element {
    const translate = useTranslate();
    const blockedId = useId();
    return (
        <SessionCard>
            <h1>{translate("signingIn.title")}</h1>
            {popupBlocked ? (
                <>
                    <Callout tone="warning" id={blockedId} title={translate("signingIn.popupBlocked")}>
                        <p>{translate("signingIn.popupBlockedDescription")}</p>
                    </Callout>
                    <div className={sessionCardClassNames.actions}>
                        <Button autoFocus aria-describedby={blockedId} onClick={onContinueInTab}>
                            {translate("signingIn.continueInTab")}
                        </Button>
                        <Button variant="secondary" onClick={onRetryPopup}>
                            {translate("signingIn.retryPopup")}
                        </Button>
                    </div>
                </>
            ) : (
                <p className="flex items-center gap-3 text-ink-subtle" role="status">
                    <Spinner />
                    {translate("signingIn.inProgress")}
                </p>
            )}
        </SessionCard>
    );
}
