import { Button } from "@frontend/design-system-react/button";
import { Card, CardHeader } from "@frontend/design-system-react/card";
import { ClockIcon } from "@frontend/design-system-react/icons";
import { useTranslate } from "@frontend/locale/react";
import { OwnerDappDto, SyncedFieldsDto } from "@shared/console";
import { diffSyncedFields } from "@shared/modules/dapp";
import { formatDateTime } from "../../../common/utils/format";
import { ChangeDiff } from "../change-diff/change-diff";

export type ChangeUnderReviewProps = {
    live: OwnerDappDto;
    change: SyncedFieldsDto;
    onWithdraw: () => void;
};

export function ChangeUnderReview({ live, change, onWithdraw }: ChangeUnderReviewProps): React.JSX.Element {
    const translate = useTranslate();
    return (
        <Card className="flex flex-col overflow-hidden">
            <CardHeader variant="inline">
                <span className="flex text-link">
                    <ClockIcon />
                </span>
                <h2>{translate("myDapp.changeUnderReview.title")}</h2>
                {live.pendingChangeAt && (
                    <span className="text-sm text-ink-subtle">
                        {translate("myDapp.changeUnderReview.requested", { date: formatDateTime(live.pendingChangeAt) })}
                    </span>
                )}
            </CardHeader>
            <div className="flex flex-col gap-4 px-6 py-5 text-base">
                <p>{translate("myDapp.changeUnderReview.description")}</p>
                <ChangeDiff
                    rows={diffSyncedFields(live, change)}
                    beforeLabel={translate("dapp.diff.live")}
                    afterLabel={translate("dapp.diff.proposed")}
                />
                <div>
                    <Button variant="secondary" onClick={onWithdraw}>
                        {translate("myDapp.withdraw.confirm")}
                    </Button>
                </div>
            </div>
        </Card>
    );
}
