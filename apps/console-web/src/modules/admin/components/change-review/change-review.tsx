import { Button } from "@frontend/design-system-react/button";
import { Card, CardBody, CardHeader } from "@frontend/design-system-react/card";
import { CheckIcon } from "@frontend/design-system-react/icons";
import { useTranslate } from "@frontend/locale/react";
import { DappChangeDto, DappDto } from "@shared/console";
import { formatDateTime } from "../../../common/utils/format";
import { ChangeDiff, pendingChangeRows } from "../../../dapp/components/change-diff/change-diff";
import { LogoPreview } from "../logo-preview/logo-preview";

export type ChangeReviewProps = {
    dapp: DappDto;
    change: DappChangeDto;
    onApprove: () => void;
    onReject: () => void;
};

export function ChangeReview({ dapp, change, onApprove, onReject }: ChangeReviewProps): React.JSX.Element {
    const translate = useTranslate();
    return (
        <Card className="overflow-hidden border-warning-border" aria-labelledby="change-heading">
            <CardHeader variant="split">
                <h2 id="change-heading">{translate("myDapp.changeUnderReview.title")}</h2>
                <span className="text-sm text-ink-subtle">
                    {translate("myDapp.changeUnderReview.requested", { date: formatDateTime(change.createdAt) })}
                </span>
            </CardHeader>
            <CardBody>
                <ChangeDiff
                    rows={pendingChangeRows(dapp, change)}
                    beforeLabel={translate("dapp.diff.live")}
                    afterLabel={translate("dapp.diff.proposed")}
                />
                {change.logoUrl !== null && (
                    <figure className="m-0 flex items-center gap-3 text-sm text-ink-subtle">
                        <LogoPreview
                            src={change.logoUrl}
                            alt={translate("admin.dapp.changeReview.proposedLogoAlt", { name: change.name ?? dapp.name })}
                        />
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
