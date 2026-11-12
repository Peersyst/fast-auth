import { Trans } from "react-i18next";
import { Button } from "@frontend/design-system-react/button";
import { Callout } from "@frontend/design-system-react/callout";
import { useGetMe, useRefreshSession } from "@frontend/console-auth/ui/queries";
import { useTranslate } from "@frontend/locale/react";
import { SessionCard, sessionCardClassNames } from "../../components/session-card/session-card";
import { SupportLink } from "../../components/support-link/support-link";

export type VerifyEmailProps = {
    email: string | undefined;
};

export function VerifyEmail({ email }: VerifyEmailProps): React.JSX.Element {
    const translate = useTranslate();
    const { mutate: refreshSession, isPending, isSuccess, isError } = useRefreshSession();
    const me = useGetMe();
    const checking = isPending || (isSuccess && me.isFetching);
    const failed = isError || (isSuccess && !me.isFetching && me.isRefetchError);
    const stillUnverified = isSuccess && !me.isFetching && !me.isError && me.data?.emailVerified === false;

    return (
        <SessionCard>
            <h1>{translate("verifyEmail.title")}</h1>
            <p>
                <Trans i18nKey="verifyEmail.description" values={{ email }} components={{ strong: <strong /> }} />
            </p>
            {failed && (
                <Callout tone="error" title={translate("verifyEmail.refreshFailed")}>
                    <p>{translate("verifyEmail.refreshFailedDescription")}</p>
                </Callout>
            )}
            {stillUnverified && (
                <Callout tone="error" title={translate("verifyEmail.notVerified")}>
                    <p>{translate("verifyEmail.notVerifiedDescription")}</p>
                </Callout>
            )}
            <div className={sessionCardClassNames.actions}>
                <Button loading={checking} onClick={() => refreshSession()}>
                    {translate("verifyEmail.action")}
                </Button>
            </div>
            <SupportLink i18nKey="verifyEmail.support" />
        </SessionCard>
    );
}
