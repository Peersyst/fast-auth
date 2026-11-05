import { Trans } from "react-i18next";
import { Card } from "@frontend/design-system-react/card";
import { CheckIcon } from "@frontend/design-system-react/icons";
import { useTranslate } from "@frontend/locale/react";
import { formatDateTime } from "../../../common/utils/format";

const STEP = "flex flex-[1_1_200px] gap-3";
const STEP_MARK = "flex size-7 flex-none items-center justify-center rounded-pill text-sm font-bold";
const STEP_TEXT = "flex flex-col gap-0.5";
const STEP_TITLE = "text-base font-semibold";
const STEP_NOTE = "text-sm text-ink-subtle";

export type PendingStatusProps = {
    submittedAt: string;
    email: string;
};

export function PendingStatus({ submittedAt, email }: PendingStatusProps): React.JSX.Element {
    const translate = useTranslate();
    return (
        <Card className="flex flex-col gap-5 p-6">
            <ol className="m-0 flex list-none flex-wrap gap-6 p-0">
                <li className={STEP}>
                    <span className={`${STEP_MARK} bg-accent text-on-accent`} aria-hidden="true">
                        <CheckIcon />
                    </span>
                    <div className={STEP_TEXT}>
                        <span className={STEP_TITLE}>{translate("myDapp.pending.submitted")}</span>
                        <span className={STEP_NOTE}>{formatDateTime(submittedAt)}</span>
                    </div>
                </li>
                <li className={STEP} aria-current="step">
                    <span className={`${STEP_MARK} border-2 border-link text-link`} aria-hidden="true">
                        2
                    </span>
                    <div className={STEP_TEXT}>
                        <span className={STEP_TITLE}>{translate("myDapp.pending.review")}</span>
                        <span className={STEP_NOTE}>{translate("myDapp.pending.reviewDescription")}</span>
                    </div>
                </li>
                <li className={STEP}>
                    <span className={`${STEP_MARK} border-2 border-border text-faint`} aria-hidden="true">
                        3
                    </span>
                    <div className={STEP_TEXT}>
                        <span className={`${STEP_TITLE} text-ink-subtle`}>{translate("myDapp.pending.approval")}</span>
                        <span className="text-sm text-faint">
                            <Trans
                                i18nKey="myDapp.pending.approvalDescription"
                                components={{ code: <code className="font-mono text-xs" /> }}
                            />
                        </span>
                    </div>
                </li>
            </ol>
            <p className="border-t border-t-border pt-4 text-base text-ink-subtle wrap-anywhere [&_strong]:font-semibold [&_strong]:text-ink">
                <Trans i18nKey="myDapp.pending.email" values={{ email }} components={{ strong: <strong /> }} />
            </p>
        </Card>
    );
}
