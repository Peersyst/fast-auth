import { Button } from "@frontend/design-system-react/button";
import { Callout } from "@frontend/design-system-react/callout";
import { useTranslate } from "@frontend/locale/react";
import { bootClassName } from "../../../common/components/feedback/load-error/load-error";

export type SessionExpiredProps = {
    onSignIn: () => void;
};

export function SessionExpired({ onSignIn }: SessionExpiredProps): React.JSX.Element {
    const translate = useTranslate();
    return (
        <div className={bootClassName}>
            <Callout tone="error" title={translate("sessionExpired.title")}>
                <p>{translate("sessionExpired.description")}</p>
            </Callout>
            <Button onClick={onSignIn}>{translate("sessionExpired.action")}</Button>
        </div>
    );
}
