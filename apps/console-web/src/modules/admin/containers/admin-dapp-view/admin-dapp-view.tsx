import { useState } from "react";
import { Link } from "react-router";
import { Trans } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@frontend/design-system-react/button";
import { Callout } from "@frontend/design-system-react/callout";
import {
    CheckCircleIcon,
    CheckIcon,
    ChevronRightIcon,
    PencilIcon,
    TrashIcon,
    WarningIcon,
    XCircleIcon,
} from "@frontend/design-system-react/icons";
import { PageTitle } from "@frontend/design-system-react/page-title";
import { isDomainError } from "@frontend/core/domain/error";
import { ConsoleAdminErrors } from "@frontend/console-admin/domain/errors";
import {
    consoleAdminQueryKeys,
    useAdminEditDapp,
    useApproveChange,
    useApproveDapp,
    useRejectChange,
    useRejectDapp,
    useRemoveDapp,
} from "@frontend/console-admin/ui/queries";
import { useTranslate } from "@frontend/locale/react";
import { AdminDappDto } from "@shared/console";
import { diffSyncedFields, FieldValueChange } from "@shared/modules/dapp";
import { ConfirmDialog } from "../../../common/containers/confirm-dialog/confirm-dialog";
import { useErrorMessage } from "../../../common/hooks/use-error-message";
import { useHeadingFocus } from "../../../common/hooks/use-heading-focus";
import { formatDateTime, shortClientId } from "../../../common/utils/format";
import { initials } from "../../../common/utils/initials";
import { ChangeDiff } from "../../../dapp/components/change-diff/change-diff";
import { valueClassNames } from "../../../dapp/components/field-values/field-values";
import { StatusBadge } from "../../../dapp/components/status-badge/status-badge";
import { DappForm } from "../../../dapp/containers/dapp-form/dapp-form";
import { ChangeReview } from "../../components/change-review/change-review";
import { DappFacts } from "../../components/dapp-facts/dapp-facts";
import { DappRecord } from "../../components/dapp-record/dapp-record";
import { ActivityLog } from "../activity-log/activity-log";

const DIALOG_NOTE = "text-sm text-ink-subtle";

/**
 * What a stored Auth0 error means for the dApp, by its status.
 */
const AUTH0_ERROR_OUTCOMES = {
    pending: "admin.dapp.auth0Error.nothingSaved",
    approved: "admin.dapp.auth0Error.nothingSaved",
    rejected: "admin.dapp.auth0Error.rejected",
    removed: "admin.dapp.auth0Error.removed",
} as const;

type ActionKind = "approve" | "reject" | "approveChange" | "rejectChange" | "remove";

/**
 * The action whose dialog is open, on the version shown when it opened.
 */
type OpenAction = { kind: ActionKind; version: number };

type LiveSave = { changes: FieldValueChange[]; decide: (apply: boolean) => void };

export type AdminDappViewProps = {
    dapp: AdminDappDto;
    /**
     * The path of the list the dApp was opened from, with its view, search, page and sort.
     */
    listPath: string;
};

export function AdminDappView({ dapp, listPath }: AdminDappViewProps): React.JSX.Element {
    const translate = useTranslate();
    const queryClient = useQueryClient();
    const [editing, setEditing] = useState<AdminDappDto | null>(null);
    const [action, setAction] = useState<OpenAction | null>(null);
    const [changed, setChanged] = useState(false);
    const [liveSave, setLiveSave] = useState<LiveSave | null>(null);
    const { mutateAsync: edit } = useAdminEditDapp();
    const mutations = {
        approve: useApproveDapp(),
        reject: useRejectDapp(),
        approveChange: useApproveChange(),
        rejectChange: useRejectChange(),
        remove: useRemoveDapp(),
    };
    const run = action && mutations[action.kind];
    const runError = useErrorMessage(run?.error);
    const active = dapp.status !== "removed";
    const pending = dapp.status === "pending";
    const editable = active && !(dapp.status === "approved" && dapp.pendingChange !== null);
    const { heading, focusHeadingAfterRender } = useHeadingFocus(false);

    const reload = (): Promise<void> => queryClient.refetchQueries({ queryKey: consoleAdminQueryKeys.detail(dapp.id) });
    const switchEditing = (next: AdminDappDto | null): void => {
        focusHeadingAfterRender();
        setEditing(next);
    };
    const confirmLiveSave = (changes: FieldValueChange[]): Promise<boolean> => new Promise((decide) => setLiveSave({ changes, decide }));
    const decideLiveSave = (apply: boolean): void => {
        liveSave?.decide(apply);
        setLiveSave(null);
    };
    const open = (kind: ActionKind): void => {
        setChanged(false);
        setAction({ kind, version: dapp.version });
    };
    const close = (): void => {
        setAction(null);
        run?.reset();
    };
    const settle = {
        onSuccess: (): void => {
            close();
            focusHeadingAfterRender();
        },
        onError: (error: Error): void => {
            void reload();
            if (!(isDomainError(error) && error.message === ConsoleAdminErrors.DAPP_CHANGED)) return;
            close();
            focusHeadingAfterRender();
            setChanged(true);
        },
    };
    const failure = run?.isError && (
        <Callout tone="error" title={translate("admin.dapp.notDone")}>
            <p>{runError}</p>
        </Callout>
    );
    const loading = run?.isPending ?? false;
    const target = action && { id: dapp.id, expectedVersion: action.version };

    return (
        <>
            <nav
                aria-label={translate("admin.dapp.breadcrumb")}
                className="flex items-center gap-2 text-sm text-ink-subtle [&_svg]:flex-none"
            >
                <Link to={listPath} className="text-ink-subtle no-underline hover:underline">
                    {translate("admin.dapps.title")}
                </Link>
                <ChevronRightIcon size={14} />
                <span aria-current="page" className="min-w-0 font-medium text-ink wrap-anywhere">
                    {dapp.name}
                </span>
            </nav>

            <div className="flex flex-wrap items-center gap-4">
                <span
                    className="flex size-12 flex-none items-center justify-center rounded-[12px] bg-ok-bg text-[18px] font-bold text-ok-ink"
                    aria-hidden="true"
                >
                    {initials(dapp.name)}
                </span>
                <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <PageTitle ref={heading} tabIndex={-1} size="medium">
                            {dapp.name}
                        </PageTitle>
                        <span className="inline-flex flex-wrap gap-2">
                            <StatusBadge status={dapp.status} />
                            {dapp.pendingChange && <StatusBadge status="changeUnderReview" />}
                        </span>
                    </div>
                    <span className="text-sm text-ink-subtle wrap-anywhere">
                        {translate("admin.dapp.submitted", { date: formatDateTime(dapp.submittedAt) })} {dapp.ownerEmail}
                    </span>
                </div>
                {active && !editing && (
                    <div className="flex flex-wrap gap-2">
                        {pending && (
                            <>
                                <Button onClick={() => open("approve")}>
                                    <CheckIcon size={16} />
                                    {translate("admin.dapp.approve")}
                                </Button>
                                <Button variant="danger" onClick={() => open("reject")}>
                                    {translate("admin.dapp.reject")}
                                </Button>
                            </>
                        )}
                        <Button variant="secondary" disabled={!editable} onClick={() => switchEditing(dapp)}>
                            <PencilIcon size={15} />
                            {translate("admin.dapp.edit")}
                        </Button>
                    </div>
                )}
            </div>
            {active && !editing && !editable && <p className="-mt-3 text-sm text-ink-subtle">{translate("admin.dapp.editBlocked")}</p>}

            {changed && (
                <div role="alert">
                    <Callout tone="warning" title={translate("admin.dapp.changed.title")}>
                        <p>{translate("admin.dapp.changed.description")}</p>
                    </Callout>
                </div>
            )}
            {dapp.auth0Error && (
                <Callout tone="error" title={translate("admin.dapp.auth0Error.title")}>
                    <p>
                        <code className={valueClassNames.code}>{dapp.auth0Error}</code>
                    </p>
                    <p>{translate(AUTH0_ERROR_OUTCOMES[dapp.status])}</p>
                </Callout>
            )}
            {dapp.status === "removed" && dapp.removedAt && (
                <Callout tone="info" title={translate("admin.dapp.removedTitle")}>
                    <p>{formatDateTime(dapp.removedAt)}.</p>
                </Callout>
            )}

            <div className="flex flex-wrap items-start gap-6">
                <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
                    {dapp.status === "approved" && dapp.pendingChange && (
                        <ChangeReview
                            dapp={dapp}
                            change={dapp.pendingChange}
                            onApprove={() => open("approveChange")}
                            onReject={() => open("rejectChange")}
                        />
                    )}

                    {editing ? (
                        <DappForm
                            key={editing.version}
                            mode="admin"
                            values={editing}
                            saveLabel={translate("myDapp.edit.save")}
                            onSave={async (fields) => {
                                const changes = editing.status === "approved" ? diffSyncedFields(editing, fields) : [];
                                if (changes.length > 0 && !(await confirmLiveSave(changes))) return;
                                try {
                                    await edit({ id: dapp.id, request: { ...fields, expectedVersion: editing.version } });
                                } catch (error) {
                                    await reload();
                                    throw error;
                                }
                                setChanged(false);
                                switchEditing(null);
                            }}
                            onCancel={() => switchEditing(null)}
                            onReload={() => switchEditing(editable ? dapp : null)}
                        />
                    ) : (
                        <DappFacts dapp={dapp} />
                    )}

                    <ActivityLog id={dapp.id} />
                </div>

                <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-6">
                    <DappRecord dapp={dapp} />
                    {active && !editing && (
                        <section className="flex flex-col gap-2.5 rounded-lg border border-danger-border p-5">
                            <h2 className="text-base font-semibold tracking-[normal] text-danger-ink">
                                {translate("admin.dapp.dangerZone.title")}
                            </h2>
                            <p className="text-sm text-ink-subtle">{translate("admin.dapp.dangerZone.description")}</p>
                            <Button variant="danger" size="small" className="self-start" onClick={() => open("remove")}>
                                {translate("admin.dapp.dangerZone.action")}
                            </Button>
                        </section>
                    )}
                </aside>
            </div>

            <ConfirmDialog
                open={liveSave !== null}
                onClose={() => decideLiveSave(false)}
                title={translate("admin.dapp.liveSave.title")}
                description={translate("admin.dapp.liveSave.description", { name: dapp.name })}
                icon={<WarningIcon />}
                tone="warn"
                confirmLabel={translate("admin.dapp.liveSave.confirm")}
                cancelLabel={translate("admin.dapp.liveSave.cancel")}
                onConfirm={() => decideLiveSave(true)}
            >
                {liveSave && (
                    <ChangeDiff rows={liveSave.changes} beforeLabel={translate("dapp.diff.live")} afterLabel={translate("dapp.diff.new")} />
                )}
            </ConfirmDialog>
            <ConfirmDialog
                open={action?.kind === "approve"}
                onClose={close}
                title={translate("admin.dapp.approveDialog.title", { name: dapp.name })}
                description={translate("admin.dapp.approveDialog.description")}
                icon={<CheckCircleIcon size={20} />}
                confirmLabel={translate("admin.dapp.approveDialog.confirm")}
                loading={loading}
                onConfirm={() => target && mutations.approve.mutate(target, settle)}
            >
                <dl className="m-0 grid grid-cols-[150px_minmax(0,1fr)] gap-x-4 gap-y-2 rounded-[12px] border border-border bg-canvas px-4 py-[14px] text-sm [&_dd]:m-0 [&_dd]:min-w-0 [&_dd]:wrap-anywhere [&_dt]:font-mono [&_dt]:text-2xs [&_dt]:leading-[19.5px] [&_dt]:font-medium [&_dt]:tracking-kicker [&_dt]:text-ink-subtle [&_dt]:uppercase">
                    <dt>{translate("admin.dapp.approveDialog.application")}</dt>
                    <dd className="font-medium">{dapp.name}</dd>
                    <dt>{translate("dapp.fields.callbackUrls")}</dt>
                    <dd>{dapp.callbackUrls.length}</dd>
                    <dt>{translate("dapp.fields.webOrigins")}</dt>
                    <dd>{dapp.webOrigins.length}</dd>
                    <dt>{translate("dapp.fields.logoutUrls")}</dt>
                    <dd>{dapp.logoutUrls.length}</dd>
                    <dt>{translate("dapp.fields.mauBracket")}</dt>
                    <dd>{translate(`dapp.mau.${dapp.mauBracket}`)}</dd>
                </dl>
                <p className={DIALOG_NOTE}>{translate("admin.dapp.approveDialog.note")}</p>
                {failure}
            </ConfirmDialog>
            <ConfirmDialog
                open={action?.kind === "reject"}
                onClose={close}
                title={translate("admin.dapp.rejectDialog.title", { name: dapp.name })}
                description={translate("admin.dapp.rejectDialog.description")}
                icon={<XCircleIcon size={20} />}
                confirmLabel={translate("admin.dapp.rejectDialog.confirm")}
                destructive
                loading={loading}
                onConfirm={() => target && mutations.reject.mutate(target, settle)}
            >
                {failure}
            </ConfirmDialog>
            <ConfirmDialog
                open={action?.kind === "approveChange"}
                onClose={close}
                title={translate("admin.dapp.approveChangeDialog.title")}
                description={translate("admin.dapp.approveChangeDialog.description")}
                icon={<CheckCircleIcon size={20} />}
                confirmLabel={translate("admin.dapp.approveChangeDialog.confirm")}
                loading={loading}
                onConfirm={() => target && mutations.approveChange.mutate(target, settle)}
            >
                {failure}
            </ConfirmDialog>
            <ConfirmDialog
                open={action?.kind === "rejectChange"}
                onClose={close}
                title={translate("admin.dapp.rejectChangeDialog.title")}
                description={translate("admin.dapp.rejectChangeDialog.description")}
                icon={<XCircleIcon size={20} />}
                confirmLabel={translate("admin.dapp.rejectChangeDialog.confirm")}
                destructive
                loading={loading}
                onConfirm={() => target && mutations.rejectChange.mutate(target, settle)}
            >
                {failure}
            </ConfirmDialog>
            <ConfirmDialog
                open={action?.kind === "remove"}
                onClose={close}
                title={translate("admin.dapp.removeDialog.title", { name: dapp.name })}
                description={
                    <>
                        {dapp.auth0ClientId ? (
                            <Trans
                                i18nKey="admin.dapp.removeDialog.live"
                                values={{ clientId: shortClientId(dapp.auth0ClientId) }}
                                components={{ code: <code /> }}
                            />
                        ) : (
                            translate("admin.dapp.removeDialog.noClient")
                        )}{" "}
                        {translate("myDapp.remove.final")}
                    </>
                }
                icon={<TrashIcon size={20} />}
                confirmLabel={translate("dappForm.remove")}
                destructive
                confirmText={dapp.name}
                loading={loading}
                onConfirm={() => target && mutations.remove.mutate(target, settle)}
            >
                <p className={DIALOG_NOTE}>{translate("admin.dapp.removeDialog.note")}</p>
                {failure}
            </ConfirmDialog>
        </>
    );
}
