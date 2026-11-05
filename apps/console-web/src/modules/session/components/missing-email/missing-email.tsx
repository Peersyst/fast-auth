import { useTranslate } from "@frontend/locale/react";
import { SessionCard } from "../session-card/session-card";
import { SupportLink } from "../support-link/support-link";

export function MissingEmail(): React.JSX.Element {
    const translate = useTranslate();
    return (
        <SessionCard>
            <h1>{translate("missingEmail.title")}</h1>
            <p>{translate("missingEmail.description")}</p>
            <SupportLink i18nKey="support" />
        </SessionCard>
    );
}
