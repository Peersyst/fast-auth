import { Trans } from "react-i18next";
import { Callout } from "@frontend/design-system-react/callout";
import { Card, CardHeader } from "@frontend/design-system-react/card";
import { CopyButton } from "@frontend/design-system-react/copy-button";
import { KeyIcon } from "@frontend/design-system-react/icons";
import { useTranslate } from "@frontend/locale/react";
import { config } from "../../../../config";
import { FieldList, valueClassNames } from "../../components/field-values/field-values";

const NOTE = "text-sm text-ink-subtle";

export type CredentialsProps = {
    clientId: string;
};

export function Credentials({ clientId }: CredentialsProps): React.JSX.Element {
    const translate = useTranslate();
    const { nearNetwork: network, nearNetworks } = config;
    const settings = nearNetworks[network];
    const name = translate(`dapp.networks.${network}`);
    return (
        <>
            <Card className="flex flex-col overflow-hidden">
                <CardHeader variant="inline">
                    <span className="flex text-link">
                        <KeyIcon />
                    </span>
                    <h2>{translate("myDapp.credentials.title", { network: name })}</h2>
                    <span className={NOTE}>{translate("myDapp.credentials.note")}</span>
                </CardHeader>
                <FieldList
                    rows={[
                        [
                            translate("myDapp.credentials.clientId"),
                            <span key="clientId" className="mx-0 -my-1 flex min-w-0 items-center gap-2.5">
                                <code className={`${valueClassNames.code} min-w-0 flex-auto`}>{clientId}</code>
                                <CopyButton
                                    value={clientId}
                                    label={translate("copy.clientId")}
                                    copyText={translate("copy.copy")}
                                    copiedText={translate("copy.copied")}
                                    failedText={translate("copy.failed")}
                                    className="flex-none"
                                />
                            </span>,
                        ],
                        [
                            translate("myDapp.credentials.network"),
                            <code key="network" className={valueClassNames.code}>
                                {network}
                            </code>,
                        ],
                        [
                            translate("myDapp.credentials.signingAudience"),
                            <span key="audience">
                                <code className={valueClassNames.code}>{settings.signingAudience}</code>{" "}
                                <span className={NOTE}>{translate("myDapp.credentials.defaultFor", { network })}</span>
                            </span>,
                        ],
                        [
                            translate("myDapp.credentials.contracts"),
                            <span key="contracts">
                                <code className={valueClassNames.code}>{settings.fastAuthContract}</code>{" "}
                                <span className={NOTE}>{translate("myDapp.credentials.mpc")}</span>{" "}
                                <code className={valueClassNames.code}>{settings.mpcContract}</code>
                            </span>,
                        ],
                    ]}
                />
            </Card>

            <div className="flex flex-col gap-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-[-0.015em]">
                <h2>{translate("myDapp.credentials.goLive")}</h2>
                <p className="text-base text-ink-subtle">{translate("myDapp.credentials.goLiveDescription", { network })}</p>
                <figure className="m-0 overflow-hidden rounded-lg border border-[rgba(255,255,255,0.1)] bg-code-bg shadow-[0_8px_32px_rgba(0,0,0,0.18)]">
                    <figcaption className="flex items-center gap-3 border-b border-b-[rgba(255,255,255,0.1)] bg-code-bar px-4 py-3 font-mono text-xs text-code-muted">
                        <span
                            className="flex gap-1.5 [&>span]:size-2.5 [&>span]:rounded-pill [&>span]:bg-[rgba(255,255,255,0.18)]"
                            aria-hidden="true"
                        >
                            <span />
                            <span />
                            <span />
                        </span>
                        main.ts
                    </figcaption>
                    <pre className="m-0 overflow-x-auto p-6 font-mono text-sm leading-[1.6] text-code-ink">
                        <code>
                            <span className="text-code-kw">import</span>
                            {" { JavascriptProvider } "}
                            <span className="text-code-kw">from</span>{" "}
                            <span className="text-code-str">{'"@fast-auth-near/javascript-provider"'}</span>
                            {";\n\n"}
                            <span className="text-code-kw">const</span>
                            {" provider "}
                            <span className="text-code-kw">=</span> <span className="text-code-kw">new</span>{" "}
                            <span className="text-code-fn">JavascriptProvider</span>
                            {"({\n  network: "}
                            <span className="text-code-str">{`"${network}"`}</span>
                            {",\n  clientId: "}
                            <span className="text-code-str">{`"${clientId}"`}</span>
                            {",\n});"}
                        </code>
                    </pre>
                </figure>
                <Callout tone="tip">
                    <p>
                        <Trans
                            i18nKey="myDapp.credentials.tip"
                            values={{ network, name }}
                            components={{ resources: <a href={settings.resourcesUrl} /> }}
                        />
                    </p>
                </Callout>
            </div>
        </>
    );
}
