import { ReactNode } from "react";
import { Button } from "@frontend/design-system-react/button";
import { Card, CardHeader } from "@frontend/design-system-react/card";
import { useTranslate } from "@frontend/locale/react";
import { AdminDappDto } from "@shared/console";
import { FieldList, FieldRow, Value, valueClassNames } from "../../../dapp/components/field-values/field-values";
import { EmailLink } from "../owner-email/owner-email";

type FactCardProps = {
    title: string;
    action?: ReactNode;
    facts: FieldRow[];
};

function FactCard({ title, action, facts }: FactCardProps): React.JSX.Element {
    return (
        <Card className="overflow-hidden">
            <CardHeader variant="split">
                <h2>{title}</h2>
                {action}
            </CardHeader>
            <FieldList rows={facts} />
        </Card>
    );
}

export type DappFactsProps = {
    dapp: AdminDappDto;
    /**
     * Opens the owner change, when the dApp's status allows one.
     */
    onChangeOwner?: () => void;
};

export function DappFacts({ dapp, onChangeOwner }: DappFactsProps): React.JSX.Element {
    const translate = useTranslate();
    return (
        <>
            <FactCard
                title={translate("admin.dapp.facts.application")}
                facts={[
                    [translate("dapp.fields.name"), <Value key="name" value={dapp.name} />],
                    [translate("dapp.fields.description"), <Value key="description" value={dapp.description} />],
                    [
                        translate("dapp.fields.logoUrl"),
                        <div key="logo" className="flex min-w-0 items-center gap-3">
                            <span className="flex size-10 flex-none items-center justify-center overflow-hidden rounded-[10px] border border-border bg-canvas text-faint [&_img]:size-full [&_img]:object-contain">
                                <img src={dapp.logoUrl} alt={translate("admin.dapp.facts.logoAlt", { name: dapp.name })} />
                            </span>
                            <code className={valueClassNames.code}>{dapp.logoUrl}</code>
                        </div>,
                    ],
                    [translate("dapp.fields.mauBracket"), translate(`dapp.mau.${dapp.mauBracket}`)],
                ]}
            />
            <FactCard
                title={translate("admin.dapp.facts.urls")}
                facts={[
                    [translate("dapp.fields.callbackUrls"), <Value key="callbackUrls" value={dapp.callbackUrls} code />],
                    [translate("dapp.fields.logoutUrls"), <Value key="logoutUrls" value={dapp.logoutUrls} code />],
                    [translate("dapp.fields.webOrigins"), <Value key="webOrigins" value={dapp.webOrigins} code />],
                ]}
            />
            <FactCard
                title={translate("admin.dapp.facts.contact")}
                action={
                    onChangeOwner && (
                        <Button variant="secondary" size="small" onClick={onChangeOwner}>
                            {translate("admin.dapp.facts.changeOwner")}
                        </Button>
                    )
                }
                facts={[
                    [
                        translate("admin.dapp.facts.primaryContact"),
                        <>
                            <EmailLink email={dapp.contactEmail} />{" "}
                            <span className="text-sm text-ink-subtle">{translate("admin.dapp.facts.contactNote")}</span>
                        </>,
                    ],
                    [
                        translate("admin.dapp.facts.owner"),
                        <>
                            <EmailLink email={dapp.ownerEmail} />{" "}
                            <span className="text-sm text-ink-subtle">{translate("admin.dapp.facts.ownerNote")}</span>
                        </>,
                    ],
                ]}
            />
        </>
    );
}
