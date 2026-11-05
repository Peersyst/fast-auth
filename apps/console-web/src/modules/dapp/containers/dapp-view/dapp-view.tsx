import { ReactNode, useState } from "react";
import { Trans } from "react-i18next";
import { Callout } from "@frontend/design-system-react/callout";
import { BackIcon } from "@frontend/design-system-react/icons";
import { PageTitle } from "@frontend/design-system-react/page-title";
import { isDomainError } from "@frontend/core/domain/error";
import { ConsoleDappErrors } from "@frontend/console-dapp/domain/errors";
import { useEditDapp, useRemoveDapp, useWithdrawChange } from "@frontend/console-dapp/ui/queries";
import { useTranslate } from "@frontend/locale/react";
import { OwnerDappDto } from "@shared/console";
import { useErrorMessage } from "../../../common/hooks/use-error-message";
import { useHeadingFocus } from "../../../common/hooks/use-heading-focus";
import { shortClientId } from "../../../common/utils/format";
import { ConfirmDialog } from "../../../common/containers/confirm-dialog/confirm-dialog";
import { useSessionUser } from "../../../session/hooks/use-session-user";
import { ChangeUnderReview } from "../../components/change-under-review/change-under-review";
import { DappSummary } from "../../components/dapp-summary/dapp-summary";
import { PendingStatus } from "../../components/pending-status/pending-status";
import { RejectedStatus } from "../../components/rejected-status/rejected-status";
import { StatusBadge } from "../../components/status-badge/status-badge";
import { Credentials } from "../credentials/credentials";
import { DappForm } from "../dapp-form/dapp-form";

const CONTAINER = "mx-auto my-0 flex w-full max-w-[848px] flex-col gap-6";
const KICKER = "font-mono text-xs font-medium tracking-kicker text-ink-subtle uppercase";

export type LiveDapp = OwnerDappDto & { status: Exclude<OwnerDappDto["status"], "removed"> };

type OpenDialog = { kind: "remove" | "withdraw"; version: number };

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
    const { email } = useSessionUser();
    const [editing, setEditing] = useState<OwnerDappDto | null>(null);
    const [dialog, setDialog] = useState<OpenDialog | null>(null);
    const [changed, setChanged] = useState(false);
    const { mutateAsync: edit } = useEditDapp();
    const withdraw = useWithdrawChange();
    const remove = useRemoveDapp();
    const withdrawError = useErrorMessage(withdraw.error);
    const removeError = useErrorMessage(remove.error);
    const { heading, focusHeadingAfterRender } = useHeadingFocus(focusTitle);
    const approvalRule = translate("myDapp.approvalRule");
    const copy = {
        pending: { note: translate("myDapp.edit.pendingNote"), saveLabel: translate("myDapp.edit.save"), saveHint: undefined },
        rejected: {
            note: translate("myDapp.edit.rejectedNote"),
            saveLabel: translate("myDapp.edit.resubmit"),
            saveHint: translate("myDapp.edit.resubmitHint"),
        },
        approved: {
            note: translate("myDapp.edit.approvedNote", { rule: approvalRule }),
            saveLabel: translate("myDapp.edit.save"),
            saveHint: undefined,
        },
    }[dapp.status];

    const switchView = (next: OwnerDappDto | null): void => {
        focusHeadingAfterRender();
        setEditing(next);
    };
    const openDialog = (kind: OpenDialog["kind"]): void => {
        setChanged(false);
        setDialog({ kind, version: dapp.version });
    };
    const closeDialog = (): void => {
        setDialog(null);
        withdraw.reset();
        remove.reset();
    };
    const settle = {
        onSuccess: (): void => {
            closeDialog();
            switchView(null);
        },
        onError: (error: Error): void => {
            void reload();
            if (!(isDomainError(error) && error.message === ConsoleDappErrors.DAPP_CHANGED)) return;
            closeDialog();
            switchView(null);
            setChanged(true);
        },
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
    const changedNotice = changed && (
        <div role="alert">
            <Callout tone="warning" title={translate("myDapp.changed.title")}>
                <p>{translate("myDapp.changed.description")}</p>
            </Callout>
        </div>
    );
    const changeUnderReview = dapp.pendingChange && (
        <ChangeUnderReview live={dapp} change={dapp.pendingChange} onWithdraw={() => openDialog("withdraw")} />
    );

    let content: ReactNode;
    if (editing) {
        content = (
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
                        <p>{copy.note}</p>
                    </Callout>
                    {changeUnderReview}
                </div>
                <div className={CONTAINER}>
                    <DappForm
                        key={editing.version}
                        mode="owner"
                        values={editing}
                        saveLabel={copy.saveLabel}
                        saveHint={copy.saveHint}
                        onSave={async (fields) => {
                            try {
                                await edit({ id: dapp.id, request: { ...fields, expectedVersion: editing.version } });
                            } catch (error) {
                                await reload();
                                throw error;
                            }
                            switchView(null);
                        }}
                        onCancel={() => switchView(null)}
                        onReload={() => switchView(dapp)}
                        onRemove={() => openDialog("remove")}
                    />
                </div>
            </>
        );
    } else {
        content = (
            <div className={CONTAINER}>
                {title}
                {changedNotice}
                {dapp.status === "pending" && <PendingStatus submittedAt={dapp.submittedAt} email={email} />}
                {dapp.status === "rejected" && <RejectedStatus reason={dapp.rejectionReason} />}
                {changeUnderReview}
                {dapp.status === "approved" && dapp.auth0ClientId && <Credentials clientId={dapp.auth0ClientId} />}
                {dapp.status === "approved" && (
                    <div className="flex flex-col gap-1 pt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-[-0.015em] [&_p]:text-base [&_p]:text-ink-subtle">
                        <h2>{translate("myDapp.settings")}</h2>
                        <p>{approvalRule}</p>
                    </div>
                )}
                <DappSummary
                    dapp={dapp}
                    onEdit={() => {
                        setChanged(false);
                        switchView(dapp);
                    }}
                />
            </div>
        );
    }

    return (
        <>
            {content}

            <ConfirmDialog
                open={dialog?.kind === "withdraw"}
                onClose={closeDialog}
                title={translate("myDapp.withdraw.title")}
                confirmLabel={translate("myDapp.withdraw.confirm")}
                destructive
                loading={withdraw.isPending}
                description={translate("myDapp.withdraw.description")}
                onConfirm={() => dialog && withdraw.mutate({ dapp, expectedVersion: dialog.version }, settle)}
            >
                {withdraw.isError && (
                    <Callout tone="error" title={translate("myDapp.withdraw.failed")}>
                        <p>{withdrawError}</p>
                    </Callout>
                )}
            </ConfirmDialog>
            <ConfirmDialog
                open={dialog?.kind === "remove"}
                onClose={closeDialog}
                title={translate("myDapp.remove.title", { name: dapp.name })}
                confirmLabel={translate("dappForm.remove")}
                destructive
                confirmText={dapp.name}
                loading={remove.isPending}
                description={
                    <>
                        {dapp.status === "approved" && dapp.auth0ClientId ? (
                            <Trans
                                i18nKey="myDapp.remove.live"
                                values={{ clientId: shortClientId(dapp.auth0ClientId) }}
                                components={{ code: <code /> }}
                            />
                        ) : (
                            translate(dapp.status === "pending" ? "myDapp.remove.pending" : "myDapp.remove.other")
                        )}{" "}
                        {translate("myDapp.remove.final")}
                    </>
                }
                onConfirm={() => dialog && remove.mutate({ id: dapp.id, expectedVersion: dialog.version }, settle)}
            >
                {remove.isError && (
                    <Callout tone="error" title={translate("myDapp.remove.failed")}>
                        <p>{removeError}</p>
                    </Callout>
                )}
            </ConfirmDialog>
        </>
    );
}
