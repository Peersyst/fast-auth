import { useEffect, useRef } from "react";
import { Trans } from "react-i18next";
import { Callout } from "@frontend/design-system-react/callout";
import { PageTitle } from "@frontend/design-system-react/page-title";
import { useConfig } from "@frontend/config/react";
import { useSubmitDapp } from "@frontend/console-dapp/ui/queries";
import { useTranslate } from "@frontend/locale/react";
import { DappForm } from "../dapp-form/dapp-form";

const CONTAINER = "mx-auto my-0 flex w-full max-w-[848px] flex-col gap-6";

export type RegisterDappProps = {
    onCancel: () => void;
};

export function RegisterDapp({ onCancel }: RegisterDappProps): React.JSX.Element {
    const translate = useTranslate();
    const { nearNetwork, applyDocsUrl } = useConfig("nearNetwork", "applyDocsUrl");
    const { mutateAsync: submit } = useSubmitDapp();
    const heading = useRef<HTMLHeadingElement>(null);
    useEffect(() => heading.current?.focus(), []);

    return (
        <>
            <div className={CONTAINER}>
                <div className="flex flex-col gap-2">
                    <p className="font-mono text-xs font-medium tracking-kicker text-ink-subtle uppercase">
                        {translate("myDapp.access", { network: translate(`dapp.networks.${nearNetwork}`) })}
                    </p>
                    <PageTitle ref={heading} tabIndex={-1} size="large" className="focus:outline-none">
                        {translate("myDapp.register.title")}
                    </PageTitle>
                    <p className="text-lg text-ink-subtle">
                        <Trans
                            i18nKey="myDapp.register.description"
                            values={{ network: nearNetwork }}
                            components={{ code: <code className="rounded-[4px] bg-surface-muted px-1.5 py-px font-mono text-base" /> }}
                        />
                    </p>
                </div>
                <Callout tone="info">
                    <p>
                        <Trans i18nKey="myDapp.register.info" components={{ apply: <a href={applyDocsUrl} /> }} />
                    </p>
                </Callout>
            </div>
            <div className={CONTAINER}>
                <DappForm
                    mode="owner"
                    values={null}
                    saveLabel={translate("myDapp.register.submit")}
                    saveHint={translate("myDapp.register.submitHint")}
                    onSave={submit}
                    onCancel={onCancel}
                />
            </div>
        </>
    );
}
