import { Trans } from "react-i18next";
import { config } from "../../../../config";
import { sessionCardClassNames } from "../session-card/session-card";

export type SupportLinkProps = {
    i18nKey: "support" | "verifyEmail.support";
};

export function SupportLink({ i18nKey }: SupportLinkProps): React.JSX.Element {
    const { supportUrl } = config;
    return (
        <p className={sessionCardClassNames.support}>
            <Trans i18nKey={i18nKey} components={{ contact: <a href={supportUrl} /> }} />
        </p>
    );
}
