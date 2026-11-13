import { Card, CardHeader } from "@frontend/design-system-react/card";
import { ClockIcon } from "@frontend/design-system-react/icons";
import { useTranslate } from "@frontend/locale/react";
import { DappChangeDto, DappDto } from "@shared/console";
import { formatDateTime } from "../../../common/utils/format";
import { ChangeDiff, pendingChangeRows } from "../change-diff/change-diff";

export type ChangeUnderReviewProps = {
    live: DappDto;
    change: DappChangeDto;
};

export function ChangeUnderReview({ live, change }: ChangeUnderReviewProps): React.JSX.Element {
    const translate = useTranslate();
    return (
        <Card className="flex flex-col overflow-hidden">
            <CardHeader variant="inline">
                <span className="flex text-link">
                    <ClockIcon />
                </span>
                <h2>{translate("myDapp.changeUnderReview.title")}</h2>
                <span className="text-sm text-ink-subtle">
                    {translate("myDapp.changeUnderReview.requested", { date: formatDateTime(change.createdAt) })}
                </span>
            </CardHeader>
            <div className="flex flex-col gap-4 px-6 py-5 text-base">
                <p>{translate("myDapp.changeUnderReview.description")}</p>
                <ChangeDiff
                    rows={pendingChangeRows(live, change)}
                    beforeLabel={translate("dapp.diff.live")}
                    afterLabel={translate("dapp.diff.proposed")}
                />
            </div>
        </Card>
    );
}
