import { Button } from "@frontend/design-system-react/button";
import { Card } from "@frontend/design-system-react/card";
import { PencilIcon } from "@frontend/design-system-react/icons";
import { useTranslate } from "@frontend/locale/react";
import { OwnerDappDto } from "@shared/console";
import { initials } from "../../../common/utils/initials";
import { FieldList, Value } from "../field-values/field-values";

export type DappSummaryProps = {
    dapp: OwnerDappDto;
    onEdit: () => void;
};

export function DappSummary({ dapp, onEdit }: DappSummaryProps): React.JSX.Element {
    const translate = useTranslate();
    return (
        <Card as="article" className="flex flex-col overflow-hidden [&>dl]:border-t [&>dl]:border-t-border">
            <div className="flex flex-wrap items-center gap-4 p-6">
                <span
                    className="flex size-12 flex-none items-center justify-center rounded-[12px] bg-surface-muted text-lg font-bold text-ink-2"
                    aria-hidden="true"
                >
                    {initials(dapp.name)}
                </span>
                <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-0.5 wrap-anywhere [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-[-0.015em] [&_p]:text-base [&_p]:text-ink-subtle">
                    <h2>{dapp.name}</h2>
                    {dapp.description && <p>{dapp.description}</p>}
                </div>
                <Button variant="secondary" onClick={onEdit}>
                    <PencilIcon />
                    {translate("myDapp.edit.action")}
                </Button>
            </div>
            <FieldList
                rows={[
                    [translate("dapp.fields.mauBracket"), translate(`dapp.mau.${dapp.mauBracket}`)],
                    [translate("dapp.fields.logoUrl"), <Value key="logoUrl" value={dapp.logoUrl} code />],
                    [translate("dapp.fields.callbackUrls"), <Value key="callbackUrls" value={dapp.callbackUrls} code />],
                    [translate("dapp.fields.logoutUrls"), <Value key="logoutUrls" value={dapp.logoutUrls} code />],
                    [translate("dapp.fields.webOrigins"), <Value key="webOrigins" value={dapp.webOrigins} code />],
                    [translate("dapp.fields.contactEmail"), dapp.contactEmail],
                ]}
            />
        </Card>
    );
}
