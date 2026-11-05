import { Button } from "@frontend/design-system-react/button";
import { Callout } from "@frontend/design-system-react/callout";
import { useTranslate } from "@frontend/locale/react";
import { SessionCard, sessionCardClassNames } from "../session-card/session-card";

export type SignInProps = {
    onSignIn: () => void;
    failed: boolean;
};

export function SignIn({ onSignIn, failed }: SignInProps): React.JSX.Element {
    const translate = useTranslate();
    return (
        <SessionCard>
            <p className="font-mono text-xs tracking-kicker text-ink-subtle uppercase">{translate("appName")}</p>
            <h1>{translate("signIn.title")}</h1>
            <p className="text-ink-subtle">{translate("signIn.description")}</p>
            {failed && (
                <Callout tone="error" title={translate("signIn.failed")}>
                    <p>{translate("signIn.failedDescription")}</p>
                </Callout>
            )}
            <div className={sessionCardClassNames.actions}>
                <Button onClick={onSignIn}>{translate("signIn.action")}</Button>
            </div>
        </SessionCard>
    );
}
