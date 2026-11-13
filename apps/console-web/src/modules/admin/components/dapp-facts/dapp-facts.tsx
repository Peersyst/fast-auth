import { Card, CardHeader } from "@frontend/design-system-react/card";
import { useTranslate } from "@frontend/locale/react";
import { DappDto } from "@shared/console";
import { FieldList, FieldRow, Value, valueClassNames } from "../../../dapp/components/field-values/field-values";

type FactCardProps = {
    title: string;
    facts: FieldRow[];
};

function FactCard({ title, facts }: FactCardProps): React.JSX.Element {
    return (
        <Card className="overflow-hidden">
            <CardHeader variant="split">
                <h2>{title}</h2>
            </CardHeader>
            <FieldList rows={facts} />
        </Card>
    );
}

export type DappFactsProps = {
    dapp: DappDto;
};

export function DappFacts({ dapp }: DappFactsProps): React.JSX.Element {
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
                facts={[
                    [
                        translate("admin.dapp.facts.primaryContact"),
                        <>
                            <a href={`mailto:${dapp.contactEmail}`} className="text-link">
                                {dapp.contactEmail}
                            </a>{" "}
                            <span className="text-sm text-ink-subtle">{translate("admin.dapp.facts.contactNote")}</span>
                        </>,
                    ],
                    [
                        translate("admin.dapp.facts.owner"),
                        <>
                            <a href={`mailto:${dapp.ownerEmail}`} className="text-link">
                                {dapp.ownerEmail}
                            </a>{" "}
                            <span className="text-sm text-ink-subtle">{translate("admin.dapp.facts.ownerNote")}</span>
                        </>,
                    ],
                ]}
            />
        </>
    );
}
