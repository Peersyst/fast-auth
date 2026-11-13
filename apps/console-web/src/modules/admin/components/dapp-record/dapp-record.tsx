import { Card } from "@frontend/design-system-react/card";
import { CopyButton } from "@frontend/design-system-react/copy-button";
import { InfoIcon } from "@frontend/design-system-react/icons";
import { useTranslate } from "@frontend/locale/react";
import { DappDto } from "@shared/console";
import { formatDateTime } from "../../../common/utils/format";
import { FieldList, FieldRow, NoValue } from "../../../dapp/components/field-values/field-values";

const SIDE_CARD = "flex flex-col gap-3 p-5 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:tracking-[normal]";
const SIDE_FACTS = {
    list: "m-0 flex flex-col gap-2 text-sm [&_code]:font-mono [&_code]:text-xs [&_dd]:m-0 [&_dd]:ml-auto [&_dd]:min-w-0 [&_dd]:text-right [&_dd]:wrap-anywhere [&_dt]:font-mono [&_dt]:text-2xs [&_dt]:font-medium [&_dt]:tracking-kicker [&_dt]:text-ink-subtle [&_dt]:uppercase [&>div]:flex [&>div]:flex-wrap [&>div]:items-baseline [&>div]:justify-between [&>div]:gap-x-3 [&>div]:gap-y-1",
};

export type DappRecordProps = {
    dapp: DappDto;
};

export function DappRecord({ dapp }: DappRecordProps): React.JSX.Element {
    const translate = useTranslate();
    const provisioning: FieldRow[] =
        dapp.status === "removed"
            ? [
                  [
                      translate("admin.dapp.record.formerClientId"),
                      dapp.auth0ClientId ? <code key="clientId">{dapp.auth0ClientId}</code> : <NoValue />,
                  ],
              ]
            : [
                  [
                      translate("admin.dapp.record.clientId"),
                      dapp.auth0ClientId ? (
                          <span key="clientId" className="inline-flex flex-wrap items-center justify-end gap-2">
                              <code>{dapp.auth0ClientId}</code>
                              <CopyButton
                                  value={dapp.auth0ClientId}
                                  label={translate("copy.clientId")}
                                  copyText={translate("copy.copy")}
                                  copiedText={translate("copy.copied")}
                                  failedText={translate("copy.failed")}
                              />
                          </span>
                      ) : (
                          <NoValue />
                      ),
                  ],
              ];
    const reviewed = dapp.reviewedAt ? formatDateTime(dapp.reviewedAt) : translate("admin.dapp.record.notYet");
    return (
        <>
            <Card className={SIDE_CARD}>
                <h2>{translate("admin.dapp.record.provisioning")}</h2>
                {!dapp.auth0ClientId && dapp.status === "pending" && (
                    <div className="flex gap-2.5 rounded-[10px] bg-canvas p-3 text-sm leading-[1.5] text-ink-3 [&_svg]:mt-px [&_svg]:flex-none">
                        <InfoIcon size={18} />
                        <span>{translate("admin.dapp.record.noClient")}</span>
                    </div>
                )}
                <FieldList classNames={SIDE_FACTS} rows={provisioning} />
            </Card>
            <Card className={SIDE_CARD}>
                <h2>{translate("admin.dapp.record.title")}</h2>
                <FieldList
                    classNames={SIDE_FACTS}
                    rows={[
                        [translate("admin.dapp.record.reviewed"), reviewed],
                        [translate("admin.dapp.record.created"), formatDateTime(dapp.createdAt)],
                        [translate("admin.dapp.record.id"), <code key="id">{dapp.id}</code>],
                    ]}
                />
            </Card>
        </>
    );
}
