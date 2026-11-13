import { useState } from "react";
import { Callout } from "@frontend/design-system-react/callout";
import { BackIcon } from "@frontend/design-system-react/icons";
import { PageTitle } from "@frontend/design-system-react/page-title";
import { useEditDapp } from "@frontend/console-dapp/ui/queries";
import { useTranslate } from "@frontend/locale/react";
import { DappDto } from "@shared/console";
import { useHeadingFocus } from "../../../common/hooks/use-heading-focus";
import { ChangeUnderReview } from "../../components/change-under-review/change-under-review";
import { DappSummary } from "../../components/dapp-summary/dapp-summary";
import { PendingStatus } from "../../components/pending-status/pending-status";
import { RejectedStatus } from "../../components/rejected-status/rejected-status";
import { StatusBadge } from "../../components/status-badge/status-badge";
import { Credentials } from "../credentials/credentials";
import { DappForm } from "../dapp-form/dapp-form";

const CONTAINER = "mx-auto my-0 flex w-full max-w-[848px] flex-col gap-6";
const KICKER = "font-mono text-xs font-medium tracking-kicker text-ink-subtle uppercase";

export type LiveDapp = DappDto & { status: Exclude<DappDto["status"], "removed"> };

export type DappViewProps = {
    dapp: LiveDapp;
    /**
     * Whether to move focus to the title once it shows, as it replaces the first-visit card.
     */
    focusTitle: boolean;
    /**
     * Loads the dApp again, after a change was refused, so the view shows what the console holds.
     */
    reload: () => Promise<unknown>;
};

export function DappView({ dapp, focusTitle, reload }: DappViewProps): React.JSX.Element {
    const translate = useTranslate();
    const [editing, setEditing] = useState<DappDto | null>(null);
    const { mutateAsync: edit } = useEditDapp();
    const { heading, focusHeadingAfterRender } = useHeadingFocus(focusTitle);
    const approvalRule = translate("myDapp.approvalRule");
    const editNote =
        dapp.status === "approved" ? translate("myDapp.edit.approvedNote", { rule: approvalRule }) : translate("myDapp.edit.pendingNote");

    const switchView = (next: DappDto | null): void => {
        focusHeadingAfterRender();
        setEditing(next);
    };

    const title = (
        <div className="flex flex-wrap items-center gap-3">
            <PageTitle ref={heading} tabIndex={-1} size="large" className="focus:outline-none">
                {dapp.name}
            </PageTitle>
            <StatusBadge status={dapp.status} />
            {dapp.pendingChange && <StatusBadge status="changeUnderReview" />}
        </div>
    );
    const changeUnderReview = dapp.pendingChange && <ChangeUnderReview live={dapp} change={dapp.pendingChange} />;

    if (editing) {
        return (
            <>
                <div className={CONTAINER}>
                    <button
                        type="button"
                        className={`${KICKER} inline-flex cursor-pointer items-center gap-1.5 self-start border-0 p-0 no-underline bg-transparent`}
                        onClick={() => switchView(null)}
                    >
                        <BackIcon />
                        {translate("myDapp.edit.back")}
                    </button>
                    <div className="flex flex-col gap-2">
                        <p className={KICKER}>{translate("myDapp.edit.kicker")}</p>
                        {title}
                    </div>
                    <Callout tone="info" className="bg-surface">
                        <p>{editNote}</p>
                    </Callout>
                    {changeUnderReview}
                </div>
                <div className={CONTAINER}>
                    <DappForm
                        values={editing}
                        saveLabel={translate("myDapp.edit.save")}
                        onSave={async (fields) => {
                            try {
                                await edit({ id: dapp.id, request: fields });
                            } catch (error) {
                                await reload();
                                throw error;
                            }
                            switchView(null);
                        }}
                        onCancel={() => switchView(null)}
                        onReload={() => switchView(null)}
                    />
                </div>
            </>
        );
    }
    return (
        <div className={CONTAINER}>
            {title}
            {dapp.status === "pending" && <PendingStatus submittedAt={dapp.createdAt} />}
            {dapp.status === "rejected" && <RejectedStatus />}
            {changeUnderReview}
            {dapp.status === "approved" && dapp.auth0ClientId && <Credentials clientId={dapp.auth0ClientId} />}
            {dapp.status === "approved" && (
                <div className="flex flex-col gap-1 pt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-[-0.015em] [&_p]:text-base [&_p]:text-ink-subtle">
                    <h2>{translate("myDapp.settings")}</h2>
                    <p>{approvalRule}</p>
                </div>
            )}
            <DappSummary dapp={dapp} onEdit={dapp.status === "rejected" ? undefined : () => switchView(dapp)} />
        </div>
    );
}
