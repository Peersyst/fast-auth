import { Button } from "@frontend/design-system-react/button";
import { Card, CardBody, CardHeader } from "@frontend/design-system-react/card";
import { CheckIcon } from "@frontend/design-system-react/icons";
import { useTranslate } from "@frontend/locale/react";
import { AdminDappDto, SyncedFieldsDto } from "@shared/console";
import { diffSyncedFields } from "@shared/modules/dapp";
import { formatDateTime } from "../../../common/utils/format";
import { ChangeDiff } from "../../../dapp/components/change-diff/change-diff";

export type ChangeReviewProps = {
    dapp: AdminDappDto;
    change: SyncedFieldsDto;
    onApprove: () => void;
    onReject: () => void;
};

export function ChangeReview({ dapp, change, onApprove, onReject }: ChangeReviewProps): React.JSX.Element {
    const translate = useTranslate();
    return (
        <Card className="overflow-hidden border-warning-border" aria-labelledby="change-heading">
            <CardHeader variant="split">
                <h2 id="change-heading">{translate("myDapp.changeUnderReview.title")}</h2>
                {dapp.pendingChangeAt && (
                    <span className="text-sm text-ink-subtle">
                        {translate("myDapp.changeUnderReview.requested", { date: formatDateTime(dapp.pendingChangeAt) })}
                    </span>
                )}
            </CardHeader>
            <CardBody>
                <ChangeDiff
                    rows={diffSyncedFields(dapp, change)}
                    beforeLabel={translate("dapp.diff.live")}
                    afterLabel={translate("dapp.diff.proposed")}
                />
                {change.logoUrl !== dapp.logoUrl && (
                    <figure className="m-0 flex items-center gap-3 text-sm text-ink-subtle">
                        <span className="flex size-10 flex-none items-center justify-center overflow-hidden rounded-[10px] border border-border bg-canvas text-faint [&_img]:size-full [&_img]:object-contain">
                            <img src={change.logoUrl} alt={translate("admin.dapp.changeReview.proposedLogoAlt", { name: change.name })} />
                        </span>
                        <figcaption>{translate("admin.dapp.changeReview.proposedLogo")}</figcaption>
                    </figure>
                )}
                <div className="flex flex-wrap gap-2">
                    <Button onClick={onApprove}>
                        <CheckIcon size={16} />
                        {translate("admin.dapp.changeReview.approve")}
                    </Button>
                    <Button variant="danger" onClick={onReject}>
                        {translate("admin.dapp.changeReview.reject")}
                    </Button>
                </div>
            </CardBody>
        </Card>
    );
}
